// ===== Motore news (Fase 21): rule-based, zero AI generativa. Ogni riga
// deriva da un dato calcolato — se il dato non c'è, la regola non scatta. =====

function hv_generaNews(risultati, squadre, classifica) {
  const news = [];
  const ultimaGiornata = Math.max(...risultati.map((r) => r.matchday));
  const nome = (id) => (squadre.find((s) => s.id === id) || {}).nomeFantasquadra || id;

  // Regola 1: strisce di vittorie/sconfitte (>= 3) attive in classifica
  classifica.forEach((r) => {
    const s = hv_strisciaAttiva(r.formaRecente);
    if (s.tipo === "V" && s.lunghezza >= 3) {
      news.push(`🔥 ${r.squadra.nomeFantasquadra} conquista la ${s.lunghezza}ª vittoria consecutiva.`);
    }
    if (s.tipo === "S" && s.lunghezza >= 3) {
      news.push(`📉 ${r.squadra.nomeFantasquadra} incassa la ${s.lunghezza}ª sconfitta di fila.`);
    }
  });

  // Regola 2: miglior punteggio dell'ultima giornata giocata
  const puntiUltimaGiornata = [];
  risultati.filter((r) => r.matchday === ultimaGiornata).forEach((r) => {
    puntiUltimaGiornata.push({ teamId: r.homeTeamId, score: r.homeScore });
    puntiUltimaGiornata.push({ teamId: r.awayTeamId, score: r.awayScore });
  });
  if (puntiUltimaGiornata.length > 0) {
    const migliore = puntiUltimaGiornata.reduce((m, v) => (v.score > m.score ? v : m));
    news.push(`⭐ ${nome(migliore.teamId)} realizza il miglior punteggio della giornata ${ultimaGiornata} con ${migliore.score}.`);
  }

  // Regola 3: sconfitta nonostante un punteggio comunque alto (soglia: >= 80)
  risultati
    .filter((r) => r.matchday === ultimaGiornata)
    .forEach((r) => {
      if (r.homeScore > r.awayScore && r.awayScore >= 80) {
        news.push(`😤 ${nome(r.awayTeamId)} perde nonostante ${r.awayScore} fantapunti.`);
      } else if (r.awayScore > r.homeScore && r.homeScore >= 80) {
        news.push(`😤 ${nome(r.homeTeamId)} perde nonostante ${r.homeScore} fantapunti.`);
      }
    });

  // Regola 4: primo posto in classifica dopo l'ultima giornata
  if (classifica.length > 0) {
    news.push(`👑 ${classifica[0].squadra.nomeFantasquadra} guida la classifica dopo la giornata ${ultimaGiornata}.`);
  }

  return news;
}

if (typeof module !== "undefined") {
  module.exports = { hv_generaNews };
}
