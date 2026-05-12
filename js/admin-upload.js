// ============================================================
// admin-upload.js — CSV bulk upload for catalog items + specs
// ============================================================

// ---- CSV parser (RFC 4180 compatible, handles quoted fields) ----
function parseCSV(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const result = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    const row = [];
    let inQuote = false, cur = '';
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuote && line[i+1] === '"') { cur += '"'; i++; }
        else inQuote = !inQuote;
      } else if (ch === ',' && !inQuote) {
        row.push(cur.trim()); cur = '';
      } else {
        cur += ch;
      }
    }
    row.push(cur.trim());
    result.push(row);
  }
  return result;
}

function csvRowsToObjects(rows) {
  if (rows.length < 2) return [];
  const headers = rows[0].map(h => h.trim().toLowerCase());
  return rows.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (row[i] || '').trim(); });
    return obj;
  });
}

// ---- Template generators ----
function downloadItemsTemplate() {
  const header = 'product_type_name,brand_name,part_number,description,is_active';
  const example = 'Conveyor Roller,Browning,BRW-CR-190-24-0500,"Steel roller, 1.9in dia x 24in BF",true';
  triggerDownload(header + '\n' + example, 'catalog_items_template.csv');
}

function downloadSpecsTemplate() {
  const header = 'part_number,brand_name,spec_field_name,spec_value';
  const example = 'BRW-CR-190-24-0500,Browning,roller_diameter,1.9';
  triggerDownload(header + '\n' + example, 'catalog_item_specs_template.csv');
}

