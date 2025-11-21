const assert = require('assert');
const { resolveChemical, annotateWithPubChem } = require('../lib/pubchem');

describe('resolveChemical', () => {
  it('resolves by CAS number via fallback', async () => {
    const result = await resolveChemical('64-19-7');
    assert.strictEqual(result.status, 'resolved');
    assert.strictEqual(result.compound.canonicalName, 'Acetic acid');
  });

  it('uses PubChem API response when available', async () => {
    const fakeFetch = async (url) => {
      if (url.includes('/property/')) {
        return {
          ok: true,
          json: async () => ({
            PropertyTable: { Properties: [{ MolecularWeight: 18.015, IUPACName: 'water', IsomericSMILES: 'O' }] },
          }),
        };
      }
      return {
        ok: true,
        json: async () => ({ InformationList: { Information: [{ RN: ['7732-18-5'] }] } }),
      };
    };
    const result = await resolveChemical('water', { fetchFn: fakeFetch });
    assert.strictEqual(result.status, 'resolved');
    assert.strictEqual(result.compound.casNumber, '7732-18-5');
    assert.strictEqual(result.compound.molarMass, 18.015);
  });

  it('returns ambiguous suggestions', async () => {
    const result = await resolveChemical('acid');
    assert.strictEqual(result.status, 'ambiguous');
    assert.ok(result.suggestions.length > 1);
  });
});

describe('annotateWithPubChem', () => {
  it('adds molar mass information', async () => {
    const result = await annotateWithPubChem([{ identifier: 'AcOH', amount: { value: 1, unit: 'g' } }]);
    assert.strictEqual(result[0].molarMass, 60.052);
    assert.strictEqual(result[0].status, 'resolved');
  });

  it('surfaces PubChem data from API', async () => {
    const fakeFetch = async (url) => {
      if (url.includes('/property/')) {
        return {
          ok: true,
          json: async () => ({
            PropertyTable: { Properties: [{ MolecularWeight: 46.07, IUPACName: 'ethanol', IsomericSMILES: 'CCO' }] },
          }),
        };
      }
      return { ok: true, json: async () => ({ InformationList: { Information: [{ RN: ['64-17-5'] }] } }) };
    };
    const result = await annotateWithPubChem(
      [{ identifier: 'Ethanol', amount: { value: 5, unit: 'g' }, role: 'reagent' }],
      { fetchFn: fakeFetch }
    );
    assert.strictEqual(result[0].casNumber, '64-17-5');
    assert.strictEqual(result[0].molarMass, 46.07);
    assert.strictEqual(result[0].smiles, 'CCO');
  });
});
