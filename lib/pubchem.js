const FALLBACK_DATABASE = [
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

async function fetchPubChemProperties(identifier, fetchFn) {
  const encoded = encodeURIComponent(identifier);
  const baseUrl = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name';
  const propertyUrl = `${baseUrl}/${encoded}/property/MolecularWeight,IUPACName,IsomericSMILES/JSON`;
  const response = await fetchFn(propertyUrl, { headers: { accept: 'application/json' } });
  if (!response.ok) {
    throw new Error(`PubChem response ${response.status}`);
  }
  const json = await response.json();
  const prop = json?.PropertyTable?.Properties?.[0];
  if (!prop) return null;
  const casNumber = await fetchCasNumber(identifier, fetchFn);
  return {
    canonicalName: prop.IUPACName || identifier,
    molarMass: Number(prop.MolecularWeight) || null,
    smiles: prop.IsomericSMILES || null,
    casNumber,
  };
}

async function fetchCasNumber(identifier, fetchFn) {
  const encoded = encodeURIComponent(identifier);
  const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encoded}/xrefs/RN/JSON`;
  try {
    const response = await fetchFn(url, { headers: { accept: 'application/json' } });
    if (!response.ok) return null;
    const json = await response.json();
    const rns = json?.InformationList?.Information?.[0]?.RN;
    if (Array.isArray(rns) && rns.length > 0) {
      return rns[0];
    }
  } catch (error) {
    return null;
  }
  return null;
}

function resolveFromFallback(identifier) {
  if (!identifier) return { status: 'not_found', suggestions: [] };
  const lower = identifier.toLowerCase();
  const exactCas = FALLBACK_DATABASE.find((entry) => entry.casNumber === identifier);
  if (exactCas) {
    return { status: 'resolved', compound: exactCas };
  }
  const matches = FALLBACK_DATABASE.filter((entry) =>
    entry.synonyms.some((name) => name.toLowerCase() === lower)
  );
  if (matches.length === 1) {
    return { status: 'resolved', compound: matches[0] };
  }
  if (matches.length > 1) {
    return { status: 'ambiguous', suggestions: matches.map((m) => m.canonicalName) };
  }

  const partialMatches = FALLBACK_DATABASE.filter((entry) =>
    entry.synonyms.some((name) => name.toLowerCase().includes(lower))
  );
  if (partialMatches.length === 1) {
    return { status: 'resolved', compound: partialMatches[0] };
  }
  if (partialMatches.length > 1) {
    return { status: 'ambiguous', suggestions: partialMatches.map((m) => m.canonicalName) };
  }
  return { status: 'not_found', suggestions: FALLBACK_DATABASE.map((c) => c.canonicalName) };
}

async function resolveChemical(identifier, options = {}) {
  const fetchFn = options.fetchFn || (typeof fetch !== 'undefined' ? fetch : null);
  if (fetchFn) {
    try {
      const compound = await fetchPubChemProperties(identifier, fetchFn);
      if (compound) {
        return { status: 'resolved', compound };
      }
    } catch (error) {
      // Fallback below
    }
  }
  return resolveFromFallback(identifier);
}

async function annotateWithPubChem(parsedInputs, options = {}) {
  const results = await Promise.all(
    parsedInputs.map(async (entry) => {
      const resolution = await resolveChemical(entry.casNumber || entry.identifier || entry.smiles, options);
      if (resolution.status === 'resolved') {
        return {
          ...entry,
          canonicalName: resolution.compound.canonicalName,
          casNumber: resolution.compound.casNumber || entry.casNumber,
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
    })
  );
  return results;
}

module.exports = {
  annotateWithPubChem,
  resolveChemical,
  fetchPubChemProperties,
  chemicalDatabase: FALLBACK_DATABASE,
};