function triggerDownload(content, filename) {
  const blob = new Blob([content], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ---- State ----
let _itemsRows  = null;  // parsed objects from catalog_items CSV
let _specsRows  = null;  // parsed objects from catalog_item_specs CSV
let _refData    = null;  // { productTypes: [], brands: [], specDefs: [] }

// ---- Load reference data once ----
async function loadRefData() {
  if (_refData) return _refData;

  const [ptRes, brandRes, specRes] = await Promise.all([
    sbClient.from('pm_product_types').select('id, name').eq('is_active', true),
    sbClient.from('pm_brands').select('id, name').eq('is_active', true),
    sbClient.from('pm_spec_definitions').select('id, field_name, product_type_id').eq('is_active', true)
  ]);

  if (ptRes.error)    throw new Error('Failed to load product types: ' + ptRes.error.message);
  if (brandRes.error) throw new Error('Failed to load brands: ' + brandRes.error.message);
  if (specRes.error)  throw new Error('Failed to load spec definitions: ' + specRes.error.message);

  _refData = {
    productTypes: ptRes.data,
    brands:       brandRes.data,
    specDefs:     specRes.data
  };
  return _refData;
}

// ---- Preview table renderer ----
function renderPreview(tableEl, rows, maxRows = 5) {
  tableEl.innerHTML = '';
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const thead = document.createElement('thead');
  const hrow  = document.createElement('tr');
  headers.forEach(h => { const th = document.createElement('th'); th.textContent = h; hrow.appendChild(th); });
  thead.appendChild(hrow);
  tableEl.appendChild(thead);

  const tbody = document.createElement('tbody');
  rows.slice(0, maxRows).forEach(row => {
    const tr = document.createElement('tr');
    headers.forEach(h => { const td = document.createElement('td'); td.textContent = row[h]; tr.appendChild(td); });
    tbody.appendChild(tr);
  });
  if (rows.length > maxRows) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = headers.length;
    td.textContent = `… and ${rows.length - maxRows} more rows`;
    td.style.textAlign = 'center'; td.style.color = '#999'; td.style.fontStyle = 'italic';
    tr.appendChild(td); tbody.appendChild(tr);
  }
  tableEl.appendChild(tbody);
}

// ---- Validation ----
const ITEMS_REQUIRED_COLS  = ['product_type_name', 'brand_name', 'part_number'];
const SPECS_REQUIRED_COLS  = ['part_number', 'brand_name', 'spec_field_name', 'spec_value'];

function validateItemsRows(rows) {
  const errors = [];
  if (!rows.length) { errors.push('File has no data rows.'); return errors; }
  const cols = Object.keys(rows[0]);
  ITEMS_REQUIRED_COLS.forEach(c => {
    if (!cols.includes(c)) errors.push(`Missing required column: ${c}`);
  });
  if (errors.length) return errors;

  const seen = new Set();
  rows.forEach((row, i) => {
    const ln = i + 2;
    if (!row.product_type_name) errors.push(`Row ${ln}: product_type_name is empty.`);
    if (!row.brand_name)        errors.push(`Row ${ln}: brand_name is empty.`);
    if (!row.part_number)       errors.push(`Row ${ln}: part_number is empty.`);
    const key = `${row.brand_name}|${row.part_number}`;
    if (seen.has(key)) errors.push(`Row ${ln}: duplicate part_number + brand_name (${row.part_number} / ${row.brand_name}).`);
    seen.add(key);
    if (row.is_active && !['true','false','1','0',''].includes(row.is_active.toLowerCase())) {
      errors.push(`Row ${ln}: is_active must be true or false.`);
    }
  });
  return errors;
}

function validateSpecsRows(rows, itemsRows) {
  const errors = [];
  if (!rows.length) { errors.push('File has no data rows.'); return errors; }
  const cols = Object.keys(rows[0]);
  SPECS_REQUIRED_COLS.forEach(c => {
    if (!cols.includes(c)) errors.push(`Missing required column: ${c}`);
  });
  if (errors.length) return errors;

  const itemKeys = new Set((itemsRows || []).map(r => `${r.brand_name}|${r.part_number}`));

  rows.forEach((row, i) => {
    const ln = i + 2;
    if (!row.part_number)    errors.push(`Row ${ln}: part_number is empty.`);
    if (!row.brand_name)     errors.push(`Row ${ln}: brand_name is empty.`);
    if (!row.spec_field_name) errors.push(`Row ${ln}: spec_field_name is empty.`);
    if (row.spec_value === undefined || row.spec_value === '') errors.push(`Row ${ln}: spec_value is empty.`);
    if (itemsRows && !itemKeys.has(`${row.brand_name}|${row.part_number}`)) {
      errors.push(`Row ${ln}: part_number "${row.part_number}" / brand "${row.brand_name}" not found in items CSV.`);
    }
  });
  return errors;
}

function showValidateMsg(elId, errors) {
  const el = document.getElementById(elId);
  if (errors.length === 0) {
    el.textContent = '✓ Validated — no errors found.';
    el.className = 'upload-validate-msg success';
  } else {
    el.textContent = errors.slice(0, 5).join(' | ') + (errors.length > 5 ? ` (+${errors.length - 5} more)` : '');
    el.className = 'upload-validate-msg error';
  }
  el.classList.remove('hidden');
}

// ---- File input handler ----
function handleFile(file, type) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const rows = csvRowsToObjects(parseCSV(e.target.result));
    if (type === 'items') {
      _itemsRows = rows;
      document.getElementById('items-drop-label').textContent = file.name;
      document.getElementById('items-file-status').textContent = `${rows.length} rows`;
      document.getElementById('items-preview-count').textContent = rows.length;
      renderPreview(document.getElementById('items-preview-table'), rows);
      document.getElementById('items-preview-wrap').classList.remove('hidden');
      const errs = validateItemsRows(rows);
      showValidateMsg('items-validate-msg', errs);
      if (_specsRows) {
        const serrs = validateSpecsRows(_specsRows, _itemsRows);
        showValidateMsg('specs-validate-msg', serrs);
      }
    } else {
      _specsRows = rows;
      document.getElementById('specs-drop-label').textContent = file.name;
      document.getElementById('specs-file-status').textContent = `${rows.length} rows`;
      document.getElementById('specs-preview-count').textContent = rows.length;
      renderPreview(document.getElementById('specs-preview-table'), rows);
      document.getElementById('specs-preview-wrap').classList.remove('hidden');
      const errs = validateSpecsRows(rows, _itemsRows);
      showValidateMsg('specs-validate-msg', errs);
    }
    updateRunBtn();
  };
  reader.readAsText(file);
}

function updateRunBtn() {
  const iOk = _itemsRows && _itemsRows.length > 0 && validateItemsRows(_itemsRows).length === 0;
  const sOk = _specsRows && _specsRows.length > 0 && validateSpecsRows(_specsRows, _itemsRows).length === 0;
  document.getElementById('upload-run-btn').disabled = !(iOk && sOk);
}

