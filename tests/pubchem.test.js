const assert = require('assert');
const { resolveChemical, annotateWithPubChem } = require('../lib/pubchem');

describe('resolveChemical', () => {
  it('resolves by CAS number', () => {
    const result = resolveChemical('64-19-7');
    assert.strictEqual(result.status, 'resolved');
    assert.strictEqual(result.compound.canonicalName, 'Acetic acid');
  });

  it('returns ambiguous suggestions', () => {
    const result = resolveChemical('acid');
    assert.strictEqual(result.status, 'ambiguous');
    assert.ok(result.suggestions.length > 1);
  });
});

describe('annotateWithPubChem', () => {
  it('adds molar mass information', () => {
    const result = annotateWithPubChem([{ identifier: 'AcOH', amount: { value: 1, unit: 'g' } }]);
    assert.strictEqual(result[0].molarMass, 60.052);
    assert.strictEqual(result[0].status, 'resolved');
  });
});
