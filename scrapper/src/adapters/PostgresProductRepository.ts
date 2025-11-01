import pgPromise from 'pg-promise';
import { Product } from '../domain/Product.js';
import { ProductCheck } from '../domain/ProductCheck.js';
import { ProductRepository } from '../ports/ProductRepository.js';
import { Config } from '../config/config.js';

const pgp = pgPromise();

export class PostgresProductRepository implements ProductRepository {
  private db: pgPromise.IDatabase<any>;

  constructor(config: Config['database']) {
    this.db = pgp({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
    });
  }

  async saveProduct(product: Product): Promise<void> {
    await this.db.none(
      `INSERT INTO products (url, title, removed_at, last_checked)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (url)
       DO UPDATE SET
         title = EXCLUDED.title,
         removed_at = EXCLUDED.removed_at,
         last_checked = NOW()`,
      [product.url, product.title, product.removedAt]
    );
  }

  async saveProducts(products: Product[]): Promise<void> {
    if (products.length === 0) return;

    const values = products.map(p => ({
      url: p.url,
      title: p.title,
      removed_at: p.removedAt,
    }));

    const cs = new pgp.helpers.ColumnSet(
      ['url', 'title', 'removed_at'],
      { table: 'products' }
    );

    const query =
      pgp.helpers.insert(values, cs) +
      ` ON CONFLICT (url) DO UPDATE SET
        title = EXCLUDED.title,
        removed_at = EXCLUDED.removed_at,
        last_checked = NOW()`;

    await this.db.none(query);
  }

  async saveProductCheck(check: ProductCheck): Promise<void> {
    await this.db.none(
      `INSERT INTO product_checks (
        product_url,
        checked_at,
        price,
        original_price,
        has_promotion,
        discount_percentage,
        in_stock,
        rating,
        review_count,
        additional_data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        check.productUrl,
        check.checkedAt,
        check.price,
        check.originalPrice,
        check.hasPromotion,
        check.discountPercentage,
        check.inStock,
        check.rating,
        check.reviewCount,
        JSON.stringify(check.additionalData),
      ]
    );
  }

  async productExists(url: string): Promise<boolean> {
    const result = await this.db.oneOrNone(
      'SELECT 1 FROM products WHERE url = $1',
      [url]
    );
    return result !== null;
  }

  async getAllProducts(): Promise<Product[]> {
    const rows = await this.db.any('SELECT url, title, removed_at FROM products');
    return rows.map(row => new Product(row.url, row.title, row.removed_at));
  }

  async getAvailableProducts(): Promise<Product[]> {
    const rows = await this.db.any('SELECT url, title, removed_at FROM products WHERE removed_at IS NULL');
    return rows.map(row => new Product(row.url, row.title, null));
  }

  async markAsRemoved(url: string): Promise<void> {
    await this.db.none(
      'UPDATE products SET removed_at = NOW(), last_checked = NOW() WHERE url = $1',
      [url]
    );
  }

  async markAsAvailable(url: string): Promise<void> {
    await this.db.none(
      'UPDATE products SET removed_at = NULL, last_checked = NOW() WHERE url = $1',
      [url]
    );
  }

  async close(): Promise<void> {
    await this.db.$pool.end();
  }
}
