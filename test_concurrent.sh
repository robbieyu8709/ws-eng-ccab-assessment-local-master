#!/bin/bash

# curl -X POST http://localhost:3000/reset -H "Content-Type: application/json" -d '{ "account": "test" }'

# sleep 2

curl -X POST http://localhost:3000/charge -H "Content-Type: application/json" -d '{ "account": "test", "charges": 50 }' &
curl -X POST http://localhost:3000/charge -H "Content-Type: application/json" -d '{ "account": "test", "charges": 60 }' &
# curl -X POST http://localhost:3000/charge -H "Content-Type: application/json" -d '{ "account": "test", "charges": 25 }' &
# curl -X POST http://localhost:3000/charge -H "Content-Type: application/json" -d '{ "account": "test", "charges": 30 }' &
