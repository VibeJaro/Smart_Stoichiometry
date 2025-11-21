function toMoles(amount, molarMass) {
  if (!amount || !molarMass) return null;
  const { value, unit } = amount;
  if (unit === 'mol') return value;
  if (unit === 'mmol') return value * 0.001;
  if (unit === 'g') return value / molarMass;
  if (unit === 'mg') return value / 1000 / molarMass;
  if (unit === 'mL') {
    // Assume density of 1 g/mL when no better info is available
    return value / molarMass;
  }
  return null;
}

function computeStoichiometry(entries) {
  const enriched = entries.map((entry) => {
    const moles = toMoles(entry.amount, entry.molarMass);
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

  const theoreticalYield = computeTheoreticalYield(limiting);

  return {
    reagents: withEquivalents,
    limitingReagent: limiting,
    theoreticalYield,
  };
}

function computeTheoreticalYield(limitingReagent) {
  if (!limitingReagent || typeof limitingReagent.moles !== 'number' || !limitingReagent.molarMass) {
    return null;
  }
  const grams = limitingReagent.moles * limitingReagent.molarMass;
  return {
    massGrams: grams,
    description: `Theoretical yield assuming 1:1 stoichiometry based on ${limitingReagent.canonicalName}.`,
  };
}

module.exports = {
  toMoles,
  computeStoichiometry,
  computeTheoreticalYield,
};
