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
      if (url.includes('/xrefs/RN')) {
        return {
          ok: true,
          json: async () => ({ InformationList: { Information: [{ RN: ['7732-18-5'] }] } }),
        };
      }
      return {
        ok: true,
        json: async () => ({
          PC_Compounds: [
            {
              props: [
                {
                  urn: { label: 'Density' },
                  value: { fval: 1.0 },
                },
              ],
            },
          ],
        }),
      };
    };
    const result = await resolveChemical('water', { fetchFn: fakeFetch });
    assert.strictEqual(result.status, 'resolved');
    assert.strictEqual(result.compound.casNumber, '7732-18-5');
    assert.strictEqual(result.compound.molarMass, 18.015);
  });

  it('queries PubChem via RN xref when a CAS number is provided', async () => {
    const seenUrls = [];
    const fakeFetch = async (url) => {
      seenUrls.push(url);
      if (url.includes('/property/')) {
        return {
          ok: true,
          json: async () => ({
            PropertyTable: {
              Properties: [{ MolecularWeight: 78.11, IUPACName: 'benzene', IsomericSMILES: 'c1ccccc1' }],
            },
          }),
        };
      }
      return { ok: true, json: async () => ({ PC_Compounds: [{ props: [] }] }) };
    };

    const result = await resolveChemical('71-43-2', { fetchFn: fakeFetch });
    assert.strictEqual(result.status, 'resolved');
    assert.strictEqual(result.compound.casNumber, '71-43-2');
    assert.ok(seenUrls.some((u) => u.includes('/xref/RN/71-43-2/property/')));
    assert.ok(seenUrls.some((u) => u.includes('/xref/RN/71-43-2/JSON')));
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
    assert.strictEqual(result[0].density, 1.049);
    assert.ok(result[0].boilingPointC > 100);
  });

  it('surfaces PubChem data from API', async () => {
    const fakeFetch = async (url) => {
      if (url.includes('/property/')) {
        return {
          ok: true,
          json: async () => ({
            PropertyTable: {
              Properties: [
                { MolecularWeight: 46.07, IUPACName: 'ethanol', IsomericSMILES: 'CCO' },
              ],
            },
          }),
        };
      }
      if (url.includes('/xrefs/RN')) {
        return { ok: true, json: async () => ({ InformationList: { Information: [{ RN: ['64-17-5'] }] } }) };
      }
      return {
        ok: true,
        json: async () => ({
          PC_Compounds: [
            {
              props: [
                {
                  urn: { label: 'Density' },
                  value: { sval: '0.789' },
                },
              ],
            },
          ],
        }),
      };
    };
    const result = await annotateWithPubChem(
      [{ identifier: 'Ethanol', amount: { value: 5, unit: 'g' }, role: 'reagent' }],
      { fetchFn: fakeFetch }
    );
    assert.strictEqual(result[0].casNumber, '64-17-5');
    assert.strictEqual(result[0].molarMass, 46.07);
    assert.strictEqual(result[0].smiles, 'CCO');
    assert.strictEqual(result[0].density, 0.789);
  });
});
