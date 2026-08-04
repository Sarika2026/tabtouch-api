import express from "express";
import cors from "cors";
import puppeteer from "puppeteer";

const app = express();
app.use(cors()); // <-- ADD THIS
app.use(express.json());


app.post("/api/tabtouch", async (req,res) => {
  const {username, password, url} = req.body;
  if(!username || !password || !url) return res.json({ok:false, error:"Missing fields"});

  const browser = await puppeteer.launch({args: ['--no-sandbox','--disable-setuid-sandbox']});
  const page = await browser.newPage();

  try{
    await page.goto("https://www.tabtouch.com.au/login", {waitUntil: 'networkidle2', timeout: 60000});
    await page.type('input[name="username"]', username);
    await page.type('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForNavigation({waitUntil: 'networkidle2', timeout: 60000});

    await page.goto(url, {waitUntil: 'networkidle2', timeout: 60000});

    const horses = await page.evaluate(() => {
      let data = [];
      document.querySelectorAll(".runner-card").forEach(row => {
        data.push({
          J: row.querySelector(".runner-card__number")?.innerText.trim(),
          K: row.querySelector(".runner-card__name")?.innerText.trim(),
          L: row.querySelector(".runner-card__jockey")?.innerText.trim(),
          M: row.querySelector(".runner-card__price")?.innerText.trim(),
          N: row.querySelector(".runner-card__barrier")?.innerText.trim(),
        })
      })
      return data;
    });

    await browser.close();
    res.json({ok: true, race: url, horses});
  }catch(e){
    await browser.close();
    res.json({ok: false, error: e.message});
  }
});

app.get("/", (req,res) => res.send("Tabtouch API is running"));
app.listen(process.env.PORT || 3000);
