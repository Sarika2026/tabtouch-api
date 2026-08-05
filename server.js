app.post("/api/tabtouch", async (req, res) => {
    try{
        const { url } = req.body;
        const parts = url.split("/");
        const date = parts[4]; const track = parts[5]; const race = parts[6];
        
        // Try 2 possible Tabtouch endpoints
        let apiUrl = `https://www.tabtouch.com.au/api/racing/v1/race/${date}/${track}/${race}`;
        let r = await fetch(apiUrl, {headers:{"User-Agent":"Mozilla/5.0"}});
        
        if(!r.ok){
            // Try v2 if v1 fails
            apiUrl = `https://www.tabtouch.com.au/api/racing/v2/race/${date}/${track}/${race}`;
            r = await fetch(apiUrl, {headers:{"User-Agent":"Mozilla/5.0"}});
        }

        const tabData = await r.json();
        console.log("TABTOUCH RAW:", JSON.stringify(tabData).substring(0,500)); // check Render logs

        // MAP BASED ON WHAT TABTOUCH RETURNS
        let runners = [];
        if(tabData.runners){ // v1 format
            runners = tabData.runners.map(r => ({
                number:r.number,
                name:r.name,
                odds:parseFloat(r.fixedOddsWin)||parseFloat(r.toteWin)||0,
                jockey:r.jockey?.name || r.jockey,
                barrier:r.barrier
            }));
        } else if(tabData.race?.runners){ // v2 format
            runners = tabData.race.runners.map(r => ({
                number:r.runnerNumber,
                name:r.runnerName,
                odds:parseFloat(r.odds?.fixedOddsWin)||0,
                jockey:r.jockeyName,
                barrier:r.barrier
            }));
        }

        if(runners.length === 0) throw new Error("No runners found in Tabtouch response");

        res.json({runners, bets:[]});
    }catch(e){ 
        console.log("PROXY ERROR:", e.message);
        res.status(500).json({error:e.message}) 
    }
});
