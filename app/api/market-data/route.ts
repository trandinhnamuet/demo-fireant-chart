
import { NextRequest, NextResponse } from 'next/server';
import { fireantApi } from '../../services/fireantApi';

export async function GET() {
  try {
    // Lấy dữ liệu từ API
    const marketData = await fireantApi.getMarketOverview();
    if (marketData) {
      return NextResponse.json({
        success: true,
        data: [marketData],
        latest: marketData
      });
    }
    return NextResponse.json(
      { success: false, error: 'Failed to fetch market data' },
      { status: 500 }
    );
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
    // Force update - chỉ lấy dữ liệu mới nhất từ API
    const marketData = await fireantApi.getMarketOverview();
    if (marketData) {
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