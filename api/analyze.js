const { parseInput } = require('../lib/parser');
const { annotateWithPubChem } = require('../lib/pubchem');
const { computeStoichiometry } = require('../lib/stoichiometry');
const { extractChemicalsWithLLM } = require('../lib/llm');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  try {
    const body = await readJsonBody(req);
    const steps = [`Eingabetext erhalten (${(body.text || '').length} Zeichen)`];
    const fallbackParsed = parseInput(body.text || '');
    steps.push(`Parser erkannte ${fallbackParsed.length} Einträge.`);
    const llmParsed = await extractChemicalsWithLLM(body.text || '', { fallbackParsed, steps });
    const parsed = llmParsed.length ? llmParsed : fallbackParsed;
    if (llmParsed.length) {
      steps.push('LLM-Extraktion lieferte Ergebnisse, diese werden genutzt.');
    } else {
      steps.push('LLM-Extraktion nicht verfügbar oder leer, nutze heuristischen Parser.');
    }
    const usedList = parsed.map((p) => p.canonicalName || p.identifier || 'unbenannt').join(', ');
    steps.push(`Verwendete Einträge für PubChem: ${usedList || 'keine Chemikalien erkannt'}.`);
    const enriched = await annotateWithPubChem(parsed, { fetchFn: global.fetch, steps });
    const stoich = computeStoichiometry(enriched);
    if (stoich.limitingReagent) {
      steps.push(`Limiting reagent: ${stoich.limitingReagent.canonicalName}.`);
    }
    if (stoich.theoreticalYield) {
      steps.push(
        `Theoretische Ausbeute: ${stoich.theoreticalYield.massGrams.toFixed(3)} g für ${stoich.theoreticalYield.description}`
      );
    } else {
      steps.push('Keine theoretische Ausbeute berechnet (kein Produkt oder fehlende Daten).');
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        reagents: stoich.reagents,
        limitingReagent: stoich.limitingReagent,
        theoreticalYield: stoich.theoreticalYield,
        steps,
        warnings: stoich.reagents
          .filter((r) => r.status !== 'resolved')
          .map((r) => `${r.identifier} konnte nicht eindeutig bestimmt werden`),
      })
    );
  } catch (error) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Ungültige Anfrage', details: error.message }));
  }
};

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        const parsed = raw ? JSON.parse(raw) : {};
        resolve(parsed);
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}
