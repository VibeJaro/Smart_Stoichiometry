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
});
