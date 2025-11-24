const FALLBACK_DATABASE = [
  {
    canonicalName: 'Acetic acid',
    casNumber: '64-19-7',
    molarMass: 60.052,
    density: 1.049,
    boilingPointC: 118.1,
    meltingPointC: 16.6,
    solubility: 'Mischbar',
    synonyms: ['acetic acid', 'ethansäure', 'essigsäure', 'acoh'],
    smiles: 'CC(=O)O',
  },
  {
    canonicalName: 'Sodium chloride',
    casNumber: '7647-14-5',
    molarMass: 58.44,
    density: 2.165,
    boilingPointC: 1465,
    meltingPointC: 801,
    solubility: '357 g/L (25 °C, Wasser)',
    synonyms: ['sodium chloride', 'nacl', 'kochsalz'],
    smiles: '[Na+].[Cl-]',
  },
  {
    canonicalName: 'Ethanol',
    casNumber: '64-17-5',
    molarMass: 46.07,
    density: 0.789,
    boilingPointC: 78.37,
    meltingPointC: -114.1,
    solubility: 'Mischbar mit Wasser',
    synonyms: ['ethanol', 'ethyl alcohol', 'c2h5oh'],
    smiles: 'CCO',
  },
  {
    canonicalName: 'Hydrochloric acid',
    casNumber: '7647-01-0',
    molarMass: 36.46,
    density: 1.2,
    boilingPointC: -85,
    meltingPointC: -114,
    solubility: 'Leicht löslich in Wasser',
    synonyms: ['hydrochloric acid', 'hcl', 'chlorwasserstoff'],
    smiles: 'Cl',
  },
  {
    canonicalName: 'Water',
    casNumber: '7732-18-5',
    molarMass: 18.015,
    density: 1.0,
    boilingPointC: 100,
    meltingPointC: 0,
    solubility: 'Unbegrenzt (Selbst)',
    synonyms: ['water', 'h2o', 'wasser'],
    smiles: 'O',
  },
];

async function fetchPubChemProperties(identifier, fetchFn) {
  // PUG REST: https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/<name>/property/{PropertyList}/JSON
  // BoilingPoint/MeltingPoint are part of the standard property list; density/solubility are pulled from the full JSON record (/JSON).
  const encoded = encodeURIComponent(identifier);
  const baseUrl = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name';
  const propertyUrl = `${baseUrl}/${encoded}/property/MolecularWeight,IUPACName,IsomericSMILES,BoilingPoint,MeltingPoint/JSON`;
  const response = await fetchFn(propertyUrl, { headers: { accept: 'application/json' } });
  if (!response.ok) {
    throw new Error(`PubChem response ${response.status}`);
  }
  const json = await response.json();
  const prop = json?.PropertyTable?.Properties?.[0];
  if (!prop) return null;
  const [casNumber, physicalProps] = await Promise.all([
    fetchCasNumber(identifier, fetchFn),
    fetchPhysicalProperties(identifier, fetchFn),
  ]);
  return {
    canonicalName: prop.IUPACName || identifier,
    molarMass: Number(prop.MolecularWeight) || null,
    smiles: prop.IsomericSMILES || null,
    density: physicalProps.density,
    boilingPointC: normalizeNumber(prop.BoilingPoint) ?? physicalProps.boilingPointC,
    meltingPointC: normalizeNumber(prop.MeltingPoint) ?? physicalProps.meltingPointC,
    solubility: physicalProps.solubility,
    casNumber,
  };
}

