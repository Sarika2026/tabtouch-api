import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

let oldHorseCache = {}; // = OldHorse() in VBA

const COLOR = {4:"#00FF00", 35:"#92D050", 38:"#FFC000", 39:"#FF0000", 46:"#FF9966", 0:"#FFFFFF", 15:"#C0C0C0"};

function processRace(data, raceId) {
    // SORTWIN: data.runners must be sorted by Number
    let horses = [...data.runners].sort((a,b) => a.number - b.number);
    const noHorses = horses.length;

    // HORSES: count e and d for classification
    let e = 0, d = 0;
    horses.forEach(h => {
        if(h.odds > 1.1 && h.odds < 23.25) e++;
        if(h.odds >= 23.25 && h.odds <= 66.66) d++;
    });

    // POSORT: load old
    const oldHorses = oldHorseCache[raceId] || [];

    // Build Sheet1 rows J,K,L,M,N,P,H
    let rows = horses.map((h, i) => {
        // Column K = Odds
        let K = parseFloat(h.odds) || 0;

        // Column P = % Change vs OldHorse
        let P = " ";
        let old = oldHorses.find(o => o.number === h.number);
        if(old && old.odds > 0) {
            let a = Math.floor(((old.odds) / K - 1) * 100);
            P = String(a);
        }

        // NEWCAL: Column H = K + (K * P%)
        let H = K;
        let pVal = parseFloat(P);
        if(!isNaN(pVal)) {
            if(pVal > 0) {
                let l_temp = -pVal; // VBA: l_temp = "-" + P
                H = K + (K * l_temp / 100);
            } else {
                H = K + Math.abs((K * pVal / 100));
            }
        }
        H = parseFloat(H.toFixed(2));

        // Color logic from Horses()
        let color = 0;
        if(i === 0) color = 4;
        else if(i <= 5) color = 35;
        else if(i <= 7) color = 38;
        else if(i === 8) color = 39;
        else if(i <= 12) color = 46;

        // GAP color for Column P like VBA
        let gapColor = -1;
        if(i > 0) {
            let prevK = horses[i-1].odds;
            if(prevK > 0) {
                let r = ((K / prevK) - 1) * 100;
                if(r >= 75 && r < 100) gapColor = 39;
                else if(r >= 100 && r < 180) gapColor = 28;
                else if(r >= 180 && r < 400) gapColor = 42;
                else if(r >= 400) gapColor = 0;
            }
        }

        return {
            J: h.number, K, L: h.jockey, M: K, N: h.barrier,
            H, P, color, gapColor, name: h.name
        }
    });

    // Save OldHorse for next run
    oldHorseCache[raceId] = rows.map(r => ({number: r.J, odds: r.K}));

    // Q5 = e + d
    let Q5 = `${e} + ${d}`;

    // Q4 = fication
    let fication = "";
    if((e+d) <= 8.1) fication = "X";
    if((e+d) >= 10 && (e+d) <= 12.1 && e <= 8.9) fication = "A";
    if((e+d) >= 10 && (e+d) <= 12.1 && e >= 9) fication = "B";
    if((e+d) >= 13 && e <= 8.9) fication = "D";
    if((e+d) >= 13 && (e+d) <= 14.1 && e >= 9) fication = "E";
    if((e+d) >= 15 && e >= 9) fication = "H";

    // Q20 = yyy traffic light logic
    let yyy = "no";
    if((e+d) >= 10 && (e+d) <= 12.1 && noHorses >= 14) yyy = "B14/BE YES ";
    if((e+d) >= 13 && (e+d) <= 20.1 && e === 5) yyy = "yes D5";
    if((e+d) >= 15 && e >= 9) yyy = "H YES";

    let yyyColor = 0;
    if(yyy.includes("no")) yyyColor = 0;
    else if(yyy.includes("YES")) yyyColor = 4;
    else yyyColor = 26;

    return {rows, Q5, Q4:fication, Q20:yyy, Q20Color:yyyColor, noHorses};
}

