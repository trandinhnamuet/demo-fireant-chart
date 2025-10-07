import { NextRequest, NextResponse } from 'next/server';
import { dataStorage } from '../../services/dataStorage';

export async function GET(request: NextRequest) {
  try {
    // Lấy query parameters
    const { searchParams } = new URL(request.url);
    const hours = parseInt(searchParams.get('hours') || '24');
    
    // Lấy dữ liệu từ file
    const data = await dataStorage.getRecentData(hours);
    
    return NextResponse.json({
      success: true,
      count: data.length,
      data: data
    });
  } catch (error) {
    console.error('Error reading data file:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to read data file' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    // Xóa file dữ liệu (reset)
    const fs = require('fs');
    const path = require('path');
    const dataFilePath = path.join(process.cwd(), 'market-data.txt');
    
    if (fs.existsSync(dataFilePath)) {
      fs.unlinkSync(dataFilePath);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Data file cleared successfully'
    });
  } catch (error) {
    console.error('Error clearing data file:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to clear data file' },
      { status: 500 }
    );
  }
}