const assert = require('assert');
const { computeStoichiometry, toMoles } = require('../lib/stoichiometry');

const sample = [
  { identifier: 'NaCl', canonicalName: 'Sodium chloride', amount: { value: 5, unit: 'g' }, molarMass: 58.44, role: 'reagent' },
  { identifier: 'Essigsäure', canonicalName: 'Acetic acid', amount: { value: 1, unit: 'mmol' }, molarMass: 60.052, role: 'reagent' },
];

describe('toMoles', () => {
  it('converts grams to moles', () => {
    const moles = toMoles({ value: 5, unit: 'g' }, 58.44);
    assert.ok(Math.abs(moles - 0.0855) < 0.0001);
  });

  it('uses density for milliliter inputs', () => {
    const moles = toMoles({ value: 10, unit: 'mL' }, 46.07, 0.789);
    assert.ok(Math.abs(moles - 0.1712) < 0.0001);
  });
});

describe('computeStoichiometry', () => {
  it('finds limiting reagent', () => {
    const result = computeStoichiometry(sample);
    assert.strictEqual(result.limitingReagent.canonicalName, 'Acetic acid');
  });

  it('computes equivalents', () => {
    const result = computeStoichiometry(sample);
    const equivalents = result.reagents.find((r) => r.canonicalName === 'Sodium chloride').equivalents;
    assert.ok(equivalents > 1);
  });

  it('uses product data for theoretical yield when available', () => {
    const reagents = [
      { identifier: 'Reagenz A', canonicalName: 'Reagenz A', amount: { value: 1, unit: 'mol' }, molarMass: 10, role: 'reagent' },
      { identifier: 'Reagenz B', canonicalName: 'Reagenz B', amount: { value: 2, unit: 'mol' }, molarMass: 20, role: 'reagent' },
      { identifier: 'Produkt X', canonicalName: 'Produkt X', amount: null, molarMass: 100, role: 'product' },
    ];
    const result = computeStoichiometry(reagents);
    assert.strictEqual(Math.round(result.theoreticalYield.massGrams), 100);
  });
});
