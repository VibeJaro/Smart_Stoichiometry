const { parseInput } = require('./parser');

async function extractChemicalsWithLLM(text, options = {}) {
  const {
    llmApiKey = process.env.OPENAI_API_KEY,
    fetchFn = global.fetch,
    fallbackParsed,
    steps = [],
  } = options;
  const sanitized = (text || '').trim();
  if (!sanitized) {
    steps.push('LLM: kein Eingabetext, keine Extraktion durchgeführt.');
    return [];
  }

  if (!llmApiKey) {
    steps.push('LLM: kein API-Key vorhanden, benutze Fallback-Parser.');
    return fallbackParsed || parseInput(sanitized);
  }

  if (typeof fetchFn !== 'function') {
    steps.push('LLM: fetch-Funktion nicht verfügbar, benutze Fallback-Parser.');
    return fallbackParsed || parseInput(sanitized);
  }

  const model = options.model || 'gpt-4o-mini';
  const body = {
    model,
    messages: [
      {
        role: 'system',
        content:
          'Extrahiere Reagenzien UND Reaktionsprodukt aus dem Nutzertext inklusive CAS-Nummern, SMILES, Mengenangaben und Rollen. Markiere das Reaktionsprodukt mit role="product". Antworte als JSON mit dem Schema {"chemicals":[{name, casNumber, smiles, amount:{value, unit}, role}]}.',
      },
      { role: 'user', content: sanitized },
    ],
    response_format: { type: 'json_object' },
  };

  steps.push(`LLM: Extraktion mit Modell ${model} gestartet.`);

  try {
    const response = await fetchFn('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${llmApiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`LLM request failed with status ${response.status}`);
    }

    const json = await response.json();
    const content = json?.choices?.[0]?.message?.content;
    const parsed = content ? JSON.parse(content) : null;
    const chemicals = Array.isArray(parsed?.chemicals) ? parsed.chemicals : [];
    const mapped = chemicals.map((chemical) => ({
      identifier: chemical.name || chemical.casNumber || chemical.smiles,
      canonicalName: chemical.name,
      casNumber: chemical.casNumber || null,
      smiles: chemical.smiles || null,
      amount: chemical.amount || null,
      role: chemical.role || 'reagent',
    }));

    if (!mapped.length) {
      steps.push('LLM: Antwort enthielt keine Chemikalien, benutze Fallback-Parser.');
      return fallbackParsed || parseInput(sanitized);
    }

    const names = mapped
      .map((c) => c.canonicalName || c.identifier)
      .filter(Boolean)
      .join(', ');
    steps.push(`LLM: Antwort verarbeitet (${mapped.length} Chemikalien identifiziert: ${names || 'ohne Namen'}).`);
    return mapped;
  } catch (error) {
    steps.push(`LLM: Fehler beim Abruf (${error.message}), benutze Fallback-Parser.`);
    return fallbackParsed || parseInput(sanitized);
  }
}

module.exports = {
  extractChemicalsWithLLM,
};
