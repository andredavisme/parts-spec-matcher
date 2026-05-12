// ===== ADMIN: CATALOG ITEMS =====
// Requires: sbClient (config.js)

let catItems     = [];  // [{id, product_type_id, brand_id, part_number, description, is_active, specCount}]
let catBrands    = [];  // [{id, name}]
let catPtData    = [];  // [{id, name, category_id, category_name}]
let catSpecDefs  = [];  // all active spec_definitions [{id, product_type_id, name, display_label, unit_id}]
let catUnits     = [];  // [{id, name, abbreviation}]

let catFilterCatId   = '';
let catFilterPtId    = '';
let catFilterBrandId = '';

// ---- Helper: resolve raw string input to {value_numeric, value_text} ----
function catResolveSpecValue(raw) {
  const trimmed = raw.trim();
  const num = parseFloat(trimmed);
  if (!isNaN(num) && String(num) === trimmed) {
    return { value_numeric: num, value_text: null };
  }
  return { value_numeric: null, value_text: trimmed };
}

// ---- Helper: get display string from a spec row {value_text, value_numeric} ----
function catSpecDisplayValue(s) {
  if (s.value_numeric !== null && s.value_numeric !== undefined) return String(s.value_numeric);
  if (s.value_text    !== null && s.value_text    !== undefined) return s.value_text;
  return '';
}

// ---- Init ----
async function initAdminCatalog() {
  const loadingEl = document.getElementById('cat-loading');
  const errorEl   = document.getElementById('cat-error');
  const wrapEl    = document.getElementById('cat-table-wrap');

  loadingEl.textContent = 'Loading…';
  loadingEl.classList.remove('hidden');
  errorEl.classList.add('hidden');
  wrapEl.classList.add('hidden');

  try {
    await loadCatRefData();
    await loadCatItems();
    populateCatFilters();
    renderCatTable();
    loadingEl.classList.add('hidden');
    wrapEl.classList.remove('hidden');
  } catch (err) {
    loadingEl.classList.add('hidden');
    showCatError(err.message);
  }
}

async function loadCatRefData() {
  const [brandsRes, ptsRes, catsRes, specsRes, unitsRes] = await Promise.all([
    sbClient.from('pm_brands').select('id, name').eq('is_active', true).order('name'),
    sbClient.from('pm_product_types').select('id, name, category_id').eq('is_active', true).order('name'),
    sbClient.from('pm_product_categories').select('id, name').order('name'),
    sbClient.from('pm_spec_definitions').select('id, product_type_id, name, display_label, unit_id').eq('is_active', true).order('sort_order'),
    sbClient.from('pm_spec_units').select('id, name, abbreviation').order('id')
  ]);

  if (brandsRes.error) throw brandsRes.error;
  if (ptsRes.error)    throw ptsRes.error;
  if (catsRes.error)   throw catsRes.error;
  if (specsRes.error)  throw specsRes.error;
  if (unitsRes.error)  throw unitsRes.error;

  catBrands = brandsRes.data;
  catUnits  = unitsRes.data;
  catSpecDefs = specsRes.data;

  const catMap = Object.fromEntries(catsRes.data.map(c => [c.id, c.name]));
  catPtData = ptsRes.data.map(pt => ({ ...pt, category_name: catMap[pt.category_id] || '' }));
}

async function loadCatItems() {
  const { data: items, error: iErr } = await sbClient
    .from('pm_catalog_items')
    .select('id, product_type_id, brand_id, part_number, description, is_active')
    .order('product_type_id')
    .order('brand_id')
    .order('part_number');
  if (iErr) throw iErr;

  const { data: specRows, error: sErr } = await sbClient
    .from('pm_catalog_item_specs')
    .select('catalog_item_id');
  if (sErr) throw sErr;

  const countMap = {};
  (specRows || []).forEach(r => {
    countMap[r.catalog_item_id] = (countMap[r.catalog_item_id] || 0) + 1;
  });

  catItems = (items || []).map(item => ({ ...item, specCount: countMap[item.id] || 0 }));
}

