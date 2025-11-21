const assert = require('assert');
const { parseInput, parseLine } = require('../lib/parser');

describe('parseLine', () => {
  it('extracts amount and identifier', () => {
    const result = parseLine('5 g NaCl');
    assert.strictEqual(result.amount.value, 5);
    assert.strictEqual(result.amount.unit, 'g');
    assert.ok(result.identifier.toLowerCase().includes('nacl'));
  });

  it('detects CAS numbers', () => {
    const result = parseLine('64-19-7 Essigsäure');
    assert.strictEqual(result.casNumber, '64-19-7');
  });
});

describe('parseInput', () => {
  it('splits comma separated inputs', () => {
    const result = parseInput('5 g NaCl, 1 mmol AcOH');
    assert.strictEqual(result.length, 2);
  });

  it('returns empty array for invalid input', () => {
    const result = parseInput(null);
    assert.deepStrictEqual(result, []);
  });
});
