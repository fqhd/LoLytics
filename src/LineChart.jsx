import { useRef, useEffect } from 'react';
import {
    Chart,
    LineController,
    LineElement,
    PointElement,
    LinearScale,
    Title,
    CategoryScale,
    Tooltip
} from 'chart.js';

const EPSILON = 0.05;

Chart.register(LineController, LineElement, PointElement, LinearScale, Title, CategoryScale, Tooltip);

export default function LineChart({ data, frameIndex, setFrameIndex }) {
    const canvasRef = useRef(null);
    const chartRef = useRef(null);
    const hoverIndexRef = useRef(null);
    const tooltipRef = useRef(null);

    const events = {
        1: [
            { killer: "/images/icons/Yasuo.jpg", killee: "/images/icons/Lux.jpg", delta: 0.05 },
            { killer: "/images/icons/Ahri.jpg", killee: "/images/icons/Riven.jpg", delta: 0.02 },
        ],
        3: [
            { killer: "/images/icons/Zed.jpg", killee: "/images/tower.png", delta: -0.07 },
        ],
    };

    const verticalLinePlugin = {
        id: 'verticalLine',
        beforeDatasetsDraw(chart) {
            const index = hoverIndexRef.current;
            if (index === null) return;

            const { ctx, chartArea: { top, bottom }, scales: { x } } = chart;

            ctx.save();
            ctx.beginPath();
            ctx.moveTo(x.getPixelForValue(index), top);
            ctx.lineTo(x.getPixelForValue(index), bottom);
            ctx.lineWidth = 1;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.stroke();
            ctx.restore();
        }
    };

    useEffect(() => {
        if (!tooltipRef.current) {
            const el = document.createElement("div");
            el.id = "chartjs-tooltip";
            el.style.position = "absolute";
            el.style.pointerEvents = "none";
            el.style.background = "rgba(20,20,20,0.9)";
            el.style.color = "white";
            el.style.borderRadius = "8px";
            el.style.padding = "10px";
            el.style.fontFamily = "sans-serif";
            el.style.fontSize = "14px";
            el.style.zIndex = 1000;
            el.style.opacity = 0;
            document.body.appendChild(el);
            tooltipRef.current = el;
        }

        const ctx = canvasRef.current.getContext('2d');
        chartRef.current = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map((_, i) => `${i}m`),
                datasets: [
                    {
                        label: 'Win Probability',
                        data,
                        borderColor: '#60dfffff',
                        pointBorderColor: '#60dfffff',
                        borderWidth: 3,
                        pointBackgroundColor: data.map(() => '#60dfffff'),
                        tension: 0.3,
                        segment: {
                            borderColor: ctx => {
                                const i = ctx.p1DataIndex;
                                const dataset = ctx.chart.data.datasets[0].data;
                                const change = dataset[i] - dataset[i - 1];

                                if (Math.abs(change) > EPSILON) {
                                    return change > 0 ? 'lime' : 'red';
                                }
                                return '#60dfffff';
                            },
                            borderWidth: ctx => {
                                const i = ctx.p1DataIndex;
                                const dataset = ctx.chart.data.datasets[0].data;
                                const change = dataset[i] - dataset[i - 1];

                                return Math.abs(change) > EPSILON ? 4 : 3;
                            }
                        },
                        pointRadius: 0,
                        pointHoverRadius: 5,
                        pointHitRadius: 10,
                        fill: false,
                    },
                ],
            },
            options: {
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    tooltip: {
                        enabled: false,
                        external: (context) => {
                            const tooltipModel = context.tooltip;
                            const tooltipEl = tooltipRef.current;
                            if (!tooltipEl) return;

                            if (tooltipModel.opacity === 0) {
                                tooltipEl.style.opacity = 0;
                                return;
                            }

                            const dataIndex = tooltipModel.dataPoints[0].dataIndex;
                            const value = tooltipModel.dataPoints[0].raw;

                            // Build tooltip JSX-like string
                            let innerHtml = `<div><strong>Minute ${dataIndex}</strong>: ${value}%</div>`;

                            if (events[dataIndex]) {
                                events[dataIndex].forEach((e) => {
                                    const swordClass = e.delta > 0 ? "green" : "red";
                                    innerHtml += `
                <div style="display:flex;align-items:center;margin-top:6px">
                  <img src="${e.killer}" style="width:30px;height:30px;border-radius:4px"/>
                  <div style="
  display:flex;
  justify-content:center;
  align-items:center;
  width:26px;
  height:26px;
  margin:0 6px;
  border-radius:4px;
  background:${swordClass};
">
  <img src="/images/sword.png" style="width:22px;height:22px"/>
</div>
                  <img src="${e.killee}" style="width:30px;height:30px;border-radius:4px"/>
                  <span style="margin-left:6px">(${e.delta > 0 ? "+" : ""}${e.delta}%)</span>
                </div>
              `;
                                });
                            }

                            tooltipEl.innerHTML = innerHtml;

                            // Position
                            const { offsetLeft: positionX, offsetTop: positionY } =
                                context.chart.canvas;
                            tooltipEl.style.opacity = 1;
                            tooltipEl.style.left = positionX + tooltipModel.caretX + 20 + "px";
                            tooltipEl.style.top = positionY + tooltipModel.caretY + "px";
                        },
                    },
                    title: {
                        display: true,
                        text: 'Win Probability Graph',
                        color: '#fff',
                        font: { size: 16, weight: 'bold' },
                    },
                },
                onHover: (event) => {
                    const points = chartRef.current.getElementsAtEventForMode(
                        event,
                        'index',
                        { intersect: false },
                        false
                    );
                    if (points.length) {
                        hoverIndexRef.current = points[0].index;
                        event.native.target.style.cursor = 'pointer';
                    } else {
                        hoverIndexRef.current = null;
                        event.native.target.style.cursor = 'default';
                    }
                    chartRef.current.draw();
                },
                onClick: (event) => {
                    const points = chartRef.current.getElementsAtEventForMode(
                        event,
                        'index',
                        { intersect: false },
                        false
                    );
                    if (points.length) {
                        const index = points[0].index;
                        setFrameIndex(index);
                    }
                },
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 0 },
                scales: {
                    x: {
                        grid: { color: 'rgba(255, 255, 255, 0.5)' },
                        ticks: { color: '#fff' }
                    },
                    y: {
                        min: 0,
                        max: 1,
                        grid: { color: 'rgba(255, 255, 255, 0.5)' },
                        beginAtZero: true,
                        ticks: { color: '#fff', callback: (value) => `${Math.round(value * 100)}%` }
                    },
                },
            },
            plugins: [verticalLinePlugin],
        });

        return () => {
            chartRef.current.destroy()
            if (tooltipRef.current) {
                tooltipRef.current.remove(); // remove from DOM
                tooltipRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (!chartRef.current) return;

        chartRef.current.data.labels = data.map((_, i) => `${i}m`);
        chartRef.current.data.datasets[0].data = data;

        const pointRadius = [];
        const pointBackgroundColor = [];
        const pointBorderColor = [];

        for (let i = 0; i < data.length; i++) {
            pointRadius[i] = 0;
            pointBackgroundColor[i] = '#60dfffff';
            pointBorderColor[i] = '#60dfffff';

            if (i > 0) {
                const change = data[i] - data[i - 1];
                const isSharp = Math.abs(change) > EPSILON;
                const dir = Math.sign(change);

                if (isSharp) {
                    let nextChange = 0, nextIsSharp = false, nextDir = 0;
                    if (i + 1 < data.length) {
                        nextChange = data[i + 1] - data[i];
                        nextIsSharp = Math.abs(nextChange) > EPSILON;
                        nextDir = Math.sign(nextChange);
                    }

                    pointBackgroundColor[i] = dir > 0 ? 'lime' : 'red';
                    pointBorderColor[i] = dir > 0 ? 'lime' : 'red';

                    const shouldDraw = !nextIsSharp || (nextIsSharp && nextDir !== dir);

                    if (shouldDraw) {
                        pointRadius[i] = 5;
                    }
                }
            }
        }

        chartRef.current.data.datasets[0].pointBackgroundColor = pointBackgroundColor;

        chartRef.current.data.datasets[0].pointBorderColor = pointBorderColor.map((c, i) =>
            i === frameIndex ? 'white' : c
        );

        chartRef.current.data.datasets[0].pointRadius = pointRadius.map((r, i) =>
            i === frameIndex ? 5 : r
        );

        chartRef.current.update();
    }, [data, frameIndex]);

    return <canvas ref={canvasRef} />;
}
