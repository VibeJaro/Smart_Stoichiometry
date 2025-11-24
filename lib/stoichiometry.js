function toMoles(amount, molarMass, density) {
  if (!amount || !molarMass) return null;
  const { value, unit } = amount;
  if (unit === 'mol') return value;
  if (unit === 'mmol') return value * 0.001;
  if (unit === 'g') return value / molarMass;
  if (unit === 'mg') return value / 1000 / molarMass;
  if (unit === 'mL') {
    const grams = value * (density || 1);
    return grams / molarMass;
  }
  return null;
}

function computeStoichiometry(entries) {
  const enriched = entries.map((entry) => {
    const moles = toMoles(entry.amount, entry.molarMass, entry.density);
    return {
      ...entry,
      moles,
    };
  });

  const reagents = enriched.filter((r) => r.role !== 'solvent' && r.role !== 'catalyst' && r.role !== 'product');
  const minimalMoles = reagents
    .map((r) => r.moles)
    .filter((moles) => typeof moles === 'number')
    .reduce((min, current) => (min === null ? current : Math.min(min, current)), null);

  const limiting = reagents.find((r) => r.moles === minimalMoles) || null;

  const withEquivalents = enriched.map((entry) => {
    if (minimalMoles && entry.moles) {
      return { ...entry, equivalents: entry.moles / minimalMoles };
    }
    return { ...entry, equivalents: null };
  });

  const product = enriched.find((r) => r.role === 'product');
  const theoreticalYield = computeTheoreticalYield(limiting, product);

  return {
    reagents: withEquivalents,
    limitingReagent: limiting,
    theoreticalYield,
  };
}

function computeTheoreticalYield(limitingReagent, product) {
  if (!product || !limitingReagent || typeof limitingReagent.moles !== 'number') {
    return null;
  }
  if (!product.molarMass) {
    return null;
  }
  const targetMolarMass = product.molarMass;
  const grams = limitingReagent.moles * targetMolarMass;
  return {
    massGrams: grams,
    description: `Theoretical yield (1:1) für Produkt ${product.canonicalName} basierend auf ${limitingReagent.canonicalName}.`,
  };
}

module.exports = {
  toMoles,
  computeStoichiometry,
  computeTheoreticalYield,
};
