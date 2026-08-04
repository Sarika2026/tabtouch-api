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
    // 1. Parse URL: https://www.tabtouch.com.au/racing/2026-08-05/orb/6
    const parts = url.split("/");
    const date = parts[4]; // 2026-08-05
    const venueCode = parts[5]; // orb
    const raceNum = parts[6]; // 6

    // 2. Call the Tabtouch racecard API - this is public
    const apiUrl = `https://api.tabtouch.com.au/v1/racing/racecard?date=${date}`;
    
    const r = await fetch(apiUrl, {
      headers: { 
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json',
        'Referer': 'https://www.tabtouch.com.au/'
      }
    });

    if (!r.ok) throw new Error("Tabtouch API returned " + r.status);
    const data = await r.json();

    // 3. Find the right meeting + race
    const meeting = data.meetings.find(m => m.venueCode.toLowerCase() === venueCode.toLowerCase());
    if(!meeting) throw new Error("Meeting not found: " + venueCode);

    const race = meeting.races.find(ra => ra.raceNumber == raceNum);
    if(!race) throw new Error("Race " + raceNum + " not found");

    // 4. Map to J,K,L,M,N
    const horses = race.runners.map(runner => ({
      J: runner.runnerNumber || "-", 
      K: runner.runnerName || "-", 
      L: runner.jockeyName || "-", 
      N: runner.barrierNumber || "-", 
      M: runner.winOdds || "-" 
    }));

    res.json({ ok: true, horses });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("API running on " + PORT));
