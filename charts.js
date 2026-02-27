/**
 * Custom SVG-based Financial Charting Engine
 * Replaces TradingView library for ultimate stability.
 */

const Charts = {
    container: null,
    svg: null,
    drawdownChart: null,
    equityChart: null,
    monteCarloChart: null,

    // Data store for rendering
    store: {
        candles: [],
        indicators: {},
        trades: [],
        padding: { top: 30, bottom: 40, left: 20, right: 60 }
    },

    init(tvContainerId, ddCtx, eqCtx, mcCtx) {
        this.container = document.getElementById(tvContainerId);

        // 1. Initialize custom SVG container
        this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        this.svg.setAttribute("width", "100%");
        this.svg.setAttribute("height", "100%");
        this.svg.style.backgroundColor = "#050505";
        this.container.innerHTML = '';
        this.container.appendChild(this.svg);

        // 2. Initialize secondary Chart.js charts
        this.drawdownChart = this.createLineChart(ddCtx, '#f83f3f', 'Drawdown %', true);
        this.equityChart = new Chart(eqCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    { label: 'Strategy', data: [], borderColor: '#00dfa2', borderWidth: 2, pointRadius: 0, fill: false },
                    { label: 'Benchmark', data: [], borderColor: 'rgba(255,255,255,0.2)', borderWidth: 1, borderDash: [5, 5], pointRadius: 0, fill: false }
                ]
            },
            options: this.getMiniChartOptions()
        });

        this.monteCarloChart = new Chart(mcCtx, {
            type: 'line',
            data: { labels: [], datasets: [] },
            options: this.getMiniChartOptions()
        });

        window.addEventListener('resize', () => this.render());
    },

    getMiniChartOptions() {
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { display: false },
                y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#808080', font: { size: 9 } } }
            }
        };
    },

    createLineChart(ctx, color, label, fill) {
        return new Chart(ctx, {
            type: 'line',
            data: { labels: [], datasets: [{ label, data: [], borderColor: color, borderWidth: 1, fill, backgroundColor: fill ? `${color}1A` : 'transparent', pointRadius: 0 }] },
            options: this.getMiniChartOptions()
        });
    },

    updateCandlesticks(data) {
        this.store.candles = data;
        this.render();
    },

    updateMarkers(trades) {
        this.store.trades = trades;
        this.render();
    },

    updateIndicators(indicators) {
        this.store.indicators = indicators;
        this.render();
    },

    render() {
        if (!this.svg || !this.store.candles.length) return;

        const width = this.container.offsetWidth;
        const height = this.container.offsetHeight;
        const { candles, indicators, trades, padding } = this.store;

        this.svg.innerHTML = ''; // Clear for redraw

        // 1. Calculate Scales
        const priceMin = Math.min(...candles.map(c => c.low)) * 0.995;
        const priceMax = Math.max(...candles.map(c => c.high)) * 1.005;
        const priceRange = priceMax - priceMin;

        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;

        const candleWidth = chartWidth / candles.length;
        const getX = (i) => padding.left + (i * candleWidth) + (candleWidth / 2);
        const getY = (price) => padding.top + chartHeight - ((price - priceMin) / priceRange) * chartHeight;

        // 2. Draw Grid & Axes
        this.drawGrid(padding, width, height, priceMin, priceMax, getY);

        // 3. Draw Indicators (Lines)
        Object.entries(indicators).forEach(([name, values]) => {
            if (name === 'dates') return;
            if (Array.isArray(values)) {
                this.drawIndicator(values, getX, getY);
            } else if (typeof values === 'object' && values !== null) {
                // Handle objects (like Donchian {upper, lower} or Bollinger {upper, middle, lower})
                Object.values(values).forEach(series => {
                    if (Array.isArray(series)) this.drawIndicator(series, getX, getY);
                });
            }
        });

        // 4. Draw Candlesticks
        candles.forEach((c, i) => {
            const x = getX(i);
            const yOpen = getY(c.open);
            const yClose = getY(c.close);
            const yHigh = getY(c.high);
            const yLow = getY(c.low);

            const isUp = c.close >= c.open;
            const color = isUp ? '#00dfa2' : '#f83f3f';

            // Wick
            this.drawSVG('line', { x1: x, y1: yHigh, x2: x, y2: yLow, stroke: color, "stroke-width": 1 });
            // Body
            const bodyH = Math.max(Math.abs(yClose - yOpen), 1);
            const bodyY = Math.min(yOpen, yClose);
            this.drawSVG('rect', {
                x: x - (candleWidth * 0.4),
                y: bodyY,
                width: candleWidth * 0.8,
                height: bodyH,
                fill: color
            });
        });

        // 5. Draw Trade Markers
        trades.forEach(t => {
            const entryIdx = candles.findIndex(c => c.date === t.entryDate);
            if (entryIdx !== -1) {
                this.drawMarker(getX(entryIdx), getY(candles[entryIdx].low), 'BUY', '#00dfa2');
            }
            if (t.exitDate) {
                const exitIdx = candles.findIndex(c => c.date === t.exitDate);
                if (exitIdx !== -1) {
                    this.drawMarker(getX(exitIdx), getY(candles[exitIdx].high), 'SELL', '#f83f3f');
                }
            }
        });

        // 6. Right Price Scale Ticks
        this.drawPriceScale(padding, width, priceMin, priceMax, getY);
    },

    drawGrid(padding, width, height, min, max, getY) {
        const steps = 5;
        for (let i = 0; i <= steps; i++) {
            const price = min + (i * (max - min) / steps);
            const y = getY(price);
            this.drawSVG('line', { x1: padding.left, y1: y, x2: width - padding.right, y2: y, stroke: "rgba(255,255,255,0.05)", "stroke-width": 1 });
        }
    },

    drawPriceScale(padding, width, min, max, getY) {
        const steps = 5;
        for (let i = 0; i <= steps; i++) {
            const price = min + (i * (max - min) / steps);
            const y = getY(price);
            const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            text.setAttribute("x", width - padding.right + 5);
            text.setAttribute("y", y + 4);
            text.setAttribute("fill", "#808080");
            text.setAttribute("font-size", "10px");
            text.textContent = price.toFixed(1);
            this.svg.appendChild(text);
        }
    },

    drawIndicator(values, getX, getY) {
        let points = "";
        values.forEach((v, i) => {
            if (v === null || v === undefined) return;
            const x = getX(i);
            const y = getY(v);
            points += `${x},${y} `;
        });
        this.drawSVG('polyline', { points, fill: "none", stroke: "#2196f3", "stroke-width": 1, "stroke-dasharray": "4,2" });
    },

    drawMarker(x, y, type, color) {
        const size = 10;
        const offset = type === 'BUY' ? 15 : -15;
        const points = type === 'BUY'
            ? `${x},${y + offset} ${x - 5},${y + offset + 10} ${x + 5},${y + offset + 10}`
            : `${x},${y + offset} ${x - 5},${y + offset - 10} ${x + 5},${y + offset - 10}`;

        this.drawSVG('polygon', { points, fill: color });

        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", x);
        text.setAttribute("y", y + (type === 'BUY' ? 35 : -25));
        text.setAttribute("fill", color);
        text.setAttribute("font-size", "9px");
        text.setAttribute("text-anchor", "middle");
        text.textContent = type;
        this.svg.appendChild(text);
    },

    drawSVG(tag, attrs) {
        const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
        Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
        this.svg.appendChild(el);
        return el;
    },

    updateEquity(equityCurve, benchmarkCurve) {
        const labels = equityCurve.map(d => d.date);
        this.equityChart.data.labels = labels;
        this.equityChart.data.datasets[0].data = equityCurve.map(d => d.value);
        this.equityChart.data.datasets[1].data = benchmarkCurve.map(d => d.value);
        this.equityChart.update();
    },

    updateMonteCarlo(mcCurves) {
        if (!mcCurves.length) return;
        this.monteCarloChart.data.labels = Array.from({ length: mcCurves[0].length }, (_, i) => i);
        this.monteCarloChart.data.datasets = mcCurves.map((curve, idx) => ({
            data: curve,
            borderColor: idx === 0 ? '#00dfa2' : 'rgba(255, 255, 255, 0.05)',
            borderWidth: idx === 0 ? 2 : 1,
            pointRadius: 0,
            fill: false
        }));
        this.monteCarloChart.update();
    },

    updateDrawdown(equityCurve) {
        let max = 0;
        const dd = equityCurve.map(d => {
            if (d.value > max) max = d.value;
            return ((d.value - max) / max) * 100;
        });
        this.drawdownChart.data.labels = equityCurve.map(d => d.date);
        this.drawdownChart.data.datasets[0].data = dd;
        this.drawdownChart.update();
    }
};
