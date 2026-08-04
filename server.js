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
    // 1. Extract meetingId and raceNumber from URL
    // Example: https://www.tabtouch.com.au/racing/2026-08-05/orb/6
    const parts = url.split("/");
    const date = parts[4]; // 2026-08-05
    const meetingCode = parts[5]; // orb
    const raceNumber = parts[6]; // 6

    // 2. Call Tabtouch's internal API
    const apiUrl = `https://api.tabtouch.com.au/api/racing/meetings/${date}/${meetingCode}/races/${raceNumber}`;
    
    const r = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json'
      }
    });

    if (!r.ok) throw new Error("Tabtouch API returned " + r.status);
    const data = await r.json();

    // 3. Map JSON to J,K,L,M,N columns
    const horses = data.runners.map(runner => ({
      J: runner.runnerNumber || "-", // J = Number
      K: runner.runnerName || "-", // K = Horse Name
      L: runner.jockeyName || "-", // L = Jockey
      N: runner.barrier || "-", // N = Barrier
      M: runner.fixedOdds?.[0]?.price || "-" // M = Win Price
    }));

    res.json({ ok: true, horses });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("API running on " + PORT));
