'use client';

import React from 'react';
import MarketChart from './components/MarketChart';

export default function Home() {
  return (
    <main className="container mx-auto p-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Biểu đồ Hiệu số Vốn hóa (Sàn HSX/HOSE)</h1>
        <p className="text-gray-600 mb-4">
          Dữ liệu: <b>Hiệu số vốn hóa</b> giữa các mã cổ phiếu <b>tăng giá</b> và <b>giảm giá</b> trên <b>sàn HSX (HOSE)</b>.<br/>
          Nguồn: Dữ liệu được thu thập bằng Python từ FireAnt và cập nhật mỗi 10 giây.<br/>
          <span className="text-xs text-gray-500">(Vốn hóa = tổng giá trị thị trường của các mã tăng/giảm trên HSX)</span>
        </p>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-lg">
        <MarketChart />
        <div className="mt-4 text-sm text-gray-500">
          <p>• <b>Dữ liệu:</b> Hiệu số vốn hóa (tăng - giảm) của các mã cổ phiếu trên <b>sàn HSX (HOSE)</b></p>
          <p>• <b>Cập nhật:</b> Tự động mỗi 10 giây từ Python backend, có thể kéo và zoom để xem chi tiết</p>
          <p>• <b>Thao tác:</b> Kéo chuột để pan, lăn chuột/pinch để zoom theo trục thời gian</p>
          <p>• <b>Trục ngang:</b> Thời gian (mỗi 10 giây), hiển thị HH:mm tại mỗi phút</p>
          <p>• <b>Trục dọc:</b> Giá trị hiệu số (tỷ đồng)</p>
          <p>• <b>Điểm xanh:</b> Giá trị dương (vốn hóa tăng &gt; giảm)</p>
          <p>• <b>Điểm đỏ:</b> Giá trị âm (vốn hóa tăng &lt; giảm)</p>
          <p>• <b>Vùng tô màu:</b> Xanh cho vùng dương, đỏ cho vùng âm</p>
        </div>
      </div>
    </main>
  );
}