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

export default function LineChart() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const ctx = canvasRef.current.getContext('2d');

    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['1m', '2m', '3m', '4m', '5m', '6m', '7m', '8m', '9m', '10m', '11m', '12m', '13m', '14m', '15m', '16m', '17m', '18m', '19m', '20m', '21m', '22m', '23m', '24m', '25m', '26m', '27m', '28m', '29m', '30m', '31m', '32m'],
        datasets: [
          {
            label: 'Gold',
            data: [500, 2500, 1300, 2000, 2700, 2500, 2200, 2200, 2100, 1600, 1500, 1700, 1550, 1900, 2000, 1800, 1900, 1890, 1840, 1800, 1670, 1500, 1540, 1430, 1300, 1100, 800, 500, 430, 200, 100, 50],
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
        plugins: {
          title: {
            display: true,
            text: 'Win Probability Graph',
            color: '#ccc',
            font: {
              size: 20,
              weight: 'bold',
            },
          },
        },
        scales: {
          x: {
            ticks: {
              color: '#ccc',
            },
          },
          y: {
            beginAtZero: true,
            ticks: {
              color: '#ccc',
            },
          },
        },
      },
    });

    return () => chart.destroy(); // Clean up on unmount
  }, []);

  return <canvas ref={canvasRef} />;
}
