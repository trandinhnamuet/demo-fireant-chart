import { NextRequest, NextResponse } from 'next/server';
import { fireantApi } from '../../services/fireantApi';
import { dataStorage } from '../../services/dataStorage';

export async function GET() {
  try {
    // Lấy dữ liệu từ API
    const marketData = await fireantApi.getMarketOverview();
    
    if (marketData) {
      // Lưu dữ liệu vào file
      await dataStorage.saveData(marketData);
    }

    // Trả về dữ liệu gần đây (24 giờ qua)
    const recentData = await dataStorage.getRecentData(24);

    return NextResponse.json({
      success: true,
      data: recentData,
      latest: marketData
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch market data' },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    // Force update - gọi API và lưu dữ liệu mới
    const marketData = await fireantApi.getMarketOverview();
    
    if (marketData) {
      await dataStorage.saveData(marketData);
      return NextResponse.json({
        success: true,
        message: 'Data updated successfully',
        data: marketData
      });
    }

    return NextResponse.json(
      { success: false, error: 'Failed to get market data' },
      { status: 500 }
    );
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update market data' },
      { status: 500 }
    );
  }
}