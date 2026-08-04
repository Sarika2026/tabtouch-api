import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => res.send("Tabtouch API is running"));

app.post("/api/tabtouch", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ ok: false, error: "Missing url" });

  try {
    // 1. Fetch the race page HTML
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 Chrome/120' }
    });
    const html = await r.text();

    // 2. Find the JSON data inside __NEXT_DATA__
    const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/);
    if (!match) throw new Error("Could not find race data in page");

    const data = JSON.parse(match[1]);
    const runners = data.props.pageProps.race.runners;

    // 3. Map to J,K,L,M,N
    const horses = runners.map(runner => ({
      J: runner.runnerNumber || "-", // J
      K: runner.runnerName || "-", // K 
      L: runner.jockeyName || "-", // L
      N: runner.barrier || "-", // N
      M: runner.currentOdds?.win || "-" // M
    }));

    res.json({ ok: true, horses });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("API running on " + PORT));
