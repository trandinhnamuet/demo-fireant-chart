'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
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
import zoomPlugin from 'chartjs-plugin-zoom';
import { Line } from 'react-chartjs-2';
import { MarketData } from '../services/fireantApi';

ChartJS.register(
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  zoomPlugin
);

interface MarketChartProps {
  onLoadMoreData?: (startTime: Date, endTime: Date) => Promise<MarketData[]>;
}

const MarketChart: React.FC<MarketChartProps> = ({ onLoadMoreData }) => {
  const chartRef = useRef<any>(null);
  const [allData, setAllData] = useState<MarketData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [earliestTime, setEarliestTime] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Hàm fetch dữ liệu từ chart-data API
  const fetchChartData = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/chart-data');
      const result = await response.json();
      
      if (result.success) {
        setAllData(result.data);
        setError(null);
        setLastUpdate(new Date());
        
        if (result.data.length > 0) {
          const sorted = [...result.data].sort((a, b) => 
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
          setEarliestTime(new Date(sorted[0].timestamp));
        }
      } else {
        setError(result.error || 'Failed to fetch chart data');
      }
    } catch (error) {
      console.error('Error fetching chart data:', error);
      setError('Network error occurred');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch dữ liệu lần đầu khi component mount
  useEffect(() => {
    fetchChartData();
  }, [fetchChartData]);

  // Auto-refresh mỗi 10 giây
  useEffect(() => {
    const interval = setInterval(() => {
      fetchChartData();
    }, 10000); // 10 giây

    return () => clearInterval(interval);
  }, [fetchChartData]);

  // Hàm tải thêm dữ liệu quá khứ
  const loadMoreHistoricalData = useCallback(async () => {
    if (!onLoadMoreData || !earliestTime || isLoading) return;

    setIsLoading(true);
    try {
      // Lấy dữ liệu 1 ngày trước thời điểm sớm nhất hiện tại
      const endTime = new Date(earliestTime.getTime() - 1000); // 1 giây trước
      const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000); // 24 giờ trước
      
      const newData = await onLoadMoreData(startTime, endTime);
      
      if (newData.length > 0) {
        setAllData(prev => {
          const combined = [...newData, ...prev];
          const sorted = combined.sort((a, b) => 
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
          // Loại bỏ trùng lặp
          const unique = sorted.filter((item, index, arr) => 
            index === 0 || new Date(item.timestamp).getTime() !== new Date(arr[index - 1].timestamp).getTime()
          );
          return unique;
        });
        
        // Cập nhật thời điểm sớm nhất
        const newEarliest = new Date(Math.min(...newData.map(d => new Date(d.timestamp).getTime())));
        setEarliestTime(newEarliest);
      }
    } catch (error) {
      console.error('Error loading more data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [onLoadMoreData, earliestTime, isLoading]);

  // Sắp xếp dữ liệu theo thời gian
  const sortedData = [...allData].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Tạo data points với interval 10 giây
  const createDataPoints = useCallback(() => {
    if (sortedData.length === 0) return [];

    const now = new Date();
    const startTime = new Date(sortedData[0].timestamp);
    const points: { time: Date; data?: MarketData }[] = [];

    // Tạo các mốc thời gian 10 giây
    for (let time = new Date(startTime); time <= now; time = new Date(time.getTime() + 10000)) {
      // Tìm data point gần nhất trong khoảng 10 giây
      const nearestData = sortedData.find(d => {
        const dataTime = new Date(d.timestamp);
        return Math.abs(dataTime.getTime() - time.getTime()) <= 5000; // ±5 giây
      });
      
      points.push({ time: new Date(time), data: nearestData });
    }

    return points;
  }, [sortedData]);

  const dataPoints = createDataPoints();

  // Chuẩn bị dữ liệu cho biểu đồ
  const chartData = {
    labels: dataPoints.map((point: { time: Date; data?: MarketData }) => {
      return point.time.toLocaleTimeString('vi-VN', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
      });
    }),
    datasets: [
      {
        label: 'Hiệu số vốn hóa (Tăng - Giảm)',
        data: dataPoints.map((point: { time: Date; data?: MarketData }) => point.data?.difference || null),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.1)',
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
        pointRadius: 1,
        pointHoverRadius: 5,
        borderWidth: 2,
        spanGaps: true, // Nối các điểm có giá trị null
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
          title: function(context: any) {
            const index = context[0].dataIndex;
            const point = dataPoints[index];
            if (point?.data) {
              const date = new Date(point.data.timestamp);
              return date.toLocaleString('vi-VN');
            }
            return point?.time.toLocaleString('vi-VN') || '';
          },
          label: function(context: any) {
            const value = context.parsed.y;
            if (value === null) return 'Không có dữ liệu';
            const sign = value >= 0 ? '+' : '';
            return `Hiệu số: ${sign}${value.toFixed(2)} tỷ đồng`;
          },
          afterLabel: function(context: any) {
            const index = context.dataIndex;
            const point = dataPoints[index];
            if (!point?.data) return ['Không có dữ liệu chi tiết'];
            return [
              `Vốn hóa tăng: ${point.data.upCapitalization.toLocaleString('vi-VN')} tỷ`,
              `Vốn hóa giảm: ${point.data.downCapitalization.toLocaleString('vi-VN')} tỷ`
            ];
          }
        },
      },
      zoom: {
        pan: {
          enabled: true,
          mode: 'x' as const,
          threshold: 10,
          onPanComplete: ({ chart }: any) => {
            // Kiểm tra nếu đã pan về phía trái (quá khứ) và gần đến đầu dữ liệu
            const scales = chart.scales;
            const xScale = scales.x;
            if (xScale && xScale.min <= 50 && onLoadMoreData) {
              loadMoreHistoricalData();
            }
          },
        },
        zoom: {
          wheel: {
            enabled: true,
          },
          pinch: {
            enabled: true,
          },
          mode: 'x' as const,
          onZoomComplete: ({ chart }: any) => {
            // Kiểm tra nếu zoom out và gần đến đầu dữ liệu
            const scales = chart.scales;
            const xScale = scales.x;
            if (xScale && xScale.min <= 50 && onLoadMoreData) {
              loadMoreHistoricalData();
            }
          },
        },
        limits: {
          x: {
            min: 0,
            max: 'original' as const,
          },
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Thời gian (mỗi 10 giây)',
          font: {
            size: 12,
            weight: 'bold',
          },
        },
        ticks: {
          maxRotation: 45,
          minRotation: 0,
          autoSkip: true,
          maxTicksLimit: 20,
          callback: function(value: any, index: number) {
            const labels = this.chart.data.labels as string[];
            const label = labels[index];
            if (!label) return '';
            
            // Hiển thị mỗi phút (tại giây :00)
            if (label.endsWith(':00')) {
              return label.substring(0, 5); // Chỉ hiển thị HH:MM
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
    interaction: {
      intersect: false,
      mode: 'index',
    },
  };

  return (

    <div style={{ height: '750px', width: '100%' }}>
      {/* Latest node data display */}
      {allData.length > 0 && (() => {
        // Find the latest data node by timestamp
        const latest = [...allData].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()).at(-1);
        if (!latest) return null;
        return (
          <div style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: '30px',
            padding: '12px 18px',
            background: '#e6f7ff',
            borderRadius: '6px',
            marginBottom: '12px',
            fontSize: '15px',
            fontWeight: 500,
            color: '#222'
          }}>
            <span>🕒 <b>{new Date(latest.timestamp).toLocaleString('vi-VN')}</b></span>
            <span style={{ color: '#22c55e' }}>Vốn hóa tăng: <b>{latest.upCapitalization.toLocaleString('vi-VN')}</b> tỷ</span>
            <span style={{ color: '#ef4444' }}>Vốn hóa giảm: <b>{latest.downCapitalization.toLocaleString('vi-VN')}</b> tỷ</span>
            <span style={{ color: latest.difference >= 0 ? '#22c55e' : '#ef4444' }}>
              Hiệu số: <b>{latest.difference >= 0 ? '+' : ''}{latest.difference.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b> tỷ
            </span>
          </div>
        );
      })()}

      {/* Status bar */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        padding: '10px',
        background: '#f5f5f5',
        borderRadius: '4px',
        marginBottom: '10px',
        fontSize: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <span style={{ 
            color: isLoading ? '#ffa500' : '#28a745',
            fontWeight: 'bold'
          }}>
            {isLoading ? '🔄 Đang cập nhật...' : '✅ Dữ liệu mới nhất'}
          </span>
          {lastUpdate && (
            <span style={{ color: '#666' }}>
              Cập nhật: {lastUpdate.toLocaleTimeString('vi-VN')}
            </span>
          )}
          <span style={{ color: '#007bff' }}>
            Tổng: {allData.length} điểm dữ liệu
          </span>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={fetchChartData}
            disabled={isLoading}
            style={{
              padding: '5px 10px',
              backgroundColor: isLoading ? '#ccc' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isLoading ? 'default' : 'pointer',
              fontSize: '12px'
            }}
          >
            {isLoading ? 'Đang tải...' : 'Làm mới'}
          </button>
          <button 
            onClick={() => chartRef.current?.resetZoom()}
            style={{
              padding: '5px 10px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            Reset Zoom
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div style={{
          padding: '10px',
          background: '#ffe6e6',
          color: '#d63384',
          borderRadius: '4px',
          marginBottom: '10px',
          fontSize: '14px'
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Instructions */}
      <div style={{ marginBottom: '10px' }}>
        <span style={{ fontSize: '12px', color: '#666' }}>
          💡 Kéo chuột để pan, lăn chuột để zoom. Dữ liệu tự động cập nhật mỗi 10 giây từ Python backend.
        </span>
      </div>

      {/* Chart */}
      {allData.length > 0 ? (
        <Line ref={chartRef} data={chartData} options={options} />
      ) : (
        <div style={{ 
          height: '400px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          background: '#f8f9fa',
          borderRadius: '4px',
          color: '#666'
        }}>
          {isLoading ? '🔄 Đang tải dữ liệu...' : '📊 Chưa có dữ liệu để hiển thị'}
        </div>
      )}
    </div>
  );
};

export default MarketChart;