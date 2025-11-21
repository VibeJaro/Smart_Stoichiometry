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
    const fallbackParsed = parseInput(body.text || '');
    const llmParsed = await extractChemicalsWithLLM(body.text || '', { fallbackParsed });
    const parsed = llmParsed.length ? llmParsed : fallbackParsed;
    const enriched = await annotateWithPubChem(parsed, { fetchFn: global.fetch });
    const stoich = computeStoichiometry(enriched);

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        reagents: stoich.reagents,
        limitingReagent: stoich.limitingReagent,
        theoreticalYield: stoich.theoreticalYield,
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
