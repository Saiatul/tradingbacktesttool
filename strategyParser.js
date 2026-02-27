const StrategyParser = {
    parse(prompt) {
        const p = prompt.toLowerCase();

        // 1. Keyword Identification (The "Dictionary")
        const indicators = {
            rsi: p.includes('rsi'),
            ema: p.includes('ema'),
            sma: p.includes('sma'),
            bb: p.includes('bollinger') || p.includes('bb'),
            vwap: p.includes('vwap'),
            atr: p.includes('atr'),
            macd: p.includes('macd'),
            stoch: p.includes('stoch') || p.includes('stochastic'),
            supertrend: p.includes('supertrend'),
            donchian: p.includes('donchian') || p.includes('highest high') || p.includes('lowest low') || p.includes('breakout')
        };

        // 2. Parameter Extraction
        const numbers = (p.match(/\d+/g) || []).map(Number);
        const params = {
            emaFast: (numbers.find(n => n >= 5 && n <= 30) || 20),
            emaSlow: (numbers.find(n => n > 30 && n <= 200) || 50),
            rsiVal: (numbers.find(n => n > 5 && n < 100) || 14),
            stochK: 14, stochD: 3,
            donchianVal: (numbers.find(n => n >= 10 && n <= 100) || 20),
            riskPerTrade: (numbers.find(n => n >= 1 && n <= 10) || 2) // Default 2% risk if mentioned
        };

        // 3. Risk Management Detection
        const slMatch = p.match(/(\d+(\.\d+)?)%\s*stop/i) || p.match(/stop\s*loss\s*of\s*(\d+(\.\d+)?)%/i);
        const tpMatch = p.match(/(\d+(\.\d+)?)%\s*profit/i) || p.match(/take\s*profit\s*of\s*(\d+(\.\d+)?)%/i) || p.match(/target\s*of\s*(\d+(\.\d+)?)%/i);
        const riskMatch = p.match(/risk\s*(\d+(\.\d+)?)%/i) || p.match(/(\d+(\.\d+)?)%\s*risk/i);

        const stopLoss = slMatch ? parseFloat(slMatch[1]) : 2.0;
        const takeProfit = tpMatch ? parseFloat(tpMatch[1]) : 6.0;
        const riskPerTrade = riskMatch ? parseFloat(riskMatch[1]) : 2.0;

        // 4. Generate Strategy Logic
        const logic = this.generateLogic({ p, indicators, params });

        // 5. Generate Execution Function (Internal)
        const executionFuncStr = `(ctx) => {
            const { candles, indicators, portfolio, currentIdx } = ctx;
            const price = candles[currentIdx].close;
            const balance = portfolio.balance;
            let signal = 'HOLD';
            ${logic}
            
            // Professional Risk-Adjusted Sizing
            // Quantity = (Balance * Risk%) / (Entry - StopLoss)
            const slPct = ${stopLoss} / 100;
            const riskPct = ${riskPerTrade} / 100;
            const riskAmount = balance * riskPct;
            const slDistance = price * slPct;
            let qty = riskAmount / slDistance;
            
            // Cap to current available balance (no leverage)
            if (qty * price > balance * 0.98) {
                qty = (balance * 0.98) / price;
            }

            return { signal, qty, sl: ${stopLoss}, tp: ${takeProfit} };
        }`;

        // 6. Final Config for Metadata
        const indicatorsCfg = {
            ema: indicators.ema ? [params.emaFast, params.emaSlow] : [],
            rsi: indicators.rsi ? [params.rsiVal] : [],
            sma: indicators.sma ? [20] : [],
            vwap: indicators.vwap,
            atr: indicators.atr || riskMatch, // Need ATR if doing risk? (Actually SL is fixed % here unless prompt specified ATR)
            macd: indicators.macd,
            stoch: indicators.stoch,
            supertrend: indicators.supertrend,
            donchian: indicators.donchian ? [params.donchianVal] : []
        };

        const fullBotCode = this.generateStandaloneTemplate({
            prompt, logic, stopLoss, takeProfit, riskPerTrade, indicators: indicatorsCfg, params
        });

        return {
            description: this.generateDesc(indicators, params, stopLoss, takeProfit, riskPerTrade),
            botCode: fullBotCode,
            executionFunc: executionFuncStr,
            indicators: indicatorsCfg
        };
    },

    generateDesc(ind, par, sl, tp, r) {
        let text = "Custom Strategy: ";
        if (ind.donchian) text += "Channel Breakout. ";
        else if (ind.ema) text += "Trend Following. ";
        else if (ind.rsi) text += "Mean Reversion. ";
        text += `Risk: ${r}%/trade, SL: ${sl}%, TP: ${tp}%.`;
        return text;
    },

    generateLogic(cfg) {
        const { p, indicators, params } = cfg;
        let logic = `if (currentIdx < 30) return { signal: 'HOLD' };\n`;

        if (indicators.donchian) {
            logic += `
        const high = indicators.Donchian_${params.donchianVal}.upper[currentIdx];
        const low = indicators.Donchian_${params.donchianVal}.lower[currentIdx];
        if (price > high) signal = 'BUY';
        if (price < low) signal = 'SELL';`;
            return logic;
        }

        if (indicators.macd) {
            logic += `
        const macd = indicators.MACD;
        if (macd.macdLine[currentIdx] > macd.signalLine[currentIdx] && macd.macdLine[currentIdx-1] <= macd.signalLine[currentIdx-1]) signal = 'BUY';
        if (macd.macdLine[currentIdx] < macd.signalLine[currentIdx] && macd.macdLine[currentIdx-1] >= macd.signalLine[currentIdx-1]) signal = 'SELL';`;
            return logic;
        }

        if (indicators.ema) {
            logic += `
        const emaF = indicators.EMA_${params.emaFast}[currentIdx];
        const emaS = indicators.EMA_${params.emaSlow}[currentIdx];
        const prevF = indicators.EMA_${params.emaFast}[currentIdx - 1];
        const prevS = indicators.EMA_${params.emaSlow}[currentIdx - 1];
        if (prevF <= prevS && emaF > emaS) signal = 'BUY';
        if (prevF >= prevS && emaF < emaS) signal = 'SELL';`;
            return logic;
        }

        // Default to SMA Trend if nothing specific
        logic += `
        const sma = indicators.SMA_20[currentIdx];
        if (price > sma) signal = 'BUY';
        if (price < sma * 0.98) signal = 'SELL';`;
        return logic;
    },

    generateStandaloneTemplate(cfg) {
        return `/**
 * 🤖 PROFESSIONAL QUANT TRADING BOT
 * Generated by QuantTerminal v3
 * ----------------------------------------------------
 * Strategy: ${cfg.prompt}
 * Risk Model: Fixed Fractional (${cfg.riskPerTrade}% Risk per Trade)
 * ----------------------------------------------------
 */

const CONFIG = {
    keyId: 'YOUR_ALPACA_KEY_ID',
    secretKey: 'YOUR_ALPACA_SECRET_KEY',
    symbol: 'AAPL',
    initialCapital: 100000,
    riskPerTrade: ${cfg.riskPerTrade}, 
    stopLoss: ${cfg.stopLoss},
    takeProfit: ${cfg.takeProfit}
};

const StandaloneBot = {
    async run() {
        console.log("🚀 Starting Professional Bot...");
        if (CONFIG.keyId === 'YOUR_ALPACA_KEY_ID') {
            return console.error("❌ ERROR: Set Alpaca API keys.");
        }
        try {
            const data = await this.fetchData(CONFIG.symbol);
            const indicators = this.calculateIndicators(data);
            this.execute(data, indicators);
        } catch (e) {
            console.error("❌ Failed:", e.message);
        }
    },

    async fetchData(symbol) {
        const url = \`https://data.alpaca.markets/v2/stocks/\${symbol}/bars?timeframe=1Day&limit=250\`;
        const res = await fetch(\`https://corsproxy.io/?\${encodeURIComponent(url)}\`, {
            headers: { 'APCA-API-KEY-ID': CONFIG.keyId, 'APCA-API-SECRET-KEY': CONFIG.secretKey }
        });
        const json = await res.json();
        return json.bars.map(b => ({ close: b.c, high: b.h, low: b.l, open: b.o, volume: b.v, date: b.t }));
    },

    calculateIndicators(data) {
        const prices = data.map(d => d.close);
        const results = {};
        // Professional Library Mappings
        ${cfg.indicators.ema.map(p => `results.EMA_${p} = this.EMA(prices, ${p});`).join('\n        ')}
        ${cfg.indicators.rsi.map(p => `results.RSI_${p} = this.RSI(prices, ${p});`).join('\n        ')}
        ${cfg.indicators.sma.map(p => `results.SMA_${p} = this.SMA(prices, ${p});`).join('\n        ')}
        ${cfg.indicators.donchian ? cfg.indicators.donchian.map(p => `results.Donchian_${p} = this.Donchian(data, ${p});`).join('\n        ') : ''}
        return results;
    },

    // --- INDICATOR METHODS ---
    EMA(data, p) { let k=2/(p+1), e=data[0]; return data.map(v=>e=(v*k)+(e*(1-k))); },
    SMA(data, p) { return data.map((_, i)=>i<p-1?null:data.slice(i-p+1,i+1).reduce((a,b)=>a+b)/p); },
    RSI(data, p) {
        let res=new Array(data.length).fill(100), g=0, l=0;
        for(let i=1;i<data.length;i++){
            let d=data[i]-data[i-1]; d>=0?g+=d:l-=d;
            if(i>=p){ let rs=g/(l||1); res[i]=100-(100/(1+rs)); let o=data[i-p+1]-data[i-p]; o>=0?g-=o:l+=o; }
        } return res;
    },
    Donchian(data, p) {
        let u=new Array(data.length).fill(null), l=new Array(data.length).fill(null);
        for(let i=p;i<data.length;i++){
            const win=data.slice(i-p,i);
            u[i]=Math.max(...win.map(d=>d.high));
            l[i]=Math.min(...win.map(d=>d.low));
        } return {upper:u, lower:l};
    },

    execute(candles, indicators) {
        let balance = CONFIG.initialCapital, position = null;
        candles.forEach((candle, currentIdx) => {
            const price = candle.close;
            let signal = 'HOLD';

            if (position) {
                const pnl = ((price - position.entryPrice) / position.entryPrice) * 100;
                if (pnl <= -position.sl || pnl >= position.tp) {
                    balance += position.qty * price;
                    console.log(\`[EXIT] \${candle.date} at \$\${price.toFixed(2)} | P&L: \${pnl.toFixed(2)}%\`);
                    position = null;
                }
            }

            ${cfg.logic}

            if (signal === 'BUY' && !position) {
                const slPct = CONFIG.stopLoss / 100;
                const riskAmount = balance * (CONFIG.riskPerTrade / 100);
                const slDistance = price * slPct;
                let qty = riskAmount / slDistance;
                if (qty * price > balance) qty = balance / price;

                position = { qty, entryPrice: price, sl: CONFIG.stopLoss, tp: CONFIG.takeProfit };
                balance -= qty * price;
                console.log(\`[ENTRY] \${candle.date} BUY | Qty: \${qty.toFixed(2)} | Risk: \$\${riskAmount.toFixed(0)}\`);
            } else if (signal === 'SELL' && position) {
                balance += position.qty * price;
                console.log(\`[EXIT] \${candle.date} SELL at \$\${price}\`);
                position = null;
            }
        });
        console.log(\`\\n🏁 Final Portfolio Value: \$\${(balance + (position?position.qty*price:0)).toFixed(2)}\`);
    }
};

StandaloneBot.run();
`;
    }
};
