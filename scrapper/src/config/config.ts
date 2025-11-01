import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';

dotenvConfig({ path: resolve(process.cwd(), '../.env') });

export interface Config {
  scraping: {
    baseUrl: string;
    initialProductsLimit: number;
  };
  browser: {
    headless: boolean;
    timeout: number;
    waitAfterLoad: number;
    waitAfterCookie: number;
  };
  database: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
  };
  output: {
    jsonFile: string;
  };
}

export const config: Config = {
  scraping: {
    baseUrl: process.env.WORTEN_BASE_URL || 'https://www.worten.pt',
    initialProductsLimit: parseInt(process.env.INITIAL_PRODUCTS_LIMIT || '10'),
  },
  browser: {
    headless: process.env.HEADLESS === 'true',
    timeout: parseInt(process.env.BROWSER_TIMEOUT || '60000'),
    waitAfterLoad: parseInt(process.env.WAIT_AFTER_LOAD || '3000'),
    waitAfterCookie: parseInt(process.env.WAIT_AFTER_COOKIE || '10000'),
  },
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'worten_scraper',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  },
  output: {
    jsonFile: process.env.JSON_OUTPUT_FILE || './products.json',
  },
};
