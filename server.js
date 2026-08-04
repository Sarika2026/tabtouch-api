import express from "express";
import cors from "cors";
import puppeteer from "puppeteer";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => res.send("Tabtouch API is running"));

app.post("/api/tabtouch", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ ok: false, error: "Missing url" });

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

    // Wait for race data to load
    await page.waitForSelector('[data-testid="runner-card"]', { timeout: 15000 });

    const horses = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('[data-testid="runner-card"]'));
      return cards.map(card => {
        return {
          J: card.querySelector('.runner-number')?.innerText || "-", // Number
          K: card.querySelector('.runner-name')?.innerText || "-",   // Horse
          L: card.querySelector('.runner-jockey')?.innerText || "-", // Jockey
          N: card.querySelector('.runner-barrier')?.innerText || "-", // Barrier
          M: "-" // Odds - hidden without login
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("API running on " + PORT));
