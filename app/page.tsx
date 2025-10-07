'use client';


import React, { useState, useEffect, useCallback } from 'react';
import MarketChart from './components/MarketChart';
import { MarketData } from './services/fireantApi';

export default function Home() {
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);


  // Lấy lịch sử từ localStorage
  const getHistory = (): MarketData[] => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem('marketDataHistory');
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  };

  // Lưu lịch sử vào localStorage
  const saveHistory = (history: MarketData[]) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('marketDataHistory', JSON.stringify(history));
  };

  // Lấy data mới và lưu vào localStorage
  const fetchData = useCallback(async () => {
    try {
      const response = await fetch('/api/market-data');
      const result = await response.json();
      if (result.success) {
        // Lấy lịch sử cũ, thêm data mới vào cuối (nếu khác timestamp)
        let history = getHistory();
        const latest = result.latest || result.data?.[result.data.length-1];
        if (latest && (!history.length || history[history.length-1].timestamp !== latest.timestamp)) {
          history = [...history, latest];
        }
        // Giữ tối đa 1000 điểm
        if (history.length > 1000) history = history.slice(history.length-1000);
        saveHistory(history);
        setMarketData(history);
        setLastUpdate(new Date());
        setError(null);
      } else {
        setError(result.error || 'Failed to fetch data');
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const forceUpdate = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/market-data', { method: 'POST' });
      const result = await response.json();
      if (result.success) {
        // Lấy lịch sử cũ, thêm data mới vào cuối (nếu khác timestamp)
        let history = getHistory();
        const latest = result.latest || result.data;
        if (latest && (!history.length || history[history.length-1].timestamp !== latest.timestamp)) {
          history = [...history, latest];
        }
        if (history.length > 1000) history = history.slice(history.length-1000);
        saveHistory(history);
        setMarketData(history);
        setLastUpdate(new Date());
        setError(null);
      } else {
        setError(result.error || 'Failed to update data');
        setLoading(false);
      }
    } catch (err) {
      setError('Network error occurred');
      setLoading(false);
    }
  };

  const clearDataFile = async () => {
    if (confirm('Bạn có chắc muốn xóa toàn bộ dữ liệu đã lưu?')) {
      saveHistory([]);
      setMarketData([]);
      alert('Đã xóa dữ liệu thành công');
    }
  };

  // Khi load trang, lấy lịch sử từ localStorage
  useEffect(() => {
    setMarketData(getHistory());
    fetchData();
  }, [fetchData]);

  // Set up interval to fetch data every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      forceUpdate();
    }, 10000);
    return () => clearInterval(interval);
  }, [forceUpdate]);

  const latestData = marketData[marketData.length - 1];

  return (
    <main className="container mx-auto p-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Biểu đồ Hiệu số Vốn hóa (Sàn HSX/HOSE)</h1>
        <p className="text-gray-600 mb-4">
          Dữ liệu: <b>Hiệu số vốn hóa</b> giữa các mã cổ phiếu <b>tăng giá</b> (~5.500 tỷ) và <b>giảm giá</b> (~15.600 tỷ) trên <b>sàn HSX (HOSE)</b>.<br/>
          Nguồn: Fireant (hoặc mô phỏng sát thực tế HSX nếu API lỗi).<br/>
          <span className="text-xs text-gray-500">(Vốn hóa = tổng giá trị thị trường của các mã tăng/giảm trên HSX, cập nhật mỗi 10 giây)</span>
        </p>
        
        <div className="flex flex-wrap gap-4 mb-4">
          <button
            onClick={forceUpdate}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Đang tải...' : 'Cập nhật ngay'}
          </button>
          
          <button
            onClick={clearDataFile}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Xóa dữ liệu
          </button>

          {/* Xuống dòng sau button xóa dữ liệu */}
          <div className="basis-full h-0"></div>

          {lastUpdate && (
            <div className="flex items-center text-sm text-gray-500">
              <span>Cập nhật lần cuối: {lastUpdate.toLocaleTimeString('vi-VN')}</span>
            </div>
          )}

          <div className="flex items-center text-sm text-blue-600">
            <span>Dữ liệu đã lưu: {marketData.length} điểm</span>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {latestData && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-green-100 p-4 rounded-lg">
              <h3 className="font-semibold text-green-800">Vốn hóa mã tăng</h3>
              <p className="text-2xl font-bold text-green-600">
                {latestData.upCapitalization.toLocaleString('vi-VN')} tỷ
              </p>
            </div>
            <div className="bg-red-100 p-4 rounded-lg">
              <h3 className="font-semibold text-red-800">Vốn hóa mã giảm</h3>
              <p className="text-2xl font-bold text-red-600">
                {latestData.downCapitalization.toLocaleString('vi-VN')} tỷ
              </p>
            </div>
            <div className={`p-4 rounded-lg ${latestData.difference >= 0 ? 'bg-blue-100' : 'bg-orange-100'}`}>
              <h3 className={`font-semibold ${latestData.difference >= 0 ? 'text-blue-800' : 'text-orange-800'}`}>
                Hiệu số
              </h3>
              <p className={`text-2xl font-bold ${latestData.difference >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                {latestData.difference >= 0 ? '+' : ''}{latestData.difference.toLocaleString('vi-VN')} tỷ
              </p>
            </div>
          </div>
        )}
      </div>

      {loading && marketData.length === 0 ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4">Đang tải dữ liệu...</p>
        </div>
      ) : marketData.length > 0 ? (
        <div className="bg-white p-4 rounded-lg shadow-lg">
          <MarketChart data={marketData} />
          <div className="mt-4 text-sm text-gray-500">
            <p>• <b>Dữ liệu:</b> Hiệu số vốn hóa (tăng - giảm) của các mã cổ phiếu trên <b>sàn HSX (HOSE)</b></p>
            <p>• <b>Cập nhật:</b> Tự động mỗi 10 giây, lưu lịch sử vào <b>trình duyệt của bạn (localStorage)</b></p>
            <p>• <b>Trục ngang:</b> Thời gian (HH:mm:ss)</p>
            <p>• <b>Trục dọc:</b> Giá trị hiệu số (tỷ đồng), Chart.js tự động co giãn phù hợp</p>
            <p>• <b>Điểm xanh:</b> Giá trị dương (vốn hóa tăng &gt; giảm)</p>
            <p>• <b>Điểm đỏ:</b> Giá trị âm (vốn hóa tăng &lt; giảm)</p>
            <p>• <b>Vùng tô màu:</b> Xanh cho vùng dương, đỏ cho vùng âm</p>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <p>Không có dữ liệu để hiển thị</p>
        </div>
      )}
    </main>
  );
}
