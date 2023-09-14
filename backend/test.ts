import { performance } from "perf_hooks";
import supertest from "supertest";
import { buildApp } from "./app";
import { expect } from "chai";

const app = supertest(buildApp());

async function basicLatencyTest() {
    await app.post("/reset").expect(204);
    const start = performance.now();
    await app.post("/charge").expect(200);
    await app.post("/charge").expect(200);
    await app.post("/charge").expect(200);
    await app.post("/charge").expect(200);
    await app.post("/charge").expect(200);
    console.log(`Latency: ${performance.now() - start} ms`);
}

async function concurrencyTest() {
    await app.post("/reset").send({ account: "test" }).expect(204);

    const responses = await Promise.all([
        app.post("/charge").send({ account: "test", charges: 10 }).expect(200),
        app.post("/charge").send({ account: "test", charges: 20 }).expect(200),
        app.post("/charge").send({ account: "test", charges: 30 }).expect(200),
    ]);

    responses.forEach(response => {
        expect(response.body.isAuthorized).to.be.true;
    });
    expect(responses[2].body.remainingBalance).to.equal(40);

    await app.post("/reset").send({ account: "test" }).expect(204);

    const failResponses = await Promise.all([
        app.post("/charge").send({ account: "test", charges: 30 }).expect(200),
        app.post("/charge").send({ account: "test", charges: 40 }).expect(200),
        app.post("/charge").send({ account: "test", charges: 50 }).expect(200),
    ]);

    // Asserting the responses
    expect(failResponses[0].body.isAuthorized).to.be.true;
    expect(failResponses[1].body.isAuthorized).to.be.true;
    expect(failResponses[2].body.isAuthorized).to.be.false;
    expect(failResponses[2].body.remainingBalance).to.equal(30);
}

async function runTests() {
    await basicLatencyTest();
    await concurrencyTest();
}

runTests().catch(console.error);