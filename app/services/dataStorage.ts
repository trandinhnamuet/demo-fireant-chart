import { MarketData } from './fireantApi';
import fs from 'fs';
import path from 'path';

class DataStorageService {
  private dataFilePath = path.join(process.cwd(), 'market-data.txt');

  async saveData(data: MarketData): Promise<void> {
    try {
      const dataLine = JSON.stringify(data) + '\n';
      
      // Append data to file
      if (typeof window === 'undefined') { // Server-side only
        fs.appendFileSync(this.dataFilePath, dataLine);
      }
    } catch (error) {
      console.error('Error saving data:', error);
    }
  }

  async loadData(): Promise<MarketData[]> {
    try {
      if (typeof window === 'undefined') { // Server-side only
        if (!fs.existsSync(this.dataFilePath)) {
          return [];
        }

        const fileContent = fs.readFileSync(this.dataFilePath, 'utf-8');
        const lines = fileContent.trim().split('\n').filter(line => line.length > 0);
        
        return lines.map(line => {
          try {
            return JSON.parse(line);
          } catch {
            return null;
          }
        }).filter(data => data !== null);
      }
      
      return [];
    } catch (error) {
      console.error('Error loading data:', error);
      return [];
    }
  }

  async getRecentData(hours: number = 24): Promise<MarketData[]> {
    const allData = await this.loadData();
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    return allData.filter(data => new Date(data.timestamp) > cutoffTime);
  }
}

export const dataStorage = new DataStorageService();