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

Chart.register(LineController, LineElement, PointElement, LinearScale, Title, CategoryScale, Tooltip);

export default function LineChart({ data, frameIndex, setFrameIndex }) {
    const canvasRef = useRef(null);
    const chartRef = useRef(null);
    const hoverIndexRef = useRef(null);

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
                labels: data.map((_, i) => `${i + 1}m`),
                datasets: [
                    {
                        label: 'Win Probability',
                        data,
                        borderColor: '#60dfffff',
                        pointBorderColor: '#60dfffff',
                        borderWidth: 3,
                        pointBackgroundColor: data.map(() => '#60dfffff'),
                        tension: 0.3,
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
                    tooltip: { enabled: true },
                    title: {
                        display: true,
                        text: 'Win Probability Graph',
                        color: '#fff',
                        font: { size: 14, weight: 'bold' },
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

        return () => chartRef.current.destroy();
    }, []);

    useEffect(() => {
        if (!chartRef.current) return;

        chartRef.current.data.labels = data.map((_, i) => `${i + 1}m`);
        chartRef.current.data.datasets[0].data = data;

        chartRef.current.data.datasets[0].pointBackgroundColor = data.map((_, i) =>
            i === frameIndex ? '#50ff50ff' : '#60dfffff'
        );

        chartRef.current.data.datasets[0].pointBorderColor = data.map((_, i) =>
            i === frameIndex ? '#50ff50ff' : '#60dfffff'
        );

        chartRef.current.data.datasets[0].pointRadius = data.map((_, i) =>
            i === frameIndex ? 5 : 0
        );

        chartRef.current.update();
    }, [data, frameIndex]);

    return <canvas ref={canvasRef} />;
}