// CODECOPY_P_B: Copy Y to N and compare
function codeCopyPB(rows) {
    // Simulate Sheet1.Y12:Y62 -> Sheet2.N
    let sheet2_N = rows.slice(0, 50).map(r => r.H); // Y = H in our case

    rows.forEach((r,i) => {
        let sheet2Val = sheet2_N[i];
        let sheet2Header = rows[1]?.H; // Row 2
        if(sheet2Header === sheet2Val && sheet2Val) {
            r.Zcolor = 4; // Green
        } else {
            r.Z = sheet2Val; // Put in Z
        }
    });
    return rows;
}

// BETTING: Build bet strings
function buildBets(betData, rows) {
    if(!betData) return [];
    return betData.map(b => {
        let nums = b.info.split(",").map(n => parseInt(n));
        let ho = nums.map(n => rows[n-1]?.J).filter(Boolean).sort((a,b)=>a-b);
        return {
            text: ho.join(".") + ".",
            color: b.color || 0,
            valid:!ho.includes(undefined)
        }
    });
}

app.post("/api/sheet1", async (req, res) => {
    const { url } = req.body;
    if(!url) return res.status(400).json({ok:false});

    const raceId = url.split("/").slice(-2).join("_");
    try {
        // 1. Call your Tabtouch proxy
        const r = await fetch("https://your-proxy.onrender.com/api/tabtouch", {
            method: "POST",
            headers: {"Content-Type":"application/json"},
            body: JSON.stringify({url})
        });
        if(!r.ok) throw new Error("Proxy 404");
        const data = await r.json(); // {runners:[], bets:[]}

        // 2. Run all VBA logic
        let result = processRace(data, raceId);
        result.rows = codeCopyPB(result.rows);
        let bets = buildBets(data.bets, result.rows);

        res.json({ok:true,...result, bets});
    } catch(e) {
        res.status(500).json({ok:false, error: e.message});
    }
});

// SERVE PAGE WITH REFRESH
app.get("/page", (req, res) => {
    const url = req.query.url || "";
    res.send(`<!DOCTYPE html>
<html><head><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sheet1</title>
<style>
body{font-family:Arial;margin:5px;background:#eee;font-size:12px}
#btn{width:100%;padding:10px;background:#007bff;color:#fff;border:0;border-radius:4px;font-size:16px}
table{width:100%;border-collapse:collapse;background:#fff;margin-top:5px}
td,th{border:1px solid #ddd;padding:3px;text-align:center}
.header{background:#fff;padding:5px;border-radius:4px;margin:5px 0}
</style></head><body>
<button id="btn" onclick="load()">🔄 Refresh</button>
<div id="head" class="header"></div>
<div id="tbl">Loading...</div>
<script>
const API="/api/sheet1"; const RACE_URL="${url}";
async function load(){
 document.getElementById("btn").disabled=true;
 document.getElementById("tbl").innerHTML="Loading...";
 try{
  let r=await fetch(API,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({url:RACE_URL})});
  let d=await r.json();
  document.getElementById("head").innerHTML=\`<b>Q5:</b>\${d.Q5} <b>Q4:</b>\${d.Q4} <b>Q20:</b><span style="background:\${getC(d.Q20Color)}">\${d.Q20}</span>\`;
  let h="<table><tr><th>J</th><th>K</th><th>Name</th><th>H</th><th>N</th><th>P%</th><th>Z</th></tr>";
  d.rows.forEach((x,i)=>{
   let bg=getC(x.color); let zbg=x.Zcolor===4?'lightgreen':'';
   h+=\`<tr style="background:\${bg}"><td>\${x.J}</td><td>\${x.K}</td><td>\${x.name}</td><td>\${x.H}</td><td>\${x.N}</td><td>\${x.P}%</td><td style="background:\${zbg}">\${x.Z||''}</td></tr>\`
  });
  h+="</table><h4>Bets</h4>"; d.bets.forEach(b=>h+=\`<div style="background:\${getC(b.color)};padding:3px">\${b.text}</div>\`);
  document.getElementById("tbl").innerHTML=h;
 }catch(e){document.getElementById("tbl").innerHTML="<div style=color:red>"+e+"</div>"}
 document.getElementById("btn").disabled=false;
}
function getC(i){return {4:"#0f0",35:"#92D050",38:"#FFC000",39:"#f00",46:"#FF9966",26:"#FFD700",0:"#fff"}[i]||"#fff"}
load(); setInterval(load,30000);
</script></body></html>`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Running on " + PORT));
