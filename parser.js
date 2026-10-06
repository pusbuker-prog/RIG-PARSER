const puppeteer = require('puppeteer');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

async function newBrowser() {
  return puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
      '--window-size=1366,900'
    ]
  });
}

async function newPage(browser) {
  const page = await browser.newPage();
  await page.setUserAgent(UA);
  await page.setViewport({ width: 1366, height: 900 });
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8'
  });
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    Object.defineProperty(navigator, 'languages', { get: () => ['ru-RU','ru','en-US','en'] });
    Object.defineProperty(navigator, 'plugins', { get: () => [1,2,3,4,5] });
  });
  return page;
}

function normalize(str) {
  return String(str || '')
    .replace(/\s+/g, ' ')
    .replace(/[^\wа-яА-Я0-9+ .\-/]/g, '')
    .trim();
}

function extractPrice(text) {
  if (!text) return null;
  const m = String(text).replace(/\s/g, '').match(/(\d{3,9})/);
  return m ? parseInt(m[1], 10) : null;
}
async function parseRegard(models) {
  const browser = await newBrowser();
  const page = await newPage(browser);
  const results = {};

  try {
    for (const model of models) {
      const query = encodeURIComponent(model);
      const url = `https://www.regard.ru/catalog?search=${query}`;
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForSelector('body', { timeout: 10000 });
        await new Promise(r => setTimeout(r, 1500));

        const items = await page.evaluate(() => {
          const out = [];
          const cards = document.querySelectorAll('article, .card, .product, [class*="product"]');
          cards.forEach(card => {
            const titleEl = card.querySelector('a[href*="/product"], h3, h2, .title, [class*="name"]');
            const priceEl = card.querySelector('[class*="price"], .price, [itemprop="price"]');
            if (titleEl && priceEl) {
              out.push({
                title: titleEl.textContent.trim(),
                price: priceEl.textContent.trim()
              });
            }
          });
          return out;
        });

        const found = items.find(it => it.title.toLowerCase().includes(model.toLowerCase().split(' ')[0]));
        if (found) {
          const price = extractPrice(found.price);
          if (price) results[model] = { new: price, used: Math.round(price * 0.65), source: 'regard' };
        }
      } catch (e) {
        console.error('Regard error for', model, e.message);
      }
    }
  } finally {
    await browser.close();
  }

  return results;
}
async function parseDNS(models) {
  const browser = await newBrowser();
  const page = await newPage(browser);
  const results = {};

  try {
    for (const model of models) {
      const query = encodeURIComponent(model);
      const url = `https://www.dns-shop.ru/search/?q=${query}`;
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await new Promise(r => setTimeout(r, 3000));

        const items = await page.evaluate(() => {
          const out = [];
          const cards = document.querySelectorAll('[data-id="product"], .catalog-product, .product-card');
          cards.forEach(card => {
            const titleEl = card.querySelector('.catalog-product__name, [class*="name"]');
            const priceEl = card.querySelector('.product-buy__price, [class*="price"]');
            if (titleEl && priceEl) {
              out.push({
                title: titleEl.textContent.trim(),
                price: priceEl.textContent.trim()
              });
            }
          });
          return out;
        });

        const found = items.find(it => it.title.toLowerCase().includes(model.toLowerCase().split(' ')[0]));
        if (found) {
          const price = extractPrice(found.price);
          if (price) results[model] = { new: price, used: Math.round(price * 0.6), source: 'dns' };
        }
      } catch (e) {
        console.error('DNS error for', model, e.message);
      }
    }
  } finally {
    await browser.close();
  }

  return results;
}
async function parseAvito(models) {
  const browser = await newBrowser();
  const page = await newPage(browser);
  const results = {};

  try {
    for (const model of models) {
      const query = encodeURIComponent(model);
      const url = `https://www.avito.ru/rossiya?q=${query}`;
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await new Promise(r => setTimeout(r, 3000));

        const items = await page.evaluate(() => {
          const out = [];
          const cards = document.querySelectorAll('[data-marker="item"]');
          cards.forEach(card => {
            const titleEl = card.querySelector('[itemprop="name"], h3');
            const priceEl = card.querySelector('[itemprop="price"], [data-marker="item-price"]');
            if (titleEl && priceEl) {
              out.push({
                title: titleEl.textContent.trim(),
                price: priceEl.getAttribute('content') || priceEl.textContent.trim()
              });
            }
          });
          return out;
        });

        const found = items.find(it => it.title.toLowerCase().includes(model.toLowerCase().split(' ')[0]));
        if (found) {
          const price = extractPrice(found.price);
          if (price) results[model] = { used: price, new: Math.round(price * 1.5), source: 'avito' };
        }
      } catch (e) {
        console.error('Avito error for', model, e.message);
      }
    }
  } finally {
    await browser.close();
  }

  return results;
}

async function parseAll(models) {
  const out = {};
  console.log('Parsing Regard...');
  Object.assign(out, await parseRegard(models));
  console.log('Parsing DNS...');
  Object.assign(out, await parseDNS(models));
  console.log('Parsing Avito...');
  Object.assign(out, await parseAvito(models));
  return out;
}

module.exports = { parseAll };
