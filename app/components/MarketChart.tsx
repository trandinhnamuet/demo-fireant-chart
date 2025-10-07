'use client';

import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { MarketData } from '../services/fireantApi';

ChartJS.register(
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

interface MarketChartProps {
  data: MarketData[];
}

const MarketChart: React.FC<MarketChartProps> = ({ data }) => {
  // Lọc dữ liệu chỉ lấy 10 giờ gần nhất
  const now = new Date();
  const tenHoursAgo = new Date(now.getTime() - 10 * 60 * 60 * 1000);
  
  const filteredData = data.filter(item => 
    new Date(item.timestamp) >= tenHoursAgo
  );
  
  // Sắp xếp dữ liệu theo thời gian
  const sortedData = [...filteredData].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Chuẩn bị dữ liệu cho biểu đồ với định dạng thời gian đẹp hơn
  const chartData = {
    labels: sortedData.map(item => {
      const date = new Date(item.timestamp);
      return date.toLocaleTimeString('vi-VN', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
      });
    }),
    datasets: [
      {
        label: 'Hiệu số vốn hóa (Tăng - Giảm)',
        data: sortedData.map(item => item.difference),
        borderColor: (ctx: any) => {
          // Màu động dựa trên giá trị
          return 'rgb(75, 192, 192)';
        },
        backgroundColor: (ctx: any) => {
          return 'rgba(75, 192, 192, 0.1)';
        },
        fill: {
          target: 'origin',
          above: 'rgba(34, 197, 94, 0.1)',   // Màu xanh lá cho vùng dương
          below: 'rgba(239, 68, 68, 0.1)'    // Màu đỏ cho vùng âm
        },
        tension: 0.4,
        pointBackgroundColor: (ctx: any) => {
          const value = ctx.raw || 0;
          return value >= 0 ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)';
        },
        pointBorderColor: (ctx: any) => {
          const value = ctx.raw || 0;
          return value >= 0 ? 'rgb(22, 163, 74)' : 'rgb(220, 38, 38)';
        },
        pointRadius: 3,
        pointHoverRadius: 5,
        borderWidth: 2,
      },
    ],
  };



  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          font: {
            size: 12,
          },
        },
      },
      title: {
        display: true,
        text: 'Biểu đồ Hiệu số Vốn hóa Thị trường',
        font: {
          size: 16,
          weight: 'bold',
        },
      },
      tooltip: {
        callbacks: {
          title: function(context) {
            const index = context[0].dataIndex;
            const data = sortedData[index];
            const date = new Date(data.timestamp);
            return date.toLocaleString('vi-VN');
          },
          label: function(context) {
            const value = context.parsed.y;
            const sign = value >= 0 ? '+' : '';
            return `Hiệu số: ${sign}${value.toFixed(2)} tỷ đồng`;
          },
          afterLabel: function(context) {
            const index = context.dataIndex;
            const data = sortedData[index];
            return [
              `Vốn hóa tăng: ${data.upCapitalization.toLocaleString('vi-VN')} tỷ`,
              `Vốn hóa giảm: ${data.downCapitalization.toLocaleString('vi-VN')} tỷ`
            ];
          }
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Thời gian (mỗi 15 phút)',
          font: {
            size: 12,
            weight: 'bold',
          },
        },
        ticks: {
          maxRotation: 45,
          minRotation: 0,
          autoSkip: false,
          callback: function(value, index) {
            const labels = this.chart.data.labels as string[];
            const label = labels[index];
            if (!label) return '';
            
            const time = label.split(':');
            const minutes = parseInt(time[1]);
            // Chỉ hiển thị mốc 15 phút: 00, 15, 30, 45
            if (minutes % 15 === 0) {
              return label;
            }
            return '';
          },
          font: {
            size: 10,
          },
        },
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.05)',
        },
      },
      y: {
        title: {
          display: true,
          text: 'Giá trị (Tỷ đồng)',
          font: {
            size: 12,
            weight: 'bold',
          },
        },
        position: 'left',
        grid: {
          color: (context) => {
            if (Math.abs(context.tick.value) < 0.1) {
              return 'rgba(0, 0, 0, 0.8)'; // Đường trục 0 đậm hơn
            }
            return 'rgba(0, 0, 0, 0.1)';
          },
          lineWidth: (context) => {
            return Math.abs(context.tick.value) < 0.1 ? 3 : 1; // Đường trục 0 dày hơn
          },
        },
        ticks: {
          callback: function(value) {
            const num = Number(value);
            if (Math.abs(num) < 0.1) {
              return '0';
            }
            // Hiển thị với đơn vị nghìn tỷ cho số lớn
            if (Math.abs(num) >= 1000) {
              return `${num > 0 ? '+' : ''}${(num/1000).toFixed(1)}k`;
            }
            return `${num > 0 ? '+' : ''}${num.toFixed(0)}`;
          },
          font: {
            size: 10,
          },
        },
      },
    },
    elements: {
      line: {
        borderWidth: 2,
      },
      point: {
        hoverRadius: 6,
      },
    },
    interaction: {
      intersect: false,
      mode: 'index',
    },
  };

  return (
    <div style={{ height: '700px', width: '100%' }}>
      <Line data={chartData} options={options} />
    </div>
  );
};

export default MarketChart;