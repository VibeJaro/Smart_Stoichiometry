const { parseInput } = require('./parser');

async function extractChemicalsWithLLM(text, options = {}) {
  const { llmApiKey = process.env.OPENAI_API_KEY, fetchFn = global.fetch, fallbackParsed } = options;
  const sanitized = (text || '').trim();
  if (!sanitized) return [];

  if (!llmApiKey || typeof fetchFn !== 'function') {
    return fallbackParsed || parseInput(sanitized);
  }

  const body = {
    model: options.model || 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          'Extrahiere Chemikaliennamen, CAS-Nummern, SMILES und Mengenangaben aus dem Nutzertext. Antworte als JSON mit dem Schema {"chemicals":[{name, casNumber, smiles, amount:{value, unit}, role}]}.',
      },
      { role: 'user', content: sanitized },
    ],
    response_format: { type: 'json_object' },
  };

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
    if (!chemicals.length) {
      return fallbackParsed || parseInput(sanitized);
    }

    return chemicals.map((chemical) => ({
      identifier: chemical.name || chemical.casNumber || chemical.smiles,
      canonicalName: chemical.name,
      casNumber: chemical.casNumber || null,
      smiles: chemical.smiles || null,
      amount: chemical.amount || null,
      role: chemical.role || 'reagent',
    }));
  } catch (error) {
    return fallbackParsed || parseInput(sanitized);
  }
}

module.exports = {
  extractChemicalsWithLLM,
};
