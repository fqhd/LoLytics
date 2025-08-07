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

  const labels = [];
  for (let i = 0; i < data.length; i++) {
    labels.push(`${i+1}m`);
  }

  useEffect(() => {
    const ctx = canvasRef.current.getContext('2d');



    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
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
