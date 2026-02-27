/**
 * Technical Indicators for Trading Backtester
 */

const Indicators = {
    /**
     * Simple Moving Average
     */
    sma(data, period) {
        let results = new Array(data.length).fill(null);
        for (let i = period - 1; i < data.length; i++) {
            const window = data.slice(i - period + 1, i + 1);
            const sum = window.reduce((a, b) => a + b, 0);
            results[i] = sum / period;
        }
        return results;
    },
    SMA(data, period) { return this.sma(data, period); },

    /**
     * Exponential Moving Average
     */
    ema(data, period) {
        let results = new Array(data.length).fill(null);
        const k = 2 / (period + 1);
        let emaVal = data[0];
        results[0] = emaVal;

        for (let i = 1; i < data.length; i++) {
            emaVal = (data[i] * k) + (emaVal * (1 - k));
            results[i] = emaVal;
        }
        return results;
    },
    EMA(data, period) { return this.ema(data, period); },

    /**
     * Relative Strength Index (RSI)
     */
    rsi(data, period) {
        let results = new Array(data.length).fill(null);
        if (data.length <= period) return results;

        let gains = 0;
        let losses = 0;

        for (let i = 1; i <= period; i++) {
            const diff = data[i] - data[i - 1];
            if (diff >= 0) gains += diff;
            else losses -= diff;
        }

        let avgGain = gains / period;
        let avgLoss = losses / period;

        for (let i = period + 1; i < data.length; i++) {
            const diff = data[i] - data[i - 1];
            let currentGain = diff >= 0 ? diff : 0;
            let currentLoss = diff < 0 ? -diff : 0;

            avgGain = (avgGain * (period - 1) + currentGain) / period;
            avgLoss = (avgLoss * (period - 1) + currentLoss) / period;

            const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
            results[i] = 100 - (100 / (1 + rs));
        }
        return results;
    },
    RSI(data, period) { return this.rsi(data, period); },

    /**
     * Moving Average Convergence Divergence (MACD)
     */
    macd(data, fast = 12, slow = 26, signal = 9) {
        const emaFast = this.ema(data, fast);
        const emaSlow = this.ema(data, slow);

        let macdLine = new Array(data.length).fill(null);
        for (let i = 0; i < data.length; i++) {
            if (emaFast[i] !== null && emaSlow[i] !== null) {
                macdLine[i] = emaFast[i] - emaSlow[i];
            }
        }

        const validMacd = macdLine.filter(x => x !== null);
        const signalLineRaw = this.ema(validMacd, signal);

        let signalLine = new Array(data.length).fill(null);
        let offset = macdLine.indexOf(validMacd[0]);
        for (let i = 0; i < signalLineRaw.length; i++) {
            if (i + offset < data.length) signalLine[i + offset] = signalLineRaw[i];
        }

        let histogram = new Array(data.length).fill(null);
        for (let i = 0; i < data.length; i++) {
            if (macdLine[i] !== null && signalLine[i] !== null) {
                histogram[i] = macdLine[i] - signalLine[i];
            }
        }

        return { macdLine, signalLine, histogram };
    },
    MACD(data, f, s, sig) { return this.macd(data, f, s, sig); },

    /**
     * Bollinger Bands
     */
    bollinger(data, period = 20, stdDev = 2) {
        const middle = this.sma(data, period);
        let upper = new Array(data.length).fill(null);
        let lower = new Array(data.length).fill(null);

        for (let i = period - 1; i < data.length; i++) {
            const window = data.slice(i - period + 1, i + 1);
            const mean = middle[i];
            const variance = window.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period;
            const sd = Math.sqrt(variance);
            upper[i] = mean + (stdDev * sd);
            lower[i] = mean - (stdDev * sd);
        }

        return { upper, middle, lower };
    },

    /**
     * Donchian Channels (Highest High / Lowest Low of N periods)
     */
    donchian(highs, lows, period = 20) {
        let upper = new Array(highs.length).fill(null);
        let lower = new Array(lows.length).fill(null);
        for (let i = period; i < highs.length; i++) {
            upper[i] = Math.max(...highs.slice(i - period, i));
            lower[i] = Math.min(...lows.slice(i - period, i));
        }
        return { upper, lower };
    },

    /**
     * Stochastic Oscillator
     */
    stoch(data, kPeriod = 14, dPeriod = 3) {
        let kValues = new Array(data.length).fill(null);
        let dValues = new Array(data.length).fill(null);

        for (let i = kPeriod - 1; i < data.length; i++) {
            const window = data.slice(i - kPeriod + 1, i + 1);
            const high = Math.max(...window.map(d => d.high));
            const low = Math.min(...window.map(d => d.low));
            const close = data[i].close;
            kValues[i] = ((close - low) / (high - low)) * 100;
        }

        // D line is SMA of K line
        const validK = kValues.map(v => v === null ? 0 : v);
        const smaD = this.sma(validK, dPeriod);
        for (let i = 0; i < data.length; i++) {
            if (kValues[i] !== null) dValues[i] = smaD[i];
        }

        return { k: kValues, d: dValues };
    },

    /**
     * Average True Range (ATR)
     */
    atr(data, period = 14) {
        let results = new Array(data.length).fill(null);
        if (data.length <= period) return results;

        const trueRanges = data.map((d, i) => {
            if (i === 0) return d.high - d.low;
            const hl = d.high - d.low;
            const hpc = Math.abs(d.high - data[i - 1].close);
            const lpc = Math.abs(d.low - data[i - 1].close);
            return Math.max(hl, hpc, lpc);
        });

        const initialAtr = trueRanges.slice(1, period + 1).reduce((a, b) => a + b, 0) / period;
        results[period] = initialAtr;

        for (let i = period + 1; i < data.length; i++) {
            results[i] = (results[i - 1] * (period - 1) + trueRanges[i]) / period;
        }
        return results;
    },

    /**
     * Supertrend (Simplified)
     */
    supertrend(data, period = 10, multiplier = 3) {
        const atr = this.atr(data, period);
        let trend = new Array(data.length).fill(1); // 1 = Buy, -1 = Sell
        let levels = new Array(data.length).fill(null);

        for (let i = period; i < data.length; i++) {
            const hl2 = (data[i].high + data[i].low) / 2;
            const basicUpper = hl2 + (multiplier * atr[i]);
            const basicLower = hl2 - (multiplier * atr[i]);

            // Trend detection logic
            if (data[i].close > levels[i - 1]) trend[i] = 1;
            else if (data[i].close < levels[i - 1]) trend[i] = -1;
            else trend[i] = trend[i - 1];

            levels[i] = trend[i] === 1 ? basicLower : basicUpper;
        }
        return { trend, levels };
    },

    /**
     * Volume Weighted Average Price (VWAP)
     */
    vwap(data) {
        let tpvSum = 0;
        let volSum = 0;
        return data.map(d => {
            const tp = (d.high + d.low + d.close) / 3;
            tpvSum += tp * d.volume;
            volSum += d.volume;
            return volSum === 0 ? tp : tpvSum / volSum;
        });
    }
};
