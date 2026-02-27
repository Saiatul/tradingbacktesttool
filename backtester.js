/**
 * QuantTerminal Backtesting Engine v2
 * High-fidelity execution of generated Trading Bots.
 */

const Backtester = {
    run(data, strategyInfo) {
        const initialCapital = 100000;
        let balance = initialCapital;
        let position = null; // { qty, entryPrice, entryDate, sl, tp, entryIdx }
        const trades = [];
        const equityCurve = [];

        // 1. Calculate all necessary indicators first
        const indicators = this.calcIndicators(data, strategyInfo.indicators);

        // 2. Prepare the Bot Function
        let botFunc;
        try {
            const script = `(${strategyInfo.executionFunc})`;
            botFunc = eval(script);
        } catch (e) {
            console.error("Bot Compilation Error:", e);
            throw new Error("Strategy Bot Error: " + e.message);
        }

        if (typeof botFunc !== 'function') {
            throw new Error("Generated bot is not a valid executable function.");
        }

        // 3. Execution Loop
        for (let i = 1; i < data.length; i++) {
            const currentCandle = data[i];
            const ctx = {
                candles: data,
                indicators: indicators,
                portfolio: { balance, position },
                currentIdx: i
            };

            // A. Risk Management Check
            if (position) {
                const currentPrice = currentCandle.close;
                const pnlPercent = ((currentPrice - position.entryPrice) / position.entryPrice) * 100;

                let exitReason = null;
                if (pnlPercent <= -position.sl) exitReason = 'STOP_LOSS';
                if (pnlPercent >= position.tp) exitReason = 'TAKE_PROFIT';

                if (exitReason) {
                    const exitValue = position.qty * currentPrice;
                    const tradeReturn = (currentPrice - position.entryPrice) / position.entryPrice;
                    balance += exitValue;
                    trades.push({
                        ...position,
                        exitPrice: currentPrice,
                        exitDate: currentCandle.date,
                        exitIdx: i,
                        pnl: exitValue - (position.qty * position.entryPrice),
                        return: tradeReturn,
                        reason: exitReason
                    });
                    position = null;
                }
            }

            // B. Execute Bot Logic
            try {
                const decision = botFunc(ctx);
                const { signal, qty, sl, tp } = decision;

                if (signal === 'BUY' && !position && balance > 0) {
                    // Use professional risk-adjusted qty if provided
                    const entryQty = qty || (balance * 0.98 / currentCandle.close);
                    const cost = entryQty * currentCandle.close;

                    if (cost <= balance) {
                        position = {
                            qty: entryQty,
                            entryPrice: currentCandle.close,
                            entryDate: currentCandle.date,
                            entryIdx: i,
                            sl: sl || 2.0,
                            tp: tp || 6.0
                        };
                        balance -= cost;
                    }
                } else if (signal === 'SELL' && position) {
                    const exitValue = position.qty * currentCandle.close;
                    const tradeReturn = (currentCandle.close - position.entryPrice) / position.entryPrice;
                    balance += exitValue;
                    trades.push({
                        ...position,
                        exitPrice: currentCandle.close,
                        exitDate: currentCandle.date,
                        exitIdx: i,
                        pnl: exitValue - (position.qty * position.entryPrice),
                        return: tradeReturn,
                        reason: 'SIGNAL'
                    });
                    position = null;
                }
            } catch (e) {
                console.warn("Tick Execution Error at " + i + ":", e);
            }

            // C. Record Equity Point
            const currentEquity = balance + (position ? position.qty * currentCandle.close : 0);
            equityCurve.push({
                date: currentCandle.date,
                value: currentEquity,
                price: currentCandle.close
            });
        }

        // 4. Benchmark Calculation (Buy & Hold)
        const benchmarkCurve = [];
        const firstPrice = data[0].close;
        const benchQty = initialCapital / firstPrice;
        data.forEach(d => {
            benchmarkCurve.push({
                date: d.date,
                value: benchQty * d.close
            });
        });

        // 5. Force Close final position
        if (position) {
            const finalP = data[data.length - 1];
            const exitValue = position.qty * finalP.close;
            const tradeReturn = (finalP.close - position.entryPrice) / position.entryPrice;
            balance += exitValue;
            trades.push({
                ...position,
                exitPrice: finalP.close,
                exitDate: finalP.date,
                exitIdx: data.length - 1,
                pnl: exitValue - (position.qty * position.entryPrice),
                return: tradeReturn,
                reason: 'FINAL_CLOSE'
            });
        }

        return {
            trades,
            equityCurve,
            benchmarkCurve,
            indicators,
            finalValue: balance,
            initialCapital
        };
    },

    calcIndicators(data, req) {
        const results = { dates: data.map(d => d.close) };
        const prices = data.map(d => d.close);
        const highs = data.map(d => d.high);
        const lows = data.map(d => d.low);
        const volumes = data.map(d => d.volume);

        if (req.ema) {
            req.ema.forEach(p => {
                results[`EMA_${p}`] = Indicators.EMA(prices, p);
            });
        }
        if (req.rsi) {
            req.rsi.forEach(p => {
                results[`RSI_${p}`] = Indicators.RSI(prices, p);
            });
        }
        if (req.sma) {
            req.sma.forEach(p => {
                results[`SMA_${p}`] = Indicators.SMA(prices, p);
            });
        }
        if (req.vwap) {
            results[`VWAP`] = Indicators.vwap(data);
        }
        if (req.atr) {
            results[`ATR`] = Indicators.atr(data, 14);
        }
        if (req.macd) {
            results[`MACD`] = Indicators.macd(prices);
        }
        if (req.stoch) {
            results[`Stoch`] = Indicators.stoch(data);
        }
        if (req.supertrend) {
            results[`Supertrend`] = Indicators.supertrend(data);
        }
        if (req.donchian) {
            req.donchian.forEach(p => {
                results[`Donchian_${p}`] = Indicators.donchian(highs, lows, p);
            });
        }
        if (req.volumeAvg) {
            req.volumeAvg.forEach(p => {
                results[`VolumeAvg_${p}`] = Indicators.SMA(volumes, p);
            });
        }
        if (req.bb) {
            const [p, sd] = req.bb;
            results[`BB_${p}`] = Indicators.bollinger(prices, p, sd);
        }

        return results;
    }
};
