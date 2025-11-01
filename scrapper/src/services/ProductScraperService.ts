import { Product } from '../domain/Product.js';
import { ProductCheck } from '../domain/ProductCheck.js';
import { ProductRepository } from '../ports/ProductRepository.js';
import { WebScraper } from '../ports/WebScraper.js';
import { Config } from '../config/config.js';

export class ProductScraperService {
  private totalProductsScraped = 0;

  constructor(
    private scraper: WebScraper,
    private repositories: ProductRepository[],
    private config: Config
  ) {}

  async runScrapMode(): Promise<void> {
    try {
      console.log('=== Modo Scrap - Buscando Produtos da Homepage ===\n');

      await this.scraper.initialize();
      await this.scraper.goToHomepage();

      // Get products currently on homepage
      const currentProducts = await this.scraper.getInitialProducts(
        this.config.scraping.initialProductsLimit
      );

      console.log(`\nEncontrados ${currentProducts.length} produtos na página inicial\n`);

      const repoToCheck = this.repositories.length > 1 ? this.repositories[1] : this.repositories[0];

      // Get all available products from database (removedAt IS NULL)
      const availableProductsInDb = await repoToCheck.getAvailableProducts();
      const currentProductUrls = new Set(currentProducts.map(p => p.url));

      // Check for products that disappeared from homepage
      console.log('\n--- Verificando produtos removidos ---');
      let removedCount = 0;
      for (const dbProduct of availableProductsInDb) {
        if (!currentProductUrls.has(dbProduct.url)) {
          console.log(`  ⨯ Removido: ${dbProduct.title}`);
          await repoToCheck.markAsRemoved(dbProduct.url);
          removedCount++;
        }
      }
      if (removedCount === 0) {
        console.log('  Nenhum produto foi removido');
      }

      // Check for products that returned to homepage
      console.log('\n--- Verificando produtos que retornaram ---');
      const allProductsInDb = await repoToCheck.getAllProducts();
      const removedProductsInDb = allProductsInDb.filter(p => !p.isAvailable());
      let returnedCount = 0;
      for (const removedProduct of removedProductsInDb) {
        if (currentProductUrls.has(removedProduct.url)) {
          console.log(`  ↻ Retornou: ${removedProduct.title}`);
          await repoToCheck.markAsAvailable(removedProduct.url);
          returnedCount++;
        }
      }
      if (returnedCount === 0) {
        console.log('  Nenhum produto retornou');
      }

      // Process each product from homepage
      console.log('\n--- Processando produtos da homepage ---');
      for (let i = 0; i < currentProducts.length; i++) {
        const productData = currentProducts[i];
        this.totalProductsScraped++;

        console.log(`\n[${this.totalProductsScraped}/${currentProducts.length}] ${productData.title}`);

        try {
          const existsInDb = await repoToCheck.productExists(productData.url);

          if (existsInDb) {
            console.log(`  ○ Já existe no banco - apenas atualizando preço`);
          } else {
            console.log(`  + Novo produto - salvando`);
            const product = Product.fromScrapedData(productData);
            await this.saveToAllRepositories(product);
          }

          // Scrape product page to get details (price, rating, etc.)
          const details = await this.scraper.scrapeProductPage(productData.url, 0);

          // Save product check (price, etc.)
          const productCheck = new ProductCheck(productData.url, details);
          for (const repo of this.repositories) {
            await repo.saveProductCheck(productCheck);
          }

          console.log(`  ✓ Preço: €${details.price || 'N/A'}`);
          if (details.originalPrice) {
            console.log(`  ✓ Promoção: €${details.originalPrice} → €${details.price}`);
          }

        } catch (error) {
          console.error(`  ✗ Erro ao processar:`, error);
        }
      }

      console.log(`\n=== Scraping concluído ===`);
      console.log(`Produtos processados: ${this.totalProductsScraped}`);
      console.log(`Produtos removidos: ${removedCount}`);
      console.log(`Produtos que retornaram: ${returnedCount}`);

    } finally {
      await this.scraper.close();
      await this.closeAllRepositories();
    }
  }

  async runCheckMode(): Promise<void> {
    try {
      console.log('=== Modo Check - Atualizando Preços ===\n');

      await this.scraper.initialize();

      const repoToCheck = this.repositories.length > 1 ? this.repositories[1] : this.repositories[0];

      // Get all products from database
      const allProducts = await repoToCheck.getAllProducts();

      console.log(`\nEncontrados ${allProducts.length} produtos no banco de dados\n`);

      if (allProducts.length === 0) {
        console.log('Nenhum produto no banco. Execute primeiro no modo "scrap".\n');
        return;
      }

      let updatedCount = 0;
      let errorCount = 0;

      for (let i = 0; i < allProducts.length; i++) {
        const product = allProducts[i];
        this.totalProductsScraped++;

        console.log(`\n[${i + 1}/${allProducts.length}] ${product.title}`);
        console.log(`  URL: ${product.url}`);

        if (!product.isAvailable()) {
          console.log(`  ⊗ Produto removido (${product.removedAt}) - pulando`);
          continue;
        }

        try {
          // Scrape product page to get current details
          const details = await this.scraper.scrapeProductPage(product.url, 0);

          // Save product check (price, etc.)
          const productCheck = new ProductCheck(product.url, details);
          for (const repo of this.repositories) {
            await repo.saveProductCheck(productCheck);
          }

          updatedCount++;
          console.log(`  ✓ Preço atualizado: €${details.price || 'N/A'}`);
          if (details.originalPrice) {
            console.log(`  ✓ Promoção: €${details.originalPrice} → €${details.price}`);
          }

        } catch (error) {
          errorCount++;
          console.error(`  ✗ Erro ao processar:`, error);
        }
      }

      console.log(`\n=== Check concluído ===`);
      console.log(`Total de produtos no banco: ${allProducts.length}`);
      console.log(`Produtos atualizados: ${updatedCount}`);
      console.log(`Produtos removidos (pulados): ${allProducts.length - updatedCount - errorCount}`);
      console.log(`Erros: ${errorCount}`);

    } finally {
      await this.scraper.close();
      await this.closeAllRepositories();
    }
  }

  private async saveToAllRepositories(product: Product): Promise<void> {
    for (const repo of this.repositories) {
      await repo.saveProduct(product);
    }
  }

  private async closeAllRepositories(): Promise<void> {
    for (const repo of this.repositories) {
      await repo.close();
    }
  }
}
