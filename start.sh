#!/bin/bash
echo "Starting PostgreSQL..."
brew services start postgresql@15

echo "Starting StockPilot backend..."
cd ~/Desktop/inventory-system/backend && source venv/bin/activate && python3 -m uvicorn app.main:app --reload &

echo "Starting StockPilot frontend..."
cd ~/Desktop/inventory-system/frontend && npm start