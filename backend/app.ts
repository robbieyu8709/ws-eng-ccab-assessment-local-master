import express from "express";
import { createClient } from "redis";
import { json } from "body-parser";
import { Mutex } from 'async-mutex';


const DEFAULT_BALANCE = 100;
const mutex = new Mutex();


interface ChargeResult {
    isAuthorized: boolean;
    remainingBalance: number;
    charges: number;
}

async function connect(): Promise<ReturnType<typeof createClient>> {
    const url = `redis://${process.env.REDIS_HOST ?? "localhost"}:${process.env.REDIS_PORT ?? "6379"}`;
    console.log(`Using redis URL ${url}`);
    const client = createClient({ url });
    await client.connect();
    return client;
}

async function reset(account: string): Promise<void> {
    const client = await connect();
    try {
        await client.set(`${account}/balance`, DEFAULT_BALANCE);
    } finally {
        await client.disconnect();
    }
}

async function charge(account: string, charges: number): Promise<ChargeResult> {
    const release = await mutex.acquire();

    try {
        const client = await connect();
        try {
            const balanceStr = await client.get(`${account}/balance`);
            const balance = balanceStr ? parseInt(balanceStr) : 0;
            
            console.log(`Initial balance for account ${account}: ${balance}`);
            console.log(`Charge amount for account ${account}: ${charges}`);
            
            if (balance >= charges) {
                await client.set(`${account}/balance`, balance - charges);
                const remainingBalanceStr = await client.get(`${account}/balance`);
                const remainingBalance = remainingBalanceStr ? parseInt(remainingBalanceStr) : 0;
                
                console.log(`Final balance for account ${account}: ${remainingBalance}`);
                
                return { isAuthorized: true, remainingBalance, charges };
            } else {
                return { isAuthorized: false, remainingBalance: balance, charges: 0 };
            }
        } finally {
            await client.disconnect();
        }
    } finally {
        release();
    }
}

async function getBalance(account: string): Promise<number> {
    const client = await connect();
    try {
        const balance = parseInt((await client.get(`${account}/balance`)) ?? "0");
        return balance;
    } finally {
        await client.disconnect();
    }
}

export function buildApp(): express.Application {
    const app = express();
    app.use(json());
    app.post("/reset", async (req, res) => {
        try {
            const account = req.body.account ?? "account";
            await reset(account);
            console.log(`Successfully reset account ${account}`);
            res.sendStatus(204);
        } catch (e) {
            console.error("Error while resetting account", e);
            res.status(500).json({ error: String(e) });
        }
    });
    app.post("/charge", async (req, res) => {
        try {
            const account = req.body.account ?? "account";
            const result = await charge(account, req.body.charges ?? 10);
            console.log(`Successfully charged account ${account}`);
            res.status(200).json(result);
        } catch (e) {
            console.error("Error while charging account", e);
            res.status(500).json({ error: String(e) });
        }
    });
    app.get('/balance/:account', async (req, res) => {
        const { account } = req.params;
        const balance = await getBalance(account);
        res.send({ balance });
    });
    return app;
}
