/**
 * Monte Carlo Simulation
 * Randomizes trade order to test strategy robustness.
 */

const MonteCarlo = {
    run(trades, initialCapital, iterations = 100) {
        if (trades.length === 0) return [];

        let curves = [];
        const returns = trades.map(t => t.return);

        for (let i = 0; i < iterations; i++) {
            // Shuffle returns
            let shuffled = [...returns].sort(() => Math.random() - 0.5);

            let capital = initialCapital;
            let curve = [capital];

            for (let r of shuffled) {
                // Add random slippage variance ±50%
                const slippageAdj = 1 + (Math.random() - 0.5) * 0.002;
                capital = capital * (1 + r * slippageAdj);
                curve.push(capital);
            }
            curves.push(curve);
        }

        return curves;
    }
};