// ---- Filters ----
function populateCatFilters() {
  const catSel   = document.getElementById('cat-filter-cat');
  const ptSel    = document.getElementById('cat-filter-pt');
  const brandSel = document.getElementById('cat-filter-brand');

  const seenCats = new Map();
  catPtData.forEach(pt => {
    if (!seenCats.has(pt.category_id)) seenCats.set(pt.category_id, pt.category_name);
  });
  catSel.innerHTML = '<option value="">All Categories</option>';
  [...seenCats.entries()].sort((a,b) => a[1].localeCompare(b[1])).forEach(([id, name]) => {
    const o = document.createElement('option'); o.value = id; o.textContent = name;
    catSel.appendChild(o);
  });

  ptSel.innerHTML = '<option value="">All Product Types</option>';
  catPtData.forEach(pt => {
    const o = document.createElement('option'); o.value = pt.id; o.textContent = pt.name;
    ptSel.appendChild(o);
  });

  const usedBrandIds = new Set(catItems.map(i => i.brand_id));
  const usedBrands = catBrands.filter(b => usedBrandIds.has(b.id));
  brandSel.innerHTML = '<option value="">All Brands</option>';
  usedBrands.forEach(b => {
    const o = document.createElement('option'); o.value = b.id; o.textContent = b.name;
    brandSel.appendChild(o);
  });

  catSel.addEventListener('change', () => {
    catFilterCatId   = catSel.value;
    catFilterPtId    = '';
    catFilterBrandId = '';
    ptSel.value = ''; brandSel.value = '';
    ptSel.innerHTML = '<option value="">All Product Types</option>';
    const filtered = catFilterCatId
      ? catPtData.filter(pt => String(pt.category_id) === String(catFilterCatId))
      : catPtData;
    filtered.forEach(pt => {
      const o = document.createElement('option'); o.value = pt.id; o.textContent = pt.name;
      ptSel.appendChild(o);
    });
    renderCatTable();
  });

  ptSel.addEventListener('change', () => {
    catFilterPtId = ptSel.value;
    renderCatTable();
  });

  brandSel.addEventListener('change', () => {
    catFilterBrandId = brandSel.value;
    renderCatTable();
  });
}

function filteredCatItems() {
  let items = catItems;
  if (catFilterPtId) {
    items = items.filter(i => String(i.product_type_id) === String(catFilterPtId));
  } else if (catFilterCatId) {
    const ptIds = catPtData
      .filter(pt => String(pt.category_id) === String(catFilterCatId))
      .map(pt => pt.id);
    items = items.filter(i => ptIds.includes(i.product_type_id));
  }
  if (catFilterBrandId) {
    items = items.filter(i => String(i.brand_id) === String(catFilterBrandId));
  }
  return items;
}

