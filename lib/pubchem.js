const FALLBACK_DATABASE = [
  {
    canonicalName: 'Acetic acid',
    casNumber: '64-19-7',
    molarMass: 60.052,
    density: 1.049,
    synonyms: ['acetic acid', 'ethansäure', 'essigsäure', 'acoh'],
    smiles: 'CC(=O)O',
  },
  {
    canonicalName: 'Sodium chloride',
    casNumber: '7647-14-5',
    molarMass: 58.44,
    density: 2.165,
    synonyms: ['sodium chloride', 'nacl', 'kochsalz'],
    smiles: '[Na+].[Cl-]',
  },
  {
    canonicalName: 'Ethanol',
    casNumber: '64-17-5',
    molarMass: 46.07,
    density: 0.789,
    synonyms: ['ethanol', 'ethyl alcohol', 'c2h5oh'],
    smiles: 'CCO',
  },
  {
    canonicalName: 'Hydrochloric acid',
    casNumber: '7647-01-0',
    molarMass: 36.46,
    density: 1.2,
    synonyms: ['hydrochloric acid', 'hcl', 'chlorwasserstoff'],
    smiles: 'Cl',
  },
  {
    canonicalName: 'Water',
    casNumber: '7732-18-5',
    molarMass: 18.015,
    density: 1.0,
    synonyms: ['water', 'h2o', 'wasser'],
    smiles: 'O',
  },
];

