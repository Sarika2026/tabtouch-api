import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => res.send("Racing.com API is running"));

app.post("/api/tabtouch", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ ok: false, error: "Missing url" });

  try {
    // Convert Tabtouch URL to Racing.com URL
    // Tabtouch: https://www.tabtouch.com.au/racing/2026-08-05/orb/6
    // Racing: https://api.racing.com/v1/en-au/meetings/2026-08-05/orb/races/6
    const parts = url.split("/");
    const date = parts[4];
    const venueCode = parts[5];
    const raceNum = parts[6];

    const apiUrl = `https://api.racing.com/v1/en-au/meetings/${date}/${venueCode}/races/${raceNum}`;
    
    const r = await fetch(apiUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }
    });

    if (!r.ok) throw new Error("Racing.com API returned " + r.status);
    const data = await r.json();

    const horses = data.race.runners.map(runner => ({
      J: runner.number || "-", 
      K: runner.name || "-", 
      L: runner.jockey?.fullName || "-", 
      N: runner.barrierNumber || "-", 
      M: runner.fixedOdds?.win || "-" 
    }));

    res.json({ ok: true, horses });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("API running on " + PORT));
