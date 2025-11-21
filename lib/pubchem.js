const chemicalDatabase = [
  {
    canonicalName: 'Acetic acid',
    casNumber: '64-19-7',
    molarMass: 60.052,
    synonyms: ['acetic acid', 'ethansäure', 'essigsäure', 'acoh'],
    smiles: 'CC(=O)O',
  },
  {
    canonicalName: 'Sodium chloride',
    casNumber: '7647-14-5',
    molarMass: 58.44,
    synonyms: ['sodium chloride', 'nacl', 'kochsalz'],
    smiles: '[Na+].[Cl-]',
  },
  {
    canonicalName: 'Ethanol',
    casNumber: '64-17-5',
    molarMass: 46.07,
    synonyms: ['ethanol', 'ethyl alcohol', 'c2h5oh'],
    smiles: 'CCO',
  },
  {
    canonicalName: 'Hydrochloric acid',
    casNumber: '7647-01-0',
    molarMass: 36.46,
    synonyms: ['hydrochloric acid', 'hcl', 'chlorwasserstoff'],
    smiles: 'Cl',
  },
  {
    canonicalName: 'Water',
    casNumber: '7732-18-5',
    molarMass: 18.015,
    synonyms: ['water', 'h2o', 'wasser'],
    smiles: 'O',
  },
];

function resolveChemical(identifier) {
  if (!identifier) {
    return { status: 'not_found', suggestions: [] };
  }
  const lower = identifier.toLowerCase();
  const exactCas = chemicalDatabase.find((entry) => entry.casNumber === identifier);
  if (exactCas) {
    return { status: 'resolved', compound: exactCas };
  }
  const matches = chemicalDatabase.filter((entry) =>
    entry.synonyms.some((name) => name.toLowerCase() === lower)
  );
  if (matches.length === 1) {
    return { status: 'resolved', compound: matches[0] };
  }
  if (matches.length > 1) {
    return { status: 'ambiguous', suggestions: matches.map((m) => m.canonicalName) };
  }

  const partialMatches = chemicalDatabase.filter((entry) =>
    entry.synonyms.some((name) => name.toLowerCase().includes(lower))
  );
  if (partialMatches.length === 1) {
    return { status: 'resolved', compound: partialMatches[0] };
  }
  if (partialMatches.length > 1) {
    return { status: 'ambiguous', suggestions: partialMatches.map((m) => m.canonicalName) };
  }
  return { status: 'not_found', suggestions: chemicalDatabase.map((c) => c.canonicalName) };
}

function annotateWithPubChem(parsedInputs) {
  return parsedInputs.map((entry) => {
    const resolution = resolveChemical(entry.casNumber || entry.identifier || entry.smiles);
    if (resolution.status === 'resolved') {
      return {
        ...entry,
        canonicalName: resolution.compound.canonicalName,
        casNumber: resolution.compound.casNumber,
        molarMass: resolution.compound.molarMass,
        smiles: entry.smiles || resolution.compound.smiles,
        status: 'resolved',
        suggestions: [],
      };
    }
    return {
      ...entry,
      canonicalName: entry.identifier,
      molarMass: null,
      status: resolution.status,
      suggestions: resolution.suggestions,
    };
  });
}

module.exports = {
  annotateWithPubChem,
  resolveChemical,
  chemicalDatabase,
};
