/**
 * UI Controller
 */

const UI = {
    elements: {},

    init() {
        this.elements = {
            stockSelect: document.getElementById('stock-select'),
            strategyPrompt: document.getElementById('strategy-prompt'),
            runBtn: document.getElementById('run-backtest'),
            btnText: document.querySelector('.btn-text'),
            loader: document.querySelector('.loader-ring'),

            botStatus: document.getElementById('bot-status'),
            totalEquity: document.getElementById('total-equity'),
            totalReturn: document.getElementById('total-return-percent'),

            botCode: document.getElementById('bot-code-preview'),
            tradeLog: document.getElementById('trade-log').querySelector('tbody'),

            metricSharpe: document.getElementById('metric-sharpe'),
            metricDrawdown: document.getElementById('metric-drawdown'),
            metricProfitFactor: document.getElementById('metric-profit-factor'),
            metricWinRate: document.getElementById('metric-win-rate'),

            scoreValue: document.getElementById('score-value'),
            scoreMeter: document.getElementById('score-meter'),
            deploymentStatus: document.getElementById('deployment-status'),

            wfTrain: document.getElementById('wf-train-metrics'),
            wfValid: document.getElementById('wf-valid-metrics'),

            interpretation: document.getElementById('strategy-interpretation'),
            interpretedContent: document.getElementById('interpreted-content'),
            chartLegend: document.getElementById('chart-legend')
        };

        this.populateStocks();

        // Initialize Specialized Charts
        const ddCtx = document.getElementById('drawdownChart').getContext('2d');
        const eqCtx = document.getElementById('equityChart').getContext('2d');
        const mcCtx = document.getElementById('monteCarloChart').getContext('2d');

        Charts.init('tv-chart-container', ddCtx, eqCtx, mcCtx);

        // 8. Clipboard Integration
        this.elements.copyBtn = document.getElementById('copy-bot-btn');
        this.elements.copyBtn.addEventListener('click', () => this.copyBotSource());
    },

    async copyBotSource() {
        const code = this.elements.botCode.textContent;
        if (!code || code.includes('Awaiting')) return;

        try {
            await navigator.clipboard.writeText(code);
            const originalText = this.elements.copyBtn.textContent;
            this.elements.copyBtn.textContent = 'Copied!';
            this.elements.copyBtn.classList.add('success');
            setTimeout(() => {
                this.elements.copyBtn.textContent = originalText;
                this.elements.copyBtn.classList.remove('success');
            }, 2000);
        } catch (err) {
            console.error('Failed to copy!', err);
            alert('Could not copy to clipboard.');
        }
    },

    populateStocks() {
        DataEngine.STOCKS.forEach(stock => {
            const opt = document.createElement('option');
            opt.value = stock.symbol;
            opt.textContent = `${stock.symbol} (${stock.name})`;
            this.elements.stockSelect.appendChild(opt);
        });
    },

    setLoading(isLoading) {
        this.elements.runBtn.disabled = isLoading;
        this.elements.loader.classList.toggle('hidden', !isLoading);
        this.elements.btnText.textContent = isLoading ? 'Compiling...' : 'Execute Bot';
    },

    updateResults(results, strategyInfo, wf) {
        // 1. Dashboard Metrics
        const totalReturn = ((results.finalValue - results.initialCapital) / results.initialCapital) * 100;
        this.elements.totalEquity.textContent = `$${results.finalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
        this.elements.totalReturn.textContent = `${totalReturn >= 0 ? '+' : ''}${totalReturn.toFixed(2)}%`;
        this.elements.totalReturn.className = `return-chip ${totalReturn >= 0 ? 'positive' : 'negative'}`;

        this.elements.botStatus.textContent = '● Bot Execution Complete';
        this.elements.botStatus.style.color = '#00dfa2';

        // 2. Bot Terminal
        this.elements.botCode.textContent = strategyInfo.botCode;

        // 3. Trade Log
        this.elements.tradeLog.innerHTML = '';
        results.trades.slice(-50).reverse().forEach(t => {
            const row = document.createElement('tr');
            const pnl = t.pnl || 0;
            row.innerHTML = `
                <td>${t.exitDate || t.entryDate}</td>
                <td class="type-${t.exitDate ? 'sell' : 'buy'}">${t.exitDate ? 'SELL' : 'BUY'}</td>
                <td>${t.qty.toFixed(0)}</td>
                <td>$${(t.exitPrice || t.entryPrice).toFixed(1)}</td>
                <td class="${pnl >= 0 ? 'type-buy' : 'type-sell'}">${pnl >= 0 ? '+' : ''}${pnl.toFixed(0)}</td>
            `;
            this.elements.tradeLog.appendChild(row);
        });

        // 4. Quantitative Metrics
        const metrics = Metrics.calculate(results.trades, results.equityCurve);
        this.elements.metricSharpe.textContent = metrics.sharpe.toFixed(2);
        this.elements.metricDrawdown.textContent = `${metrics.maxDrawdown.toFixed(2)}%`;
        this.elements.metricProfitFactor.textContent = metrics.profitFactor.toFixed(2);
        this.elements.metricWinRate.textContent = `${metrics.winRate.toFixed(1)}%`;

        // 5. Score & Gauge (with final logic)
        const score = Metrics.calculateScore(metrics, wf);
        this.elements.scoreValue.textContent = score;
        const offset = 283 - (283 * score) / 100;
        this.elements.scoreMeter.style.strokeDashoffset = offset;

        this.elements.deploymentStatus.classList.remove('hidden');
        if (score >= 70) {
            this.elements.deploymentStatus.textContent = 'PRODUCTION READY';
            this.elements.deploymentStatus.className = 'deployment-badge pass';
            this.elements.scoreMeter.style.stroke = '#00dfa2';
        } else {
            this.elements.deploymentStatus.textContent = 'REFINEMENT NEEDED';
            this.elements.deploymentStatus.className = 'deployment-badge fail';
            this.elements.scoreMeter.style.stroke = '#f83f3f';
        }

        // 6. Walk Forward
        this.elements.wfTrain.textContent = `Return: ${wf.training.totalReturn.toFixed(1)}%`;
        this.elements.wfValid.textContent = `Return: ${wf.validation.totalReturn.toFixed(1)}%`;

        // 7. Logic interpretation
        this.elements.interpretation.classList.remove('hidden');
        this.elements.interpretedContent.textContent = strategyInfo.description;

        if (results.candles && results.candles.length > 0) {
            const lastCandle = results.candles[results.candles.length - 1];
            this.elements.chartLegend.textContent = `${this.elements.stockSelect.value} [${results.isReal ? 'REAL' : 'SYNTHETIC'}] · Price: $${lastCandle.close}`;
        }

        // 8. Visualizations
        Charts.updateCandlesticks(results.candles || results.rawCandles);
        Charts.updateMarkers(results.trades);
        Charts.updateIndicators(results.indicators);
        Charts.updateDrawdown(results.equityCurve);

        // Institutional Specialized Visuals
        Charts.updateEquity(results.equityCurve, results.benchmarkCurve);
        const mcCurves = MonteCarlo.run(results.trades, results.initialCapital, 30);
        Charts.updateMonteCarlo(mcCurves);
    }
};
