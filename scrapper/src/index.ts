import * as readline from 'readline';
import { config } from './config/config.js';
import { PostgresProductRepository } from './adapters/PostgresProductRepository.js';
import { PuppeteerScraper } from './adapters/PuppeteerScraper.js';
import { ProductScraperService } from './services/ProductScraperService.js';

type ScraperMode = 'scrap' | 'check';

function getTypeFromArgs(): ScraperMode | null {
  const args = process.argv.slice(2);
  const typeArg = args.find(arg => arg.startsWith('type='));

  if (typeArg) {
    const value = typeArg.split('=')[1]?.toLowerCase();
    if (value === 'scrap' || value === 'check') {
      return value;
    }
  }

  return null;
}

async function askUserForMode(): Promise<ScraperMode> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    console.log('\n=== Modo de Operação ===');
    console.log('1. scrap  - Buscar produtos da página inicial e verificar remoções');
    console.log('2. check  - Atualizar preços de todos os produtos do banco');
    console.log('');

    rl.question('Escolha o modo (scrap/check): ', (answer) => {
      rl.close();
      const mode = answer.toLowerCase().trim();

      if (mode === 'scrap' || mode === 'check') {
        resolve(mode);
      } else {
        console.log('\nOpção inválida! Usando modo "scrap" por padrão.\n');
        resolve('scrap');
      }
    });
  });
}

async function main() {
  let mode = getTypeFromArgs();

  if (!mode) {
    mode = await askUserForMode();
  }

  console.log(`\n=== Modo: ${mode.toUpperCase()} ===\n`);
  console.log('Configuração:');
  console.log(`- URL Base: ${config.scraping.baseUrl}`);
  console.log(`- Produtos para processar: ${config.scraping.initialProductsLimit}`);
  console.log(`- Headless: ${config.browser.headless}`);
  console.log(`- Database: ${config.database.host}:${config.database.port}/${config.database.database}`);
  console.log(`- HTML Snapshots: ./htmls-snapshot/\n`);

  const postgresRepo = new PostgresProductRepository(config.database);
  const scraper = new PuppeteerScraper(config);
  const service = new ProductScraperService(
    scraper,
    [postgresRepo],
    config
  );

  try {
    if (mode === 'scrap') {
      await service.runScrapMode();
    } else {
      await service.runCheckMode();
    }
  } catch (error) {
    console.error('Erro fatal:', error);
    process.exit(1);
  }
}

main();
