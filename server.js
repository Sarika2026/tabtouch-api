await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForSelector('.race-runner-card', { timeout: 15000 });

const horses = await page.evaluate(() => {
  const cards = Array.from(document.querySelectorAll('.race-runner-card'));
  return cards.map(card => {
    return {
      J: card.querySelector('.runner-number')?.innerText?.trim() || "-", 
      K: card.querySelector('.runner-name a')?.innerText?.trim() || "-",   
      L: card.querySelector('.jockey-name')?.innerText?.trim() || "-", 
      N: card.querySelector('.barrier')?.innerText?.replace('Barrier','').trim() || "-", 
      M: card.querySelector('.price')?.innerText?.trim() || "-" 
    };
  });
});