function toDensityNumber(rawDensity) {
  if (!rawDensity) return null;
  const parsed =
    typeof rawDensity === 'number'
      ? rawDensity
      : typeof rawDensity === 'string'
        ? parseFloat(rawDensity)
        : Number(rawDensity);
  const density = Number(parsed);
  return Number.isFinite(density) ? density : null;
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

async function fetchDensity(identifier, fetchFn) {
  const encoded = encodeURIComponent(identifier);
  const baseUrl = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name';
  const url = `${baseUrl}/${encoded}/JSON`;
  try {
    const response = await fetchFn(url, { headers: { accept: 'application/json' } });
    if (!response.ok) return null;
    const json = await response.json();
    const compound = json?.PC_Compounds?.[0];
    const densityProp = compound?.props?.find((prop) => prop?.urn?.label === 'Density');
    if (!densityProp) return null;
    const rawValue =
      densityProp?.value?.fval ??
      densityProp?.value?.ival ??
      densityProp?.value?.sval ??
      densityProp?.value?.uintv;
    return toDensityNumber(rawValue);
  } catch (error) {
    return null;
  }
}

async function fetchPhysicalProperties(identifier, fetchFn) {
  const encoded = encodeURIComponent(identifier);
  const baseUrl = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name';
  const url = `${baseUrl}/${encoded}/JSON`;
  try {
    const response = await fetchFn(url, { headers: { accept: 'application/json' } });
    if (!response.ok) return {};
    const json = await response.json();
    const compound = json?.PC_Compounds?.[0];
    if (!compound?.props) return {};
    const density = toDensityNumber(extractPropValue(compound.props, 'density'));
    const boilingPointC = normalizeNumber(extractPropValue(compound.props, 'boiling point'));
    const meltingPointC = normalizeNumber(extractPropValue(compound.props, 'melting point'));
    const solubility = extractSolubility(compound.props);
    return { density, boilingPointC, meltingPointC, solubility };
  } catch (error) {
    return {};
  }
}

function extractSolubility(props = []) {
  const match = props.find((prop) => (prop?.urn?.label || '').toLowerCase().includes('solubility'));
  if (!match) return null;
  const rawValue =
    match?.value?.sval ?? match?.value?.fval ?? match?.value?.ival ?? match?.value?.uintv ?? match?.value?.urval;
  if (!rawValue && match?.value?.unit) {
    return match.value.unit;
  }
  if (typeof rawValue === 'number') return `${rawValue} ${match?.value?.unit || ''}`.trim();
  if (typeof rawValue === 'string') return rawValue;
  return null;
}

function extractPropValue(props = [], labelFragment) {
  const lowerFragment = labelFragment.toLowerCase();
  const match = props.find((prop) => (prop?.urn?.label || '').toLowerCase().includes(lowerFragment));
  if (!match) return null;
  return match?.value?.fval ?? match?.value?.ival ?? match?.value?.sval ?? match?.value?.uintv ?? null;
}

function normalizeNumber(value) {
  if (value === null || value === undefined) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
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
  const steps = options.steps;
  if (fetchFn) {
    try {
      const compound = await fetchPubChemProperties(identifier, fetchFn);
      if (steps) {
        steps.push(`PubChem: property lookup für "${identifier}" via PUG REST /property und /JSON Routen ausgeführt.`);
      }
      if (compound) {
        return { status: 'resolved', compound };
      }
    } catch (error) {
      if (steps) {
        steps.push(`PubChem: Anfrage für "${identifier}" fehlgeschlagen, nutze lokalen Fallback (${error.message}).`);
      }
      // Fallback below
    }
  } else if (steps) {
    steps.push('Kein Fetch verfügbar: nutze lokalen Fallback-Datensatz.');
  }
  const fallback = resolveFromFallback(identifier);
  if (steps && fallback.status === 'resolved') {
    steps.push(`Lokaler Fallback genutzt: ${fallback.compound.canonicalName} für "${identifier}".`);
  }
  return fallback;
}

async function annotateWithPubChem(parsedInputs, options = {}) {
  const steps = options.steps;
  const results = await Promise.all(
    parsedInputs.map(async (entry) => {
      const lookupId = entry.casNumber || entry.identifier || entry.smiles;
      if (steps) {
        steps.push(`Chemikalie erkannt: ${entry.identifier} (Rolle: ${entry.role || 'unbekannt'}). Suche nach "${lookupId}".`);
      }
      const resolution = await resolveChemical(lookupId, options);
      if (resolution.status === 'resolved') {
        return {
          ...entry,
          canonicalName: resolution.compound.canonicalName,
          casNumber: resolution.compound.casNumber || entry.casNumber,
          molarMass: resolution.compound.molarMass,
          density: resolution.compound.density ?? entry.density ?? null,
          boilingPointC: resolution.compound.boilingPointC ?? null,
          meltingPointC: resolution.compound.meltingPointC ?? null,
          solubility: resolution.compound.solubility ?? null,
          smiles: entry.smiles || resolution.compound.smiles,
          status: 'resolved',
          suggestions: [],
        };
      }
      return {
        ...entry,
        canonicalName: entry.identifier,
        molarMass: null,
        density: entry.density ?? null,
        boilingPointC: null,
        meltingPointC: null,
        solubility: null,
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
  fetchPhysicalProperties,
  chemicalDatabase: FALLBACK_DATABASE,
};