// ---- Upload logic ----
async function runUpload() {
  const errEl = document.getElementById('upload-global-error');
  const sucEl = document.getElementById('upload-global-success');
  const logWrap = document.getElementById('upload-log-wrap');
  const logEl   = document.getElementById('upload-log');
  const runBtn  = document.getElementById('upload-run-btn');

  errEl.classList.add('hidden');
  sucEl.classList.add('hidden');
  logWrap.classList.add('hidden');
  logEl.innerHTML = '';
  runBtn.disabled = true;
  runBtn.textContent = 'Uploading…';

  const log = (msg, cls = '') => {
    const p = document.createElement('p');
    p.textContent = msg;
    if (cls) p.className = cls;
    logEl.appendChild(p);
  };

  try {
    const ref = await loadRefData();

    // Build lookup maps (name → id), case-insensitive
    const ptMap    = new Map(ref.productTypes.map(r => [r.name.toLowerCase(), r.id]));
    const brandMap = new Map(ref.brands.map(r => [r.name.toLowerCase(), r.id]));
    // spec defs: map by product_type_id + field_name → spec_def id
    const specMap  = new Map(ref.specDefs.map(r => [`${r.product_type_id}|${r.field_name.toLowerCase()}`, r.id]));

    // ---- Phase 1: Resolve + upsert catalog_items ----
    log('Phase 1: Upserting catalog items…');
    let itemsInserted = 0, itemsUpdated = 0, itemErrors = 0;
    const partToItemId = new Map(); // "brand|part_number" → catalog_item id

    for (const row of _itemsRows) {
      const ptId    = ptMap.get(row.product_type_name.toLowerCase());
      const brandId = brandMap.get(row.brand_name.toLowerCase());

      if (!ptId) {
        log(`  SKIP: Unknown product_type_name "${row.product_type_name}" (part: ${row.part_number})`, 'log-warn');
        itemErrors++; continue;
      }
      if (!brandId) {
        log(`  SKIP: Unknown brand_name "${row.brand_name}" (part: ${row.part_number})`, 'log-warn');
        itemErrors++; continue;
      }

      const isActive = row.is_active === '' || ['true','1'].includes((row.is_active || 'true').toLowerCase());

      // Check if item already exists (by brand_id + part_number)
      const { data: existing } = await sbClient
        .from('pm_catalog_items')
        .select('id')
        .eq('brand_id', brandId)
        .eq('part_number', row.part_number)
        .maybeSingle();

      if (existing) {
        const { error } = await sbClient
          .from('pm_catalog_items')
          .update({ description: row.description || null, is_active: isActive, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        if (error) { log(`  ERROR updating ${row.part_number}: ${error.message}`, 'log-error'); itemErrors++; continue; }
        partToItemId.set(`${row.brand_name.toLowerCase()}|${row.part_number}`, existing.id);
        itemsUpdated++;
        log(`  UPDATED: ${row.brand_name} / ${row.part_number}`, 'log-ok');
      } else {
        const { data: inserted, error } = await sbClient
          .from('pm_catalog_items')
          .insert({ product_type_id: ptId, brand_id: brandId, part_number: row.part_number, description: row.description || null, is_active: isActive })
          .select('id')
          .single();
        if (error) { log(`  ERROR inserting ${row.part_number}: ${error.message}`, 'log-error'); itemErrors++; continue; }
        partToItemId.set(`${row.brand_name.toLowerCase()}|${row.part_number}`, inserted.id);
        itemsInserted++;
        log(`  INSERTED: ${row.brand_name} / ${row.part_number}`, 'log-ok');
      }
    }
    log(`Phase 1 complete: ${itemsInserted} inserted, ${itemsUpdated} updated, ${itemErrors} skipped.`);

    // ---- Phase 2: Upsert catalog_item_specs ----
    log('Phase 2: Upserting catalog item specs…');
    let specsInserted = 0, specsUpdated = 0, specErrors = 0;

    // Need product_type_id per item to resolve spec defs
    // Build brand|part_number → product_type_id from items rows
    const partToPtId = new Map();
    _itemsRows.forEach(r => {
      const ptId = ptMap.get(r.product_type_name.toLowerCase());
      if (ptId) partToPtId.set(`${r.brand_name.toLowerCase()}|${r.part_number}`, ptId);
    });

    // Also fetch existing items not in this upload batch that may have specs
    // (specs CSV may reference items already in DB)
    const missingKeys = [];
    for (const row of _specsRows) {
      const key = `${row.brand_name.toLowerCase()}|${row.part_number}`;
      if (!partToItemId.has(key)) missingKeys.push({ brand: row.brand_name, pn: row.part_number });
    }
    if (missingKeys.length) {
      for (const { brand, pn } of missingKeys) {
        const brandId = brandMap.get(brand.toLowerCase());
        if (!brandId) continue;
        const { data: ex } = await sbClient
          .from('pm_catalog_items')
          .select('id, product_type_id')
          .eq('brand_id', brandId)
          .eq('part_number', pn)
          .maybeSingle();
        if (ex) {
          partToItemId.set(`${brand.toLowerCase()}|${pn}`, ex.id);
          partToPtId.set(`${brand.toLowerCase()}|${pn}`, ex.product_type_id);
        }
      }
    }

    for (const row of _specsRows) {
      const itemKey  = `${row.brand_name.toLowerCase()}|${row.part_number}`;
      const itemId   = partToItemId.get(itemKey);
      const ptId     = partToPtId.get(itemKey);

      if (!itemId) {
        log(`  SKIP: item not found for part "${row.part_number}" / brand "${row.brand_name}"`, 'log-warn');
        specErrors++; continue;
      }

      const specKey = `${ptId}|${row.spec_field_name.toLowerCase()}`;
      const specDefId = specMap.get(specKey);
      if (!specDefId) {
        log(`  SKIP: unknown spec_field_name "${row.spec_field_name}" for product type (pt_id ${ptId})`, 'log-warn');
        specErrors++; continue;
      }

      // Upsert on (catalog_item_id, spec_definition_id)
      const { data: exSpec } = await sbClient
        .from('pm_catalog_item_specs')
        .select('id')
        .eq('catalog_item_id', itemId)
        .eq('spec_definition_id', specDefId)
        .maybeSingle();

      if (exSpec) {
        const { error } = await sbClient
          .from('pm_catalog_item_specs')
          .update({ spec_value: row.spec_value, updated_at: new Date().toISOString() })
          .eq('id', exSpec.id);
        if (error) { log(`  ERROR updating spec ${row.spec_field_name} on ${row.part_number}: ${error.message}`, 'log-error'); specErrors++; continue; }
        specsUpdated++;
      } else {
        const { error } = await sbClient
          .from('pm_catalog_item_specs')
          .insert({ catalog_item_id: itemId, spec_definition_id: specDefId, spec_value: row.spec_value });
        if (error) { log(`  ERROR inserting spec ${row.spec_field_name} on ${row.part_number}: ${error.message}`, 'log-error'); specErrors++; continue; }
        specsInserted++;
      }
    }
    log(`Phase 2 complete: ${specsInserted} inserted, ${specsUpdated} updated, ${specErrors} skipped.`);

    logWrap.classList.remove('hidden');
    sucEl.textContent = `Upload complete. Items: ${itemsInserted} inserted / ${itemsUpdated} updated. Specs: ${specsInserted} inserted / ${specsUpdated} updated.`;
    sucEl.classList.remove('hidden');

  } catch (err) {
    errEl.textContent = 'Upload failed: ' + err.message;
    errEl.classList.remove('hidden');
    logWrap.classList.remove('hidden');
    log('Fatal error: ' + err.message, 'log-error');
  } finally {
    runBtn.disabled = false;
    runBtn.textContent = '↑ Run Upload';
  }
}

// ---- Init ----
function initAdminUpload() {
  _itemsRows = null;
  _specsRows = null;

  // Reset UI
  ['items-drop-label','specs-drop-label'].forEach((id, i) => {
    const labels = ['Click to choose file or drag & drop', 'Click to choose file or drag & drop'];
    document.getElementById(id).textContent = labels[i];
  });
  ['items-file-status','specs-file-status'].forEach(id => document.getElementById(id).textContent = '');
  ['items-preview-wrap','specs-preview-wrap','upload-log-wrap'].forEach(id => document.getElementById(id).classList.add('hidden'));
  ['items-validate-msg','specs-validate-msg','upload-global-error','upload-global-success'].forEach(id => document.getElementById(id).classList.add('hidden'));
  document.getElementById('upload-run-btn').disabled = true;
  document.getElementById('upload-run-btn').textContent = '↑ Run Upload';
}

function bindAdminUploadEvents() {
  document.getElementById('dl-items-btn').addEventListener('click', downloadItemsTemplate);
  document.getElementById('dl-specs-btn').addEventListener('click', downloadSpecsTemplate);

  // File inputs
  document.getElementById('items-file-input').addEventListener('change', e => handleFile(e.target.files[0], 'items'));
  document.getElementById('specs-file-input').addEventListener('change', e => handleFile(e.target.files[0], 'specs'));

  // Drag and drop
  ['items','specs'].forEach(type => {
    const zone = document.getElementById(`${type}-drop-zone`);
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', e => {
      e.preventDefault();
      zone.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file, type);
    });
  });

  document.getElementById('upload-run-btn').addEventListener('click', runUpload);
}
