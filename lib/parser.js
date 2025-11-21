const UNIT_PATTERNS = [
  { regex: /\b(mmol|mmol)\b/i, unit: 'mmol', factorToMol: 0.001 },
  { regex: /\b(mol)\b/i, unit: 'mol', factorToMol: 1 },
  { regex: /\b(mg)\b/i, unit: 'mg', factorToGrams: 0.001 },
  { regex: /\b(g)\b/i, unit: 'g', factorToGrams: 1 },
  { regex: /\b(ml|mL)\b/, unit: 'mL', factorToMilliliters: 1 },
];

const CAS_PATTERN = /\b\d{2,7}-\d{2}-\d\b/;
const SMILES_PATTERN = /[A-Za-z0-9@=+#\[\]\(\)\\\/]+/;

function parseLine(line) {
  const trimmed = line.trim();
  if (!trimmed) {
    return null;
  }

  const casMatch = trimmed.match(CAS_PATTERN);
  const unitMatch = UNIT_PATTERNS.find((pattern) => pattern.regex.test(trimmed));
  let amount = null;

  if (unitMatch) {
    const quantityMatch = trimmed.match(/([-+]?[0-9]*\.?[0-9]+)/);
    if (quantityMatch) {
      amount = {
        value: Number.parseFloat(quantityMatch[1]),
        unit: unitMatch.unit,
      };
    }
  }

  let identifier = trimmed;
  if (unitMatch && amount) {
    identifier = trimmed.replace(quantityStringFromAmount(amount), '').replace(unitMatch.regex, '').trim();
  }

  const role = inferRole(trimmed);
  return {
    raw: trimmed,
    identifier: identifier || trimmed,
    casNumber: casMatch ? casMatch[0] : null,
    smiles: casMatch ? null : inferSmiles(trimmed),
    amount,
    role,
  };
}

function quantityStringFromAmount(amount) {
  return amount ? String(amount.value) : '';
}

function inferRole(text) {
  const lower = text.toLowerCase();
  if (lower.includes('katalys')) return 'catalyst';
  if (lower.includes('lösung') || lower.includes('solvent') || lower.includes('lösungsmittel')) return 'solvent';
  if (lower.includes('produkt') || lower.includes('ausbeute')) return 'product';
  return 'reagent';
}

function inferSmiles(text) {
  if (CAS_PATTERN.test(text)) {
    return null;
  }
  const parts = text.split(/\s+/);
  const candidate = parts.find((part) => SMILES_PATTERN.test(part) && /[=\[\]]/.test(part));
  return candidate || null;
}

function parseInput(input) {
  if (!input || typeof input !== 'string') {
    return [];
  }
  const segments = input
    .split(/[,\n]/)
    .map((part) => part.trim())
    .filter(Boolean);
  const parsed = segments.map(parseLine).filter(Boolean);
  return parsed;
}

module.exports = {
  parseInput,
  parseLine,
};
