import express from "express";
import cors from "cors";
import fs from "fs";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const CACHE_FILE = "/tmp/oldhorses.json";

let oldHorseCache = {};
if(fs.existsSync(CACHE_FILE)) {
    try{ oldHorseCache = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8")); }catch(e){}
}
const saveCache = () => { try{ fs.writeFileSync(CACHE_FILE, JSON.stringify(oldHorseCache)); }catch(e){} };

function processRace(data, raceId) {
    let horses = [...data.runners].sort((a,b) => a.number - b.number);
    const noHorses = horses.length;
    let e = 0, d = 0;
    horses.forEach(h => {
        if(h.odds > 1.1 && h.odds < 23.25) e++;
        if(h.odds >= 23.25 && h.odds <= 66.66) d++;
    });
    const oldHorses = oldHorseCache[raceId] || [];
    let rows = horses.map((h, i) => {
        let A = i + 1; let D = h.name || "";
        let K = parseFloat(h.odds) || 0;
        let P = " ";
        let old = oldHorses.find(o => o.number === h.number);
        if(old && old.odds > 0) { P = String(Math.floor(((old.odds) / K - 1) * 100)); }
        let H = K; let pVal = parseFloat(P);
        if(!isNaN(pVal)) {
            if(pVal > 0) { H = K + (K * -pVal / 100); }
            else { H = K + Math.abs((K * pVal / 100)); }
        }
        H = parseFloat(H.toFixed(2));
        let color = i === 0? 4 : i <= 5? 35 : i <= 7? 38 : i === 8? 39 : i <= 12? 46 : 0;
        return { A, D, J: h.number, K, L: h.jockey, N: h.barrier, H, P, color }
    });
    oldHorseCache[raceId] = rows.map(r => ({number: r.J, odds: r.K})); saveCache();
    let Q5 = e + " + " + d;
    let fication = (e+d)<=8.1?"X":(e+d)>=10&&(e+d)<=12.1&&e<=8.9?"A":(e+d)>=10&&(e+d)<=12.1&&e>=9?"B":(e+d)>=13&&e<=8.9?"D":(e+d)>=13&&(e+d)<=14.1&&e>=9?"E":(e+d)>=15&&e>=9?"H":"";
    let yyy = "no"; if((e+d)>=10&&(e+d)<=12.1&&noHorses>=14) yyy="B14/BE YES "; if((e+d)>=13&&(e+d)<=20.1&&e===5) yyy="yes D5"; if((e+d)>=15&&e>=9) yyy="H YES";
    let yyyColor = yyy.includes("YES")?4:yyy.includes("no")?0:26;
    return {rows, Q5, Q4:fication, Q20:yyy, Q20Color:yyyColor};
}

app.post("/api/tabtouch", async (req, res) => {
    try{
        const { url } = req.body;
        const parts = url.split("/");
        const date = parts[4]; const track = parts[5]; const race = parts[6];

        let apiUrl = `https://www.tabtouch.com.au/api/racing/v1/race/${date}/${track}/${race}`;
        let r = await fetch(apiUrl, {headers:{"User-Agent":"Mozilla/5.0"}});

        if(!r.ok){
            apiUrl = `https://www.tabtouch.com.au/api/racing/v2/race/${date}/${track}/${race}`;
            r = await fetch(apiUrl, {headers:{"User-Agent":"Mozilla/5.0"}});
        }
        const tabData = await r.json();
        console.log("TABTOUCH RAW:", JSON.stringify(tabData).substring(0,500));

        let runners = [];
        if(tabData.runners){
            runners = tabData.runners.map(r => ({number:r.number,name:r.name,odds:parseFloat(r.fixedOddsWin)||parseFloat(r.toteWin)||0,jockey:r.jockey?.name || r.jockey,barrier:r.barrier}));
        } else if(tabData.race?.runners){
            runners = tabData.race.runners.map(r => ({number:r.runnerNumber,name:r.runnerName,odds:parseFloat(r.odds?.fixedOddsWin)||0,jockey:r.jockeyName,barrier:r.barrier}));
        }
        if(runners.length === 0) throw new Error("No runners found");
        res.json({runners, bets:[]});
    }catch(e){
        console.log("PROXY ERROR:", e.message);
        res.status(500).json({error:e.message})
    }
});

app.post("/api/sheet1", async (req, res) => {
    try{
        const { url } = req.body; const raceId = url.split("/").slice(-2).join("_");
        const r = await fetch(`http://localhost:${PORT}/api/tabtouch`, {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({url})});
        const data = await r.json();
        if(data.error) throw new Error(data.error);
        const result = processRace(data, raceId);
        res.json({ok:true,...result});
    }catch(e){ res.status(500).json({ok:false,error:e.message}) }
});

app.get("/page", (req, res) => {
    const url = req.query.url || "";
    res.send(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Sheet1</title>
    <style>body{font-family:Arial;margin:5px;background:#eee;font-size:12px}#btn{width:100%;padding:10px;background:#007bff;color:#fff;border:0;border-radius:4px;font-size:16px}table{width:100%;border-collapse:collapse;background:#fff;margin-top:5px}td,th{border:1px solid #ddd;padding:3px;text-align:center;white-space:nowrap}.header{background:#fff;padding:5px;border-radius:4px;margin:5px 0}.colA{width:30px;font-weight:bold}.colD{text-align:left;padding-left:5px}</style></head><body>
    <button id="btn" onclick="load()">🔄 Refresh</button><div id="head" class="header"></div><div id="tbl">Loading...</div>
    <script>
    const API="/api/sheet1"; const RACE_URL="${url}";
    async function load(){document.getElementById("btn").disabled=true;document.getElementById("tbl").innerHTML="Loading...";
    try{let r=await fetch(API,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({url:RACE_URL})});let d=await r.json();
    if(!d.ok) throw new Error(d.error);
    document.getElementById("head").innerHTML='<b>Q5:</b>'+d.Q5+' <b>Q4:</b>'+d.Q4+' <b>Q20:</b><span style="background:'+getC(d.Q20Color)+';padding:2px">'+d.Q20+'</span>';
    let h="<table><tr><th class=colA>A</th><th>D</th><th>J</th><th>K</th><th>H</th><th>N</th><th>P%</th></tr>";
    d.rows.forEach((x)=>{let bg=getC(x.color);h+='<tr style="background:'+bg+'"><td class=colA>'+x.A+'</td><td class=colD>'+x.D+'</td><td>'+x.J+'</td><td>'+x.K+'</td><td>'+x.H+'</td><td>'+x.N+'</td><td>'+x.P+'%</td></tr>'});
    document.getElementById("tbl").innerHTML=h+"</table>";}catch(e){document.getElementById("tbl").innerHTML="<div style=color:red>"+e+"</div>"}
    document.getElementById("btn").disabled=false;}
    function getC(i){return {4:"#0f0",35:"#92D050",38:"#FFC000",39:"#f00",46:"#FF9966",26:"#FFD700",0:"#fff"}[i]||"#fff"}
    load(); setInterval(load,30000);
    </script></body></html>`);
});

app.listen(PORT, ()=>console.log(`Running on ${PORT}`));
