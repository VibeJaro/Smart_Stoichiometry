const { buildPubChemUrls, isCasNumber, resolveChemical } = require('../lib/pubchem');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  try {
    const body = await readJsonBody(req);
    const identifier = (body.identifier || '').trim();
    if (!identifier) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'identifier required' }));
      return;
    }

    const steps = [`Manueller PubChem-Debug für "${identifier}" gestartet.`];
    steps.push(`Eingabe wird als ${isCasNumber(identifier) ? 'CAS-Nummer' : 'Name/Synonym'} interpretiert.`);
    const urls = buildPubChemUrls(identifier);
    steps.push(`Property URL: ${urls.propertyUrl}`);
    steps.push(`Record URL: ${urls.recordUrl}`);

    const resolution = await resolveChemical(identifier, { fetchFn: global.fetch, steps });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ identifier, urls, resolution, steps }));
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
