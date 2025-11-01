import puppeteer, { Browser, Page } from 'puppeteer';
import { WebScraper, ScrapedProduct, ScrapedProductDetails } from '../ports/WebScraper.js';
import { Config } from '../config/config.js';
import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class PuppeteerScraper implements WebScraper {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private config: Config['browser'] & Config['scraping'];
  private cookiesAccepted: boolean = false;
  private snapshotDir: string = './htmls-snapshot';

  constructor(config: Config) {
    this.config = { ...config.browser, ...config.scraping };
    this.ensureSnapshotDir();
  }

  private ensureSnapshotDir(): void {
    if (!existsSync(this.snapshotDir)) {
      mkdirSync(this.snapshotDir, { recursive: true });
    }
  }

  private async saveHtmlSnapshot(url: string): Promise<void> {
    if (!this.page) return;

    try {
      const html = await this.page.content();

      const urlObj = new URL(url);
      const filename = urlObj.pathname
        .replace(/^\//, '')
        .replace(/\//g, '_')
        .replace(/[^a-z0-9_-]/gi, '_')
        + '.html';

      const filepath = join(this.snapshotDir, filename);
      writeFileSync(filepath, html, 'utf-8');
      console.log(`  📄 HTML salvo: ${filename}`);
    } catch (error) {
      console.error(`  Erro ao salvar HTML:`, error);
    }
  }

  async initialize(): Promise<void> {
    console.log('Iniciando navegador...');

    this.browser = await puppeteer.launch({
      headless: this.config.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      ],
    });

    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1920, height: 1080 });
    await this.page.setExtraHTTPHeaders({
      'Accept-Language': 'pt-PT,pt;q=0.9',
    });
  }

  async goToHomepage(): Promise<void> {
    if (!this.page) throw new Error('Scraper não inicializado');

    console.log(`Acessando ${this.config.baseUrl}...`);
    await this.page.goto(this.config.baseUrl, {
      waitUntil: 'networkidle2',
      timeout: this.config.timeout,
    });

    console.log(`Aguardando ${this.config.waitAfterLoad / 1000}s...`);
    await wait(this.config.waitAfterLoad);

    await this.acceptCookies();
    await this.scrollToBottom();

    await this.saveHtmlSnapshot(this.config.baseUrl);
  }

  private async acceptCookies(): Promise<void> {
    if (!this.page || this.cookiesAccepted) return;

    console.log('Tentando aceitar cookies...');
    try {
      const clicked = await this.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const btn = buttons.find(b => b.textContent?.includes('Aceitar cookies'));
        if (btn) {
          (btn as HTMLElement).click();
          return true;
        }
        return false;
      });

      if (clicked) {
        console.log(`Cookies aceitos! Aguardando ${this.config.waitAfterCookie / 1000}s...`);
        await wait(this.config.waitAfterCookie);
        this.cookiesAccepted = true;
      } else {
        console.log('Nenhum popup de cookies encontrado');
        this.cookiesAccepted = true;
      }
    } catch {
      console.log('Erro ao tentar aceitar cookies');
      this.cookiesAccepted = true;
    }
  }

  private async scrollToBottom(): Promise<void> {
    if (!this.page) return;

    console.log('Rolando a página até o final para carregar todos os produtos...');

    await this.page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        let totalHeight = 0;
        const distance = 100;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;

          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });

    console.log('Scroll completo! Aguardando carregamento final...');
    await wait(2000);
  }

  async getInitialProducts(limit: number): Promise<ScrapedProduct[]> {
    if (!this.page) throw new Error('Scraper não inicializado');

    console.log('Buscando produtos da página inicial...');

    const products = await this.page.evaluate(() => {
      const results: { url: string; title: string }[] = [];
      const links = document.querySelectorAll('a[href^="/produtos/"]');
      const seenUrls = new Set<string>();

      links.forEach((link) => {
        const href = link.getAttribute('href');
        if (!href || seenUrls.has(href)) return;

        const fullUrl = 'https://www.worten.pt' + href;
        seenUrls.add(href);

        const img = link.querySelector('img');
        const h3 = link.querySelector('h3');

        const title =
          img?.getAttribute('alt') ||
          h3?.textContent ||
          link.getAttribute('aria-label') ||
          '';

        if (title.trim()) {
          results.push({
            url: fullUrl,
            title: title.trim().replace(/\s+/g, ' '),
          });
        }
      });

      return results;
    });

    console.log(`Encontrados ${products.length} produtos`);
    return products.slice(0, limit);
  }

  async scrapeProductPage(url: string, maxRecommended: number): Promise<ScrapedProductDetails> {
    if (!this.page) throw new Error('Scraper não inicializado');

    console.log(`Acessando produto: ${url}`);

    await this.page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: this.config.timeout,
    });

    await wait(2000);

    await this.acceptCookies();

    await this.saveHtmlSnapshot(url);

    const details = await this.page.evaluate((): any => {
      const result: any = {
        recommendedProducts: [],
      };

      const priceElement = document.querySelector('[itemprop="price"]');
      if (priceElement) {
        const priceValue = priceElement.getAttribute('content');
        result.price = priceValue ? parseFloat(priceValue) : null;
      }

      const scratchedPrice = document.querySelector('.price__scratched-numbers .value');
      if (scratchedPrice) {
        const text = scratchedPrice.textContent?.trim();
        if (text) {
          result.originalPrice = parseFloat(text.replace(',', '.'));
        }
      }

      const ratingElement = document.querySelector('[aria-label*="Avaliação"]');
      if (ratingElement) {
        const ratingText = ratingElement.getAttribute('aria-label');
        const match = ratingText?.match(/(\d+)/);
        result.rating = match ? parseInt(match[1]) : null;
      }

      const reviewElement = document.querySelector('.rating__opinions span');
      if (reviewElement) {
        result.reviewCount = parseInt(reviewElement.textContent?.trim() || '0');
      }

      const recommendedContainer = document.querySelector('.related-cards__cards-container.grid');
      if (recommendedContainer) {
        const links = recommendedContainer.querySelectorAll('a[href^="/produtos/"]');
        const seenUrls = new Set<string>();

        links.forEach((link: Element) => {
          const href = link.getAttribute('href');
          if (!href || seenUrls.has(href)) return;

          const fullUrl = 'https://www.worten.pt' + href;
          seenUrls.add(href);

          const img = link.querySelector('img');
          const h3 = link.querySelector('h3');

          const title =
            img?.getAttribute('alt') ||
            h3?.textContent ||
            '';

          if (title.trim()) {
            result.recommendedProducts.push({
              url: fullUrl,
              title: title.trim().replace(/\s+/g, ' '),
            });
          }
        });
      }

      return result;
    });

    details.recommendedProducts = details.recommendedProducts.slice(0, maxRecommended);

    console.log(`  Preço: €${details.price || 'N/A'}`);
    console.log(`  Recomendados: ${details.recommendedProducts.length}`);

    return details;
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      console.log('Navegador fechado');
    }
  }
}
