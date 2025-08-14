import { useRef, useEffect, useState } from 'react';
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  Title,
  CategoryScale,
} from 'chart.js';

Chart.register(LineController, LineElement, PointElement, LinearScale, Title, CategoryScale);

export default function LineChart({ data, frameIndex, setFrameIndex }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    const ctx = canvasRef.current.getContext('2d');
    chartRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map((_, i) => `${i + 1}m`),
        datasets: [
          {
            label: 'Gold',
            data,
            borderColor: '#60dfffff',
            pointBorderColor: '#60dfffff',
            borderWidth: 3,
            pointBackgroundColor: data.map(() => '#60dfffff'), // array for per-point color
            tension: 0.3,
            pointRadius: 0,
            pointHoverRadius: 5,
            pointHitRadius: 10,
            fill: false,
          },
        ],
      },
      options: {
        onHover: (event, elements) => {
          const target = event.native ? event.native.target : event.target;
          if (elements.length > 0) {
            target.style.cursor = 'pointer';
          } else {
            target.style.cursor = 'default';
          }
        },
        onClick: (event, elements) => {
          if (elements.length > 0) {
            const firstPoint = elements[0];
            const index = firstPoint.index;

            setFrameIndex((prev) => (prev === index ? null : index));

            const label = chartRef.current.data.labels[index];
            const value = chartRef.current.data.datasets[firstPoint.datasetIndex].data[index];
          }
        },
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 0,
        },
        plugins: {
          title: {
            display: true,
            text: 'Win Probability Graph',
            color: '#fff',
            font: { size: 20, weight: 'bold' },
          },
        },
        scales: {
          x: {
            grid: {
              color: 'rgba(255, 255, 255, 0.5)',
            },
            ticks: { color: '#fff' }
          },
          y: {
            min: 0,
            max: 1,
            grid: {
              color: 'rgba(255, 255, 255, 0.5)',
            },
            beginAtZero: true,
            ticks: { color: '#fff' }
          },
        },
      },
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
