import { Product } from '../domain/Product.js';
import { ProductCheck } from '../domain/ProductCheck.js';

export interface ProductRepository {
  saveProduct(product: Product): Promise<void>;
  saveProducts(products: Product[]): Promise<void>;
  saveProductCheck(check: ProductCheck): Promise<void>;
  productExists(url: string): Promise<boolean>;
  getAllProducts(): Promise<Product[]>;
  getAvailableProducts(): Promise<Product[]>;
  markAsRemoved(url: string): Promise<void>;
  markAsAvailable(url: string): Promise<void>;
  close(): Promise<void>;
}
