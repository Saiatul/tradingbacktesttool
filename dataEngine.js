/**
 * Real NSE Stock Data Engine
 * Fetches data from Yahoo Finance via a CORS proxy.
 */

const DataEngine = {
    // Alpaca Credentials
    config: {
        keyId: 'PKJDZQEAQGHQ2E22I66PNW3ZLS',
        secretKey: 'W4KgyHsWxsHLiTsTom72q478hnCcDbDnRkZXwXGrJBR',
        baseUrl: 'https://data.alpaca.markets/v2' // Official Data v2 Endpoint
    },

    STOCKS: [
        { symbol: 'AAPL', name: 'Apple Inc.' },
        { symbol: 'TSLA', name: 'Tesla, Inc.' },
        { symbol: 'NVDA', name: 'NVIDIA Corporation' },
        { symbol: 'MSFT', name: 'Microsoft Corporation' },
        { symbol: 'AMZN', name: 'Amazon.com, Inc.' },
        { symbol: 'META', name: 'Meta Platforms, Inc.' },
        { symbol: 'GOOGL', name: 'Alphabet Inc.' },
        { symbol: 'AMD', name: 'Advanced Micro Devices' },
        { symbol: 'NFLX', name: 'Netflix, Inc.' },
        { symbol: 'SPY', name: 'SPDR S&P 500 ETF' },
        { symbol: 'QQQ', name: 'Invesco QQQ Trust' }
    ],

    /**
     * Fetches real historical data from Alpaca Market Data v2
     */
    async generateData(symbol, days = 730) {
        const stock = this.STOCKS.find(s => s.symbol === symbol) || this.STOCKS[0];
        const ticker = stock.symbol;

        // Calculate start date
        const start = new Date();
        start.setDate(start.getDate() - days);
        const startStr = start.toISOString();

        const url = `${this.config.baseUrl}/stocks/${ticker}/bars?start=${startStr}&timeframe=1Day&adjustment=split`;
        // Use corsproxy.io to pass through headers
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;

        try {
            console.log(`Attempting to fetch data for ${symbol} via Alpaca Proxy...`);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);

            const response = await fetch(proxyUrl, {
                method: 'GET',
                headers: {
                    'APCA-API-KEY-ID': this.config.keyId,
                    'APCA-API-SECRET-KEY': this.config.secretKey,
                    'Accept': 'application/json'
                },
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Alpaca Proxy Error: ${response.status}`);
            }

            const data = await response.json();

            if (!data.bars || data.bars.length === 0) {
                throw new Error("Alpaca returned empty data set.");
            }

            const formattedData = data.bars.map(b => ({
                date: b.t.split('T')[0],
                open: parseFloat(b.o.toFixed(2)),
                high: parseFloat(b.h.toFixed(2)),
                low: parseFloat(b.l.toFixed(2)),
                close: parseFloat(b.c.toFixed(2)),
                volume: b.v || 0
            }));

            if (formattedData.length < 5) {
                throw new Error('Insufficient data points from Alpaca');
            }

            console.log(`Successfully loaded ${formattedData.length} records for ${symbol} via Alpaca`);
            return { candles: formattedData, isReal: true };

        } catch (error) {
            console.error(`CRITICAL: Real Data Fetch Failed:`, error.message);
            throw new Error(`CRITICAL: Could not fetch REAL Alpaca data. Simulation is disabled.`);
        }
    }
};
