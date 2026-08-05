import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// THIS FETCHES TABTOUCH DATA
app.post("/api/tabtouch", async (req, res) => {
    const { url } = req.body;
    if(!url) return res.status(400).json({error:"Missing url"});

    try {
        // Tabtouch race page has a.json endpoint. Example:
        // https://www.tabtouch.com.au/api/racing/v1/race/2026-08-05/orb/1
        const parts = url.split("/");
        const date = parts[4]; const track = parts[5]; const race = parts[6];
        const apiUrl = `https://www.tabtouch.com.au/api/racing/v1/race/${date}/${track}/${race}`;

        const r = await fetch(apiUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0",
                "Accept": "application/json"
            }
        });
        if(!r.ok) throw new Error("Tabtouch 404");

        const tabData = await r.json();

        // MAP TABTOUCH JSON -> OUR FORMAT
        const runners = tabData.runners.map(r => ({
            number: r.number,
            name: r.name,
            odds: parseFloat(r.fixedOddsWin) || parseFloat(r.toteWin) || 0,
            jockey: r.jockey,
            barrier: r.barrier
        }));

        // MAP BETS IF ANY
        const bets = tabData.exotics?.quartets?.map(q => ({
            info: q.combination, // "1,2,3,4"
            color: 35
        })) || [];

        res.json({runners, bets});
    } catch(e) {
        res.status(500).json({error: e.message});
    }
});

app.listen(process.env.PORT || 4000);
