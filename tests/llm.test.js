const assert = require('assert');
const { extractChemicalsWithLLM } = require('../lib/llm');

describe('extractChemicalsWithLLM', () => {
  it('uses fallback parser when no API key is provided', async () => {
    const result = await extractChemicalsWithLLM('5 g NaCl');
    assert.strictEqual(result[0].identifier.toLowerCase().includes('nacl'), true);
    assert.ok(result[0].amount);
  });

  it('parses LLM JSON content and returns structured chemicals', async () => {
    const fakeFetch = async () => ({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                chemicals: [
                  {
                    name: 'Ethanol',
                    casNumber: '64-17-5',
                    smiles: 'CCO',
                    amount: { value: 2, unit: 'g' },
                    role: 'reagent',
                  },
                  {
                    name: 'Diethylether',
                    casNumber: '60-29-7',
                    smiles: 'CCOCC',
                    amount: null,
                    role: 'product',
                  },
                ],
              }),
            },
          },
        ],
      }),
    });

    const result = await extractChemicalsWithLLM('2 g Ethanol', {
      llmApiKey: 'test-key',
      fetchFn: fakeFetch,
    });

    assert.strictEqual(result.length, 2);
    assert.strictEqual(result[0].casNumber, '64-17-5');
    assert.strictEqual(result[0].smiles, 'CCO');
    assert.strictEqual(result[0].amount.value, 2);
    assert.strictEqual(result[1].role, 'product');
  });

  it('falls back to parsed input when the LLM call fails', async () => {
    const failingFetch = async () => {
      throw new Error('network failure');
    };
    const result = await extractChemicalsWithLLM('1 mol water', {
      llmApiKey: 'test-key',
      fetchFn: failingFetch,
    });
    assert.strictEqual(result[0].identifier.toLowerCase().includes('water'), true);
  });
});
