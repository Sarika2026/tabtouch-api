import express from "express";
import cors from "cors";
import fs from "fs";
const app = express();
app.use(cors()); app.use(express.json());

const CACHE_FILE = "/tmp/oldhorses.json";
let oldHorseCache = {};
if(fs.existsSync(CACHE_FILE)) oldHorseCache = JSON.parse(fs.readFileSync(CACHE_FILE));
const saveCache = () => fs.writeFileSync(CACHE_FILE, JSON.stringify(oldHorseCache));

// 1. PROXY INSIDE SAME APP
app.post("/api/tabtouch", async (req, res) => {
    const { url } = req.body;
    const parts = url.split("/");
    const apiUrl = `https://www.tabtouch.com.au/api/racing/v1/race/${parts[4]}/${parts[5]}/${parts[6]}`;
    const r = await fetch(apiUrl, {headers:{"User-Agent":"Mozilla/5.0"}});
    const tabData = await r.json();
    const runners = tabData.runners.map(r => ({number:r.number,name:r.name,odds:parseFloat(r.fixedOddsWin)||0,jockey:r.jockey,barrier:r.barrier}));
    res.json({runners, bets:[]});
});

// 2. SHEET1 LOGIC - same as before
app.post("/api/sheet1", async (req, res) => {
    const { url } = req.body; const raceId = url.split("/").slice(-2).join("_");
    const r = await fetch("http://localhost:" + process.env.PORT + "/api/tabtouch", {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({url})});
    const data = await r.json();
    // ... paste processRace + codeCopyPB + buildBets from last message here ...
    res.json({ok:true,...result,bets:[]});
});

// 3. PAGE
app.get("/page", (req, res) => { /* paste HTML from last message */ });

app.listen(process.env.PORT || 3000);
