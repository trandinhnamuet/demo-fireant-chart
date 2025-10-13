import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'python-backend', 'chart-jsdata.json');
    
    // Kiểm tra file có tồn tại không
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Chart data file not found' 
      });
    }

    const fileContent = fs.readFileSync(filePath, 'utf8');
    const rawData = JSON.parse(fileContent);

    // Chuyển đổi dữ liệu thành format MarketData
    const marketData = rawData.map((item: any) => {
      // Parse các giá trị từ chuỗi
      const upMatch = item.data["-100,40"]?.match(/Tăng: ([\d,.]+) tỷ/);
      const downMatch = item.data["-20,40"]?.match(/Giảm: ([\d,.]+) tỷ/);
      
      const upCapitalization = upMatch ? parseFloat(upMatch[1].replace(',', '')) : 0;
      const downCapitalization = downMatch ? parseFloat(downMatch[1].replace(',', '')) : 0;
      const difference = upCapitalization - downCapitalization;

      return {
        timestamp: item.timestamp,
        upCapitalization,
        downCapitalization,
        difference
      };
    });

    return NextResponse.json({
      success: true,
      data: marketData,
      lastUpdate: new Date().toISOString(),
      count: marketData.length
    });

  } catch (error) {
    console.error('Error reading chart data:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to read chart data' 
    });
  }
}