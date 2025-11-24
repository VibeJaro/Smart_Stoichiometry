const form = document.getElementById('stoich-form');
const textarea = document.getElementById('stoich-input');
const submitBtn = document.getElementById('stoich-submit');
const output = document.getElementById('stoich-output');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  submitBtn.disabled = true;
  submitBtn.textContent = 'Analysiere…';
  output.innerHTML = '';

  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: textarea.value }),
    });
    const data = await response.json();
    renderResults(data);
  } catch (error) {
    output.innerHTML = `<div class="warning">Analyse fehlgeschlagen: ${error.message}</div>`;
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Analyse starten';
  }
});

function renderResults(result) {
  if (!result || !Array.isArray(result.reagents)) {
    output.innerHTML = '<div class="warning">Keine Auswertung möglich.</div>';
    return;
  }

  const warnings = (result.warnings || [])
    .map((w) => `<div class="warning">${w}</div>`)
    .join('');

  const rows = result.reagents
    .map(
      (r) => `
        <tr>
          <td>${r.canonicalName || r.identifier}</td>
          <td>${formatAmount(r.amount)}</td>
          <td>${formatNumber(r.molarMass, ' g/mol')}</td>
          <td>${formatNumber(r.density, ' g/mL')}</td>
          <td>${formatNumber(r.moles, ' mol')}</td>
          <td>${formatNumber(r.equivalents)}</td>
          <td><span class="badge ${r.status !== 'resolved' ? 'status-unresolved' : ''}">${r.status || 'unbekannt'}</span></td>
        </tr>
      `
    )
    .join('');

  const propertyRows = result.reagents
    .map(
      (r) => `
        <tr>
          <td>${r.canonicalName || r.identifier}</td>
          <td>${formatNumber(r.density, ' g/mL')}</td>
          <td>${formatNumber(r.boilingPointC, ' °C')}</td>
          <td>${formatNumber(r.meltingPointC, ' °C')}</td>
          <td>${r.solubility || '–'}</td>
        </tr>
      `
    )
    .join('');

  const limiting = result.limitingReagent
    ? `<div class="badge">Limiting reagent: ${result.limitingReagent.canonicalName}</div>`
    : '';

  const theoretical = result.theoreticalYield
    ? `<div class="badge">Theoretische Ausbeute: ${formatNumber(result.theoreticalYield.massGrams, ' g')}</div>`
    : '';

  const jsonView = `<pre>${escapeHtml(JSON.stringify(result, null, 2))}</pre>`;

  const steps = (result.steps || [])
    .map((step) => `<li>${escapeHtml(step)}</li>`)
    .join('');

  output.innerHTML = `
    ${warnings}
    <div class="card">
      <div style="display:flex; gap: 12px; align-items:center; flex-wrap:wrap;">${limiting} ${theoretical}</div>
      <table class="table" aria-label="Reagenzien Tabelle">
        <thead>
          <tr>
            <th>Name</th><th>Menge</th><th>Molmasse</th><th>Dichte</th><th>Stoffmenge</th><th>Äquivalente</th><th>Status</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <h4>Stoffdaten</h4>
      <table class="table" aria-label="Stoffdaten Tabelle">
        <thead>
          <tr>
            <th>Name</th><th>Dichte</th><th>Siedepunkt</th><th>Schmelzpunkt</th><th>Löslichkeit</th>
          </tr>
        </thead>
        <tbody>${propertyRows}</tbody>
      </table>
      <details style="margin-top: 12px;">
        <summary style="cursor:pointer; font-weight:600;">Verarbeitungs-Schritte</summary>
        <ol style="margin-top:8px; padding-left:18px;">${steps}</ol>
      </details>
      <h4>JSON Output</h4>
      ${jsonView}
    </div>
  `;
}

function formatAmount(amount) {
  if (!amount) return '–';
  return `${amount.value} ${amount.unit}`;
}

function formatNumber(value, suffix = '') {
  if (typeof value !== 'number' || Number.isNaN(value)) return '–';
  return `${value.toFixed(3)}${suffix}`;
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (tag) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[tag]));
}
