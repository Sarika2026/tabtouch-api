function runLogic(){
  if(raceData.length === 0){ alert("Fetch race first"); return; }
  
  // Example Logic: Score = 10 - Barrier. Lower barrier = better
  raceData.forEach(h => {
    let barrier = parseInt(h.N) || 20; // if no barrier, give 20
    h.Score = 10 - barrier; 
    
    // Bonus if jockey name has "Williams"
    if(h.L.toLowerCase().includes("williams")) h.Score += 3;
  });
  
  // Sort by highest score
  raceData.sort((a,b) => b.Score - a.Score);
  
  // Re-draw table with Score column
  showTable();
}

function showTable(){
  let table = `<table><tr><th>Rank</th><th>No</th><th>Horse</th><th>Jockey</th><th>Barrier</th><th>Score</th></tr>`;
  raceData.forEach((h,i) => {
    table += `<tr><td>${i+1}</td><td>${h.J}</td><td>${h.K}</td><td>${h.L}</td><td>${h.N}</td><td><b>${h.Score}</b></td></tr>`;
  });
  table += `</table>`;
  document.getElementById('results').innerHTML = table;
}
