import { ProductCheckData } from '../domain/ProductCheck.js';

export interface ScrapedProduct {
  url: string;
  title: string;
}

export interface ScrapedProductDetails extends ProductCheckData {
  recommendedProducts: ScrapedProduct[];
}

export interface WebScraper {
  initialize(): Promise<void>;
  goToHomepage(): Promise<void>;
  getInitialProducts(limit: number): Promise<ScrapedProduct[]>;
  scrapeProductPage(url: string, maxRecommended: number): Promise<ScrapedProductDetails>;
  close(): Promise<void>;
}
