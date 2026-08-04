app.post("/api/tabtouch", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ ok: false, error: "Missing url" });

  let browser;
  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1366, height: 768 });

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 });
    
    // Wait for page to load JS
    await new Promise(r => setTimeout(r, 5000));
    
    // Scroll to force load
    await page.evaluate(() => window.scrollBy(0, 1000));
    await new Promise(r => setTimeout(r, 3000));

    // DEBUG: Save screenshot so we can see what Render sees
    await page.screenshot({ path: 'debug.png' });

    // Try multiple selectors Tabtouch uses
    await page.waitForSelector('.race-runner-card, .runner-card, [data-testid="runner-card"]', { timeout: 20000 });

    const horses = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.race-runner-card, .runner-card, [data-testid="runner-card"]'));
      return cards.map(card => {
        return {
          J: card.querySelector('.runner-number, .number')?.innerText?.trim() || "-", 
          K: card.querySelector('.runner-name a, .name')?.innerText?.trim() || "-",   
          L: card.querySelector('.jockey-name, .jockey')?.innerText?.trim() || "-", 
          N: card.querySelector('.barrier, .bar')?.innerText?.replace('Barrier','').trim() || "-", 
          M: card.querySelector('.price, .odds')?.innerText?.trim() || "-" 
        };
      });
    });

    res.json({ ok: true, horses });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  } finally {
    if (browser) await browser.close();
  }
});
