import { useRef, useEffect } from 'react';
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

export default function LineChart({ data }) {
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
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 3,
            pointBackgroundColor: '#4fd1c5',
            tension: 0.3,
            pointRadius: 0,
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          title: {
            display: true,
            text: 'Win Probability Graph',
            color: '#ccc',
            font: { size: 20, weight: 'bold' },
          },
        },
        scales: {
          x: { ticks: { color: '#ccc' } },
          y: { beginAtZero: true, ticks: { color: '#ccc' } },
        },
      },
    });

    return () => chartRef.current.destroy();
  }, []);

  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.data.labels = data.map((_, i) => `${i + 1}m`);
      chartRef.current.data.datasets[0].data = data;
      chartRef.current.update();
    }
  }, [data]);

  return <canvas ref={canvasRef} />;
}