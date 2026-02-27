# AI Strategy-to-Code Trading Backtester

An NLP-powered trading engine that converts plain-English trading strategies into executable Python code, runs historical backtests using Alpaca market data, and generates structured performance analytics.

---

## Overview

This project explores how Natural Language Processing (NLP) can reduce the friction between trading strategy ideation and quantitative validation.

Instead of manually coding trading logic, users describe their strategy in plain English.  
The system parses the strategy, converts it into structured rules, generates executable code, and runs historical backtests automatically.

Goal: Reduce iteration time between idea → validation → refinement.

---

## Core Features

- Plain-English strategy input
- NLP-based strategy parsing
- Automatic Python code generation
- Historical data integration via Alpaca Market Data API
- Backtesting simulation engine
- Performance metric generation
- Optional Alpaca paper trading deployment
- Modular architecture for future real-time streaming

---

## System Architecture

### 1. NLP Parsing Layer

Accepts natural-language strategy descriptions and extracts:

- Indicators (SMA, EMA, RSI, MACD, etc.)
- Entry conditions
- Exit conditions
- Timeframes
- Risk rules

Example Input:

Buy when 50-day SMA crosses above 200-day SMA and RSI < 30.  
Sell when RSI > 70.

Structured Representation (internal format):

```python
{
    "entry_conditions": [
        "SMA_50 crosses_above SMA_200",
        "RSI < 30"
    ],
    "exit_conditions": [
        "RSI > 70"
    ]
}
```

---

### 2. Strategy Code Generation

- Converts structured rules into executable Python logic
- Dynamically builds:
  - Indicator calculations
  - Signal generation logic
  - Entry/exit triggers
  - Position management rules

Generated strategy is injected into the backtesting engine.

---

### 3. Market Data Layer (Alpaca)

Historical OHLCV data is fetched using the Alpaca Market Data API.

Supports:
- Configurable date ranges
- Multiple timeframes
- Symbol selection

Preprocessing includes:
- Timestamp alignment
- Indicator computation
- Data validation

---

### 4. Backtesting Engine

Handles:

- Capital initialization
- Position sizing
- Trade execution simulation
- Portfolio value tracking
- Trade logging
- Risk measurement

Configurable parameters:
- Initial capital
- Position size
- Commission assumptions
- Slippage modeling (planned)

---

### 5. Performance Metrics

After simulation, the engine computes:

- Total Return
- Equity Curve
- Maximum Drawdown
- Win Rate
- Sharpe Ratio
- Trade distribution statistics

Example Output:

```python
{
    "Total Return": "18.4%",
    "Max Drawdown": "7.2%",
    "Sharpe Ratio": 1.42,
    "Win Rate": "58%"
}
```

---

## Tech Stack

- Python
- NLP-based rule extraction
- Alpaca Market Data API
- Alpaca Paper Trading API
- Pandas
- NumPy
- Data visualization libraries

---

## End-to-End Workflow

1. User inputs strategy in natural language
2. NLP parser extracts structured rules
3. Strategy code is generated dynamically
4. Alpaca historical data is retrieved
5. Backtest simulation executes
6. Performance metrics are calculated
7. Strategy optionally deployed to paper trading

---

## Future Improvements

- Real-time WebSocket market data streaming
- Parameter optimization module
- Multi-asset portfolio testing
- Advanced risk management rules
- Institutional-grade data integration

---

## Disclaimer

This project is for educational and research purposes only.  
It does not provide financial advice and does not guarantee profitability.

---

## Status

Prototype / Experimental  
Built to explore NLP-driven automation in trading strategy validation.

## Output

<img width="1917" height="952" alt="image" src="https://github.com/user-attachments/assets/51f22b00-7c37-4fb2-8719-51d4f7c39250" />

