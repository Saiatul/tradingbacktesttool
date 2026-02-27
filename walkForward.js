/**
 * Walk-Forward Validation v2
 * High-integrity Out-of-Sample testing for generated Bots.
 */

const WalkForward = {
    validate(data, strategyInfo) {
        if (data.length < 50) return this.nullResults();

        // 70/30 Split
        const splitIdx = Math.floor(data.length * 0.7);
        const trainingData = data.slice(0, splitIdx);
        const validationData = data.slice(splitIdx);

        // Run Backtests
        const trainResult = Backtester.run(trainingData, strategyInfo);
        const validResult = Backtester.run(validationData, strategyInfo);

        const initialCapital = 100000;

        return {
            training: {
                totalReturn: ((trainResult.finalValue - initialCapital) / initialCapital) * 100,
                trades: trainResult.trades.length
            },
            validation: {
                totalReturn: ((validResult.finalValue - initialCapital) / initialCapital) * 100,
                trades: validResult.trades.length
            }
        };
    },

    nullResults() {
        return {
            training: { totalReturn: 0, trades: 0 },
            validation: { totalReturn: 0, trades: 0 }
        };
    }
};
