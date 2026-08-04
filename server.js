import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public")); // for css/js if needed

let oldHorseCache = {};

//... keep processRace, codeCopyPB, betting, getColor from last message...

app.post("/api/sheet1", async (req, res) => {
    const { url } = req.body;
    if(!url) return res.status(400).json({ok:false, error:"Missing url"});

    const raceId = url.split("/").slice(-2).join("_");

    try {
        const r = await fetch("https://your-proxy.onrender.com/api/tabtouch", {
            method: "POST",
            headers: {"Content-Type":"application/json"},
            body: JSON.stringify({url})
        });
        const csvData = await r.json();

        const race = processRace(csvData, raceId);
        let sheet2 = { N: [], QUARTETS: csvData.bets || [] };
        let sheet1_Y = race.horses.map(h => ({value: h.H, color: 0, Z: ""}));
        const afterCopy = codeCopyPB(sheet1_Y, sheet2);
        const bets = betting(sheet2, race.horses);

        res.json({ok: true, race, bets, afterCopy: afterCopy.sheet1_Y});
    } catch(e) {
        res.status(500).json({ok:false, error: e.message});
    }
});

// SERVE THE PAGE WITH REFRESH BUTTON
app.get("/page", (req, res) => {
    const url = req.query.url || "";
    res.send(`
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Sheet1 - Race</title>
<style>
body {font-family: Arial; margin:10px; background:#f5f5f5;}
table {border-collapse: collapse; width:100%; font-size:12px;}
td, th {border:1px solid #ccc; padding:4px; text-align:center;}
#refreshBtn {background:#007bff; color:white; border:none; padding:10px 20px;
             font-size:16px; border-radius:5px; width:100%; margin-bottom:10px;}
.loading {text-align:center; padding:20px;}
.header {background:white; padding:8px; margin-bottom:10px; border-radius:5px;}
</style>
</head>
<body>
    <button id="refreshBtn" onclick="loadData()">🔄 Refresh</button>
    <div id="header" class="header"></div>
    <div id="content" class="loading">Loading...</div>

<script>
const API_URL = "/api/sheet1";
const RACE_URL = "${url}";

async function loadData() {
    document.getElementById("content").innerHTML = "<div class='loading'>Loading...</div>";
    document.getElementById("refreshBtn").disabled = true;

    try {
        const r = await fetch(API_URL, {
            method: "POST",
            headers: {"Content-Type":"application/json"},
            body: JSON.stringify({url: RACE_URL})
        });
        const data = await r.json();

        if(!data.ok) throw new Error(data.error);

        // HEADER = Q5 Q4 Q20
        document.getElementById("header").innerHTML =
            `<b>Q5:</b> ${data.race.Q5} |
             <b>Q4:</b> ${data.race.Q4} |
             <b>Q20:</b> ${data.race.Q20} |
             <b>Runners:</b> ${data.race.noHorses}`;

        // TABLE = HORSES
        let html = "<table><tr><th>J</th><th>K</th><th>L</th><th>H</th><th>N</th><th>P%</th><th>Z</th></tr>";
        data.race.horses.forEach((h,i) => {
            let bg = getColor(h.color);
            let zbg = data.afterCopy[i].color===4? 'lightgreen' : '';
            html += `<tr style="background:${bg}">
                <td>${h.J}</td><td>${h.K}</td><td>${h.L}</td>
                <td>${h.H}</td><td>${h.N}</td><td>${h.P}%</td>
                <td style="background:${zbg}">${data.afterCopy[i].Z || ''}</td>
            </tr>`;
        });
        html += "</table>";

        // BETS
        html += "<h4>Bets</h4>";
        data.bets.forEach(b => {
            html += `<div style="background:${getColor(b.color)};padding:4px;margin:2px;">${b.text}</div>`;
        });

        document.getElementById("content").innerHTML = html;
    } catch(err) {
        document.getElementById("content").innerHTML = "<div style='color:red'>Error: " + err.message + "</div>";
    }
    document.getElementById("refreshBtn").disabled = false;
}

function getColor(idx) {
    const colors = {4:"#00FF00", 35:"#92D050", 38:"#FFC000", 39:"#FF0000", 0:"#FFFFFF"};
    return colors[idx] || "#FFFFFF";
}

// Auto load on open
loadData();
// Auto refresh every 30 seconds
setInterval(loadData, 30000);
</script>
</body>
</html>
    `);
});

app.listen(process.env.PORT || 3000, () => console.log("API running"));
