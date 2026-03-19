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
    const hoverIndexRef = useRef(0);

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
                        callbacks: {
                            label: function (context) {
                                const value = context.parsed.y;
                                const percentage = 'Win Probability: ' + (value * 100).toFixed(1) + '%';
                                return percentage;
                            }
                        }
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

    useEffect(() => {
        const canvas = chartRef.current.canvas;

        const handleLeave = () => {
            hoverIndexRef.current = frameIndex;
            chartRef.current.draw();
        };

        canvas.addEventListener('mouseleave', handleLeave);
        return () => {
            canvas.removeEventListener('mouseleave', handleLeave);
        };
    }, [frameIndex]);

    return <canvas ref={canvasRef} />;
}