async function fetchPubChemProperties(identifier, fetchFn, trace) {
  const encoded = encodeURIComponent(identifier);
  const baseUrl = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name';
  const propertyUrl = `${baseUrl}/${encoded}/property/MolecularWeight,IUPACName,IsomericSMILES/JSON`;

  trace?.push({
    step: 'pubchem-request',
    message: `PubChem PropertyTable Anfrage für "${identifier}"`,
    details: propertyUrl,
  });

  const response = await fetchFn(propertyUrl, { headers: { accept: 'application/json' } });
  if (!response.ok) {
    throw new Error(`PubChem response ${response.status}`);
  }
  const json = await response.json();
  const prop = json?.PropertyTable?.Properties?.[0];
  if (!prop) return null;
  const [casNumber, physchem] = await Promise.all([
    fetchCasNumber(identifier, fetchFn, trace),
    fetchPhysicalProperties(identifier, fetchFn, trace),
  ]);
  const compound = {
    canonicalName: prop.IUPACName || identifier,
    molarMass: Number(prop.MolecularWeight) || null,
    smiles: prop.IsomericSMILES || null,
    casNumber,
    density: physchem?.density ?? null,
    densityUnit: physchem?.densityUnit ?? null,
    boilingPoint: physchem?.boilingPoint ?? null,
    meltingPoint: physchem?.meltingPoint ?? null,
    solubility: physchem?.solubility ?? null,
  };

  trace?.push({
    step: 'pubchem-response',
    message: `PubChem Eigenschaften für "${identifier}" erhalten`,
    details: compound,
  });

  return compound;
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

async function fetchCasNumber(identifier, fetchFn, trace) {
  const encoded = encodeURIComponent(identifier);
  const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encoded}/xrefs/RN/JSON`;
  try {
    trace?.push({ step: 'pubchem-request', message: `CAS-Abfrage für "${identifier}"`, details: url });
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

function extractProperty(props, label) {
  const prop = props?.find((candidate) => candidate?.urn?.label === label);
  if (!prop) return null;
  const valueCandidate =
    prop?.value?.fval ?? prop?.value?.ival ?? prop?.value?.sval ?? prop?.value?.uintv;
  return valueCandidate != null
    ? {
        value: valueCandidate,
        unit: prop?.urn?.unit || null,
      }
    : null;
}

function normalizeNumeric(value) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return Number.isFinite(value) ? Number(value) : null;
}

async function fetchPhysicalProperties(identifier, fetchFn, trace) {
  const encoded = encodeURIComponent(identifier);
  const baseUrl = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name';
  const url = `${baseUrl}/${encoded}/JSON`;
  try {
    trace?.push({ step: 'pubchem-request', message: `Struktur-JSON für "${identifier}"`, details: url });
    const response = await fetchFn(url, { headers: { accept: 'application/json' } });
    if (!response.ok) return null;
    const json = await response.json();
    const compound = json?.PC_Compounds?.[0];
    const props = compound?.props || [];
    const densityProp = extractProperty(props, 'Density');
    const boilingProp = extractProperty(props, 'Boiling Point');
    const meltingProp = extractProperty(props, 'Melting Point');
    const solubilityProp = extractProperty(props, 'Solubility');

    const normalized = {
      density: toDensityNumber(densityProp?.value) ?? null,
      densityUnit: densityProp?.unit || null,
      boilingPoint: boilingProp
        ? { value: normalizeNumeric(boilingProp.value) ?? boilingProp.value, unit: boilingProp.unit || null }
        : null,
      meltingPoint: meltingProp
        ? { value: normalizeNumeric(meltingProp.value) ?? meltingProp.value, unit: meltingProp.unit || null }
        : null,
      solubility: solubilityProp
        ? { value: solubilityProp.value, unit: solubilityProp.unit || null }
        : null,
    };

    trace?.push({
      step: 'pubchem-response',
      message: `Physikalische Daten für "${identifier}" gesammelt`,
      details: normalized,
    });

    return normalized;
  } catch (error) {
    return null;
  }
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
  const trace = options.trace;
  if (fetchFn) {
    try {
      const compound = await fetchPubChemProperties(identifier, fetchFn, trace);
      if (compound) {
        return { status: 'resolved', compound };
      }
    } catch (error) {
      // Fallback below
    }
  }
  const fallback = resolveFromFallback(identifier);
  trace?.push({ step: 'fallback', message: `Fallback genutzt für "${identifier}"`, details: fallback });
  return fallback;
}

async function annotateWithPubChem(parsedInputs, options = {}) {
  const trace = [];

  const results = await Promise.all(
    parsedInputs.map(async (entry) => {
      trace.push({
        step: 'parsed',
        message: `Erkannte Chemikalie: ${entry.identifier}`,
        details: { casNumber: entry.casNumber, smiles: entry.smiles, role: entry.role },
      });

      const resolution = await resolveChemical(entry.casNumber || entry.identifier || entry.smiles, {
        ...options,
        trace,
      });
      if (resolution.status === 'resolved') {
        trace.push({
          step: 'resolved',
          message: `${entry.identifier} → ${resolution.compound.canonicalName}`,
          details: resolution.compound,
        });
        return {
          ...entry,
          canonicalName: resolution.compound.canonicalName,
          casNumber: resolution.compound.casNumber || entry.casNumber,
          molarMass: resolution.compound.molarMass,
          density: resolution.compound.density ?? entry.density ?? null,
          densityUnit: resolution.compound.densityUnit || entry.densityUnit || null,
          boilingPoint: resolution.compound.boilingPoint || null,
          meltingPoint: resolution.compound.meltingPoint || null,
          solubility: resolution.compound.solubility || null,
          smiles: entry.smiles || resolution.compound.smiles,
          status: 'resolved',
          suggestions: [],
        };
      }
      trace.push({
        step: 'unresolved',
        message: `${entry.identifier} konnte nicht eindeutig zugeordnet werden`,
        details: resolution.suggestions,
      });
      return {
        ...entry,
        canonicalName: entry.identifier,
        molarMass: null,
        density: entry.density ?? null,
        densityUnit: entry.densityUnit || null,
        boilingPoint: null,
        meltingPoint: null,
        solubility: null,
        status: resolution.status,
        suggestions: resolution.suggestions,
      };
    })
  );
  return { entries: results, trace };
}

module.exports = {
  annotateWithPubChem,
  resolveChemical,
  fetchPubChemProperties,
  chemicalDatabase: FALLBACK_DATABASE,
};
