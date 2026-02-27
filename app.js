/**
 * QuantTerminal v2 Orchestrator
 */

const App = {
    init() {
        console.log("QuantTerminal v2: Initiating App setup...");
        window.onerror = (msg, url, line) => {
            const status = document.getElementById('bot-status');
            if (status) {
                status.textContent = "● ERROR: " + msg;
                status.style.color = "#f83f3f";
            }
            return false;
        };

        try {
            UI.init();
            this.bindEvents();

            // Trigger auto-run immediately if document is already loaded
            if (document.readyState === 'complete') {
                this.handleRun();
            } else {
                window.addEventListener('load', () => this.handleRun());
            }
        } catch (e) {
            console.error("Initialization Failed:", e);
            alert("Terminal Initialization Failed: " + e.message);
        }
    },

    bindEvents() {
        UI.elements.runBtn.addEventListener('click', () => {
            console.log("Execute Bot button clicked.");
            this.handleRun();
        });

        UI.elements.strategyPrompt.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                this.handleRun();
            }
        });
    },

    async handleRun() {
        const prompt = UI.elements.strategyPrompt.value || "EMA 20 crossing EMA 50 on AAPL with 1.5% stop";
        const symbol = UI.elements.stockSelect.value;

        UI.setLoading(true);
        UI.elements.botStatus.textContent = "● Fetching Market Data...";
        UI.elements.botStatus.style.color = "#2196f3";

        try {
            // 1. Professional Real Data Fetch
            const data = await DataEngine.generateData(symbol);

            if (!data.candles || data.candles.length === 0) {
                throw new Error("Data engine returned empty candle set.");
            }

            UI.elements.botStatus.textContent = "● Compiling Strategy Bot...";
            // 2. Quant Dev Logic Generation
            const strategyInfo = StrategyParser.parse(prompt);

            UI.elements.botStatus.textContent = "● Executing Backtest Tick-by-Tick...";
            // 3. Bot Execution
            const mainResults = Backtester.run(data.candles, strategyInfo);

            UI.elements.botStatus.textContent = "● Validating Out-of-Sample...";
            // 4. Institutional Validation
            const wfResults = WalkForward.validate(data.candles, strategyInfo);

            UI.elements.botStatus.textContent = "● Rendering Dashboard...";
            // 5. Render Dashboard
            UI.updateResults({
                ...mainResults,
                candles: data.candles,
                isReal: data.isReal
            }, strategyInfo, wfResults);

        } catch (error) {
            console.error("Terminal Error:", error);
            UI.elements.botStatus.textContent = "● Execution Failed";
            UI.elements.botStatus.style.color = "#f83f3f";
            alert("Execution Failure: " + error.message);
        } finally {
            UI.setLoading(false);
        }
    }
};

App.init();