// ---- Render table ----
function renderCatTable() {
  const tbody = document.getElementById('cat-tbody');
  tbody.innerHTML = '';

  const items = filteredCatItems();
  if (items.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td colspan="7" style="text-align:center;color:#aaa;padding:2rem">No catalog items found.</td>';
    tbody.appendChild(tr);
    return;
  }

  const brandMap = Object.fromEntries(catBrands.map(b => [b.id, b.name]));
  const ptMap    = Object.fromEntries(catPtData.map(pt => [pt.id, pt]));

  const groups = [];
  const groupMap = {};
  items.forEach(item => {
    if (!groupMap[item.product_type_id]) {
      const g = { pt: ptMap[item.product_type_id], items: [] };
      groups.push(g);
      groupMap[item.product_type_id] = g;
    }
    groupMap[item.product_type_id].items.push(item);
  });

  groups.forEach(({ pt, items: groupItems }) => {
    const catName = pt ? pt.category_name : '';
    const ptName  = pt ? pt.name : `PT ${groupItems[0].product_type_id}`;

    const hdr = document.createElement('tr');
    hdr.className = 'pt-group-row';
    hdr.innerHTML = `<td colspan="7">${catName ? catName + ' &rsaquo; ' : ''}${ptName}</td>`;
    tbody.appendChild(hdr);

    groupItems.forEach(item => {
      const brandName = brandMap[item.brand_id] || `Brand ${item.brand_id}`;
      const tr = document.createElement('tr');
      if (!item.is_active) tr.classList.add('inactive-row');
      tr.dataset.itemId = item.id;
      tr.innerHTML = `
        <td>${ptName}</td>
        <td>${brandName}</td>
        <td class="mono">${item.part_number}</td>
        <td class="desc-cell">${item.description || '<span style="color:#bbb">—</span>'}</td>
        <td style="text-align:center">
          <span class="badge-active ${item.specCount > 0 ? 'badge-on' : 'badge-off'}">${item.specCount} spec${item.specCount !== 1 ? 's' : ''}</span>
        </td>
        <td>
          <span class="badge-active ${item.is_active ? 'badge-on' : 'badge-off'}">${item.is_active ? 'Active' : 'Off'}</span>
        </td>
        <td class="col-actions">
          <button class="btn-edit" data-id="${item.id}">Edit</button>
          <button class="${item.is_active ? 'btn-deactivate' : 'btn-activate'}" data-id="${item.id}">
            ${item.is_active ? 'Deactivate' : 'Activate'}
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  });

  tbody.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', () => openCatModal(parseInt(btn.dataset.id)));
  });
  tbody.querySelectorAll('.btn-deactivate, .btn-activate').forEach(btn => {
    btn.addEventListener('click', () => toggleCatActive(parseInt(btn.dataset.id)));
  });
}

async function toggleCatActive(itemId) {
  const item = catItems.find(i => i.id === itemId);
  if (!item) return;
  const newVal = !item.is_active;
  const { error } = await sbClient
    .from('pm_catalog_items')
    .update({ is_active: newVal })
    .eq('id', itemId);
  if (error) { showCatError(error.message); return; }
  item.is_active = newVal;
  showCatSuccess(`"${item.part_number}" ${newVal ? 'activated' : 'deactivated'}.`);
  renderCatTable();
}

// ---- Modal ----
let catModalSpecDefs = [];  // spec defs for the currently selected product type
// {spec_definition_id: { value_text, value_numeric }} for item being edited
let catModalExistingSpecs = {};

async function openCatModal(itemId) {
  const item = itemId ? catItems.find(i => i.id === itemId) : null;
  document.getElementById('cat-modal-title').textContent = item ? 'Edit Catalog Item' : 'Add Catalog Item';
  document.getElementById('cat-modal-item-id').value = item ? item.id : '';

  const ptSel = document.getElementById('cat-modal-pt');
  ptSel.innerHTML = '<option value="">&mdash; Select &mdash;</option>';
  catPtData.forEach(pt => {
    const o = document.createElement('option');
    o.value = pt.id;
    o.textContent = pt.name;
    if (item && item.product_type_id === pt.id) o.selected = true;
    ptSel.appendChild(o);
  });

  const brandSel = document.getElementById('cat-modal-brand');
  brandSel.innerHTML = '<option value="">&mdash; Select &mdash;</option>';
  catBrands.forEach(b => {
    const o = document.createElement('option');
    o.value = b.id;
    o.textContent = b.name;
    if (item && item.brand_id === b.id) o.selected = true;
    brandSel.appendChild(o);
  });

  document.getElementById('cat-modal-partnum').value  = item ? item.part_number : '';
  document.getElementById('cat-modal-desc').value     = item ? (item.description || '') : '';
  document.getElementById('cat-modal-active').checked = item ? item.is_active : true;
  document.getElementById('cat-modal-error').classList.add('hidden');

  // FIX: select value_text and value_numeric (not spec_value)
  catModalExistingSpecs = {};
  if (item) {
    const { data: existingSpecs, error: sErr } = await sbClient
      .from('pm_catalog_item_specs')
      .select('spec_definition_id, value_text, value_numeric')
      .eq('catalog_item_id', item.id);
    if (!sErr && existingSpecs) {
      existingSpecs.forEach(s => {
        catModalExistingSpecs[s.spec_definition_id] = { value_text: s.value_text, value_numeric: s.value_numeric };
      });
    }
    await loadCatModalSpecs(item.product_type_id);
  } else {
    document.getElementById('cat-modal-specs-loading').textContent = 'Select a product type to load spec fields.';
    document.getElementById('cat-modal-specs-loading').classList.remove('hidden');
    document.getElementById('cat-modal-specs-grid').innerHTML = '';
  }

  document.getElementById('cat-modal-overlay').classList.remove('hidden');
}

async function loadCatModalSpecs(productTypeId) {
  const loadingEl = document.getElementById('cat-modal-specs-loading');
  const gridEl    = document.getElementById('cat-modal-specs-grid');

  if (!productTypeId) {
    loadingEl.textContent = 'Select a product type to load spec fields.';
    loadingEl.classList.remove('hidden');
    gridEl.innerHTML = '';
    catModalSpecDefs = [];
    return;
  }

  loadingEl.textContent = 'Loading spec fields…';
  loadingEl.classList.remove('hidden');
  gridEl.innerHTML = '';

  catModalSpecDefs = catSpecDefs.filter(s => s.product_type_id === parseInt(productTypeId));
  loadingEl.classList.add('hidden');

  if (catModalSpecDefs.length === 0) {
    loadingEl.textContent = 'No spec definitions found for this product type.';
    loadingEl.classList.remove('hidden');
    return;
  }

  const unitMap = Object.fromEntries(catUnits.map(u => [u.id, u]));

  catModalSpecDefs.forEach(spec => {
    const unit = unitMap[spec.unit_id];
    const unitHint = unit ? ` <span class="unit-hint">(${unit.abbreviation || unit.name})</span>` : '';
    // FIX: derive display value from value_text / value_numeric
    const existing = catModalExistingSpecs[spec.id];
    const existingVal = existing ? catSpecDisplayValue(existing) : '';

    const div = document.createElement('div');
    div.className = 'field';
    div.innerHTML = `
      <label for="spec-field-${spec.id}">${spec.display_label}${unitHint}</label>
      <input type="text" id="spec-field-${spec.id}" data-spec-id="${spec.id}" value="${existingVal}" placeholder="" />
    `;
    gridEl.appendChild(div);
  });
}

function closeCatModal() {
  document.getElementById('cat-modal-overlay').classList.add('hidden');
}

async function saveCatItem(e) {
  e.preventDefault();
  const errEl = document.getElementById('cat-modal-error');
  errEl.classList.add('hidden');

  const itemId   = document.getElementById('cat-modal-item-id').value;
  const ptId     = parseInt(document.getElementById('cat-modal-pt').value);
  const brandId  = parseInt(document.getElementById('cat-modal-brand').value);
  const partNum  = document.getElementById('cat-modal-partnum').value.trim();
  const desc     = document.getElementById('cat-modal-desc').value.trim();
  const isActive = document.getElementById('cat-modal-active').checked;

  if (!ptId || !brandId || !partNum) {
    errEl.textContent = 'Product type, brand, and part number are required.';
    errEl.classList.remove('hidden');
    return;
  }

  const saveBtn = document.getElementById('cat-modal-save-btn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving…';

  try {
    let savedItemId = itemId ? parseInt(itemId) : null;

    if (itemId) {
      const { error } = await sbClient.from('pm_catalog_items').update({
        product_type_id: ptId,
        brand_id: brandId,
        part_number: partNum,
        description: desc || null,
        is_active: isActive
      }).eq('id', parseInt(itemId));
      if (error) throw error;

      const existing = catItems.find(i => i.id === parseInt(itemId));
      if (existing) Object.assign(existing, { product_type_id: ptId, brand_id: brandId, part_number: partNum, description: desc || null, is_active: isActive });

    } else {
      const { data, error } = await sbClient.from('pm_catalog_items').insert({
        product_type_id: ptId,
        brand_id: brandId,
        part_number: partNum,
        description: desc || null,
        is_active: isActive,
        created_by: 'admin-ui'
      }).select('id').single();
      if (error) throw error;
      savedItemId = data.id;
      catItems.push({ id: savedItemId, product_type_id: ptId, brand_id: brandId, part_number: partNum, description: desc || null, is_active: isActive, specCount: 0 });
    }

    // FIX: upsert using value_numeric / value_text instead of spec_value
    const specInputs = document.querySelectorAll('#cat-modal-specs-grid input[data-spec-id]');
    const upserts = [];
    const deletions = [];

    specInputs.forEach(input => {
      const specDefId = parseInt(input.dataset.specId);
      const val = input.value.trim();
      if (val !== '') {
        const resolved = catResolveSpecValue(val);
        upserts.push({
          catalog_item_id: savedItemId,
          spec_definition_id: specDefId,
          value_numeric: resolved.value_numeric,
          value_text: resolved.value_text,
          created_by: 'admin-ui'
        });
      } else if (catModalExistingSpecs[specDefId] !== undefined) {
        deletions.push(specDefId);
      }
    });

    if (upserts.length > 0) {
      const { error: uErr } = await sbClient
        .from('pm_catalog_item_specs')
        .upsert(upserts, { onConflict: 'catalog_item_id,spec_definition_id' });
      if (uErr) throw uErr;
    }

    for (const specDefId of deletions) {
      await sbClient
        .from('pm_catalog_item_specs')
        .delete()
        .eq('catalog_item_id', savedItemId)
        .eq('spec_definition_id', specDefId);
    }

    const updatedItem = catItems.find(i => i.id === savedItemId);
    if (updatedItem) {
      const { data: sc } = await sbClient
        .from('pm_catalog_item_specs')
        .select('catalog_item_id')
        .eq('catalog_item_id', savedItemId);
      updatedItem.specCount = sc ? sc.length : 0;
    }

    showCatSuccess(`"${partNum}" ${itemId ? 'updated' : 'added'}.`);
    closeCatModal();
    renderCatTable();

  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save';
  }
}

// ---- Messages ----
function showCatError(msg) {
  const el = document.getElementById('cat-error');
  el.textContent = msg;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 7000);
}

function showCatSuccess(msg) {
  const el = document.getElementById('cat-success');
  el.textContent = msg;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 3000);
}

// ---- Event binding (called once from app.js) ----
function bindAdminCatalogEvents() {
  document.getElementById('cat-modal-cancel-btn').addEventListener('click', closeCatModal);
  document.getElementById('cat-modal-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('cat-modal-overlay')) closeCatModal();
  });
  document.getElementById('cat-modal-form').addEventListener('submit', saveCatItem);
  document.getElementById('cat-add-btn').addEventListener('click', () => openCatModal(null));

  document.getElementById('cat-modal-pt').addEventListener('change', async e => {
    catModalExistingSpecs = {};
    await loadCatModalSpecs(e.target.value ? parseInt(e.target.value) : null);
  });
}
