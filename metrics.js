/**
 * QuantTerminal Metrics Engine
 * Precise calculation of trading performance.
 */

const Metrics = {
    calculate(trades, equityCurve) {
        if (equityCurve.length === 0) return this.nullMetrics();
        const initialCapital = equityCurve[0].value;
        const finalValue = equityCurve[equityCurve.length - 1].value;

        // 1. Win Rate
        const wins = trades.filter(t => t.pnl > 0).length;
        const winRate = trades.length > 0 ? (wins / trades.length) * 100 : 0;

        // 2. Profit Factor
        const grossProfit = trades.filter(t => t.pnl > 0).reduce((a, b) => a + b.pnl, 0);
        const grossLoss = Math.abs(trades.filter(t => t.pnl < 0).reduce((a, b) => a + b.pnl, 0));
        const profitFactor = grossLoss === 0 ? (grossProfit > 0 ? 9.99 : 0) : grossProfit / grossLoss;

        // 3. Max Drawdown
        let maxVal = 0;
        let maxDD = 0;
        equityCurve.forEach(p => {
            if (p.value > maxVal) maxVal = p.value;
            const dd = ((maxVal - p.value) / maxVal) * 100;
            if (dd > maxDD) maxDD = dd;
        });

        // 4. Sharpe Ratio
        const dailyReturns = [];
        for (let i = 1; i < equityCurve.length; i++) {
            const ret = (equityCurve[i].value - equityCurve[i - 1].value) / equityCurve[i - 1].value;
            dailyReturns.push(ret);
        }
        const avgReturn = dailyReturns.length > 0 ? dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length : 0;
        const stdDev = dailyReturns.length > 0 ? Math.sqrt(dailyReturns.reduce((a, b) => a + Math.pow(b - avgReturn, 2), 0) / dailyReturns.length) : 0;
        const sharpe = stdDev === 0 ? 0 : (avgReturn / stdDev) * Math.sqrt(252);

        return {
            sharpe: isNaN(sharpe) ? 0 : sharpe,
            maxDrawdown: maxDD,
            profitFactor: isNaN(profitFactor) ? 0 : profitFactor,
            winRate: winRate
        };
    },

    calculateScore(metrics, wf) {
        // Simple 0-100 logic based on core components
        let score = 0;
        score += Math.min(25, metrics.sharpe * 10);
        score += Math.max(0, 25 - metrics.maxDrawdown);
        score += Math.min(25, metrics.profitFactor * 10);

        // Bonus for winrate
        score += (metrics.winRate / 4);

        // Penalty if validation return is negative
        if (wf.validation.totalReturn < 0) score -= 20;

        return Math.min(100, Math.max(0, Math.round(score)));
    },

    nullMetrics() {
        return { sharpe: 0, maxDrawdown: 0, profitFactor: 0, winRate: 0 };
    }
};
