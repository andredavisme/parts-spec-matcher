// ===== ADMIN: SPEC DEFINITIONS =====
// Requires: sbClient (config.js), isAdmin() (auth.js)

let adminSpecsData = [];   // flat array of all spec_definitions with joins
let adminUnitsData = [];   // all spec_units
let adminPtData = [];      // all product_types with category name
let adminFilterCatId = '';
let adminFilterPtId  = '';

async function initAdminSpecs() {
  const loadingEl = document.getElementById('admin-specs-loading');
  const errorEl   = document.getElementById('admin-specs-error');
  const wrapEl    = document.getElementById('admin-specs-table-wrap');

  loadingEl.textContent = 'Loading…';
  loadingEl.classList.remove('hidden');
  errorEl.classList.add('hidden');
  wrapEl.classList.add('hidden');

  try {
    await loadAdminRefData();
    await loadAdminSpecs();
    populateAdminFilters();
    renderAdminSpecsTable();
    loadingEl.classList.add('hidden');
    wrapEl.classList.remove('hidden');
  } catch (err) {
    loadingEl.classList.add('hidden');
    showAdminError(err.message);
  }
}

async function loadAdminRefData() {
  // Load units
  const { data: units, error: uErr } = await sbClient
    .from('pm_spec_units')
    .select('id, name, abbreviation')
    .order('id');
  if (uErr) throw uErr;
  adminUnitsData = units;

  // Load product types with category name via joined view
  const { data: pts, error: ptErr } = await sbClient
    .from('pm_product_types')
    .select('id, name, category_id, is_active')
    .eq('is_active', true)
    .order('name');
  if (ptErr) throw ptErr;

  const { data: cats, error: catErr } = await sbClient
    .from('pm_product_categories')
    .select('id, name')
    .order('name');
  if (catErr) throw catErr;

  const catMap = Object.fromEntries(cats.map(c => [c.id, c.name]));
  adminPtData = pts.map(pt => ({ ...pt, category_name: catMap[pt.category_id] || '' }));
}

async function loadAdminSpecs() {
  const { data, error } = await sbClient
    .from('pm_spec_definitions')
    .select('id, product_type_id, name, display_label, unit_id, match_type, is_required, sort_order, is_active')
    .order('product_type_id')
    .order('sort_order');
  if (error) throw error;
  adminSpecsData = data;
}

function populateAdminFilters() {
  const catSel = document.getElementById('admin-category-filter');
  const ptSel  = document.getElementById('admin-pt-filter');

  // Unique categories from adminPtData
  const seenCats = new Map();
  adminPtData.forEach(pt => {
    if (!seenCats.has(pt.category_id)) seenCats.set(pt.category_id, pt.category_name);
  });

  catSel.innerHTML = '<option value="">All Categories</option>';
  [...seenCats.entries()].sort((a,b) => a[1].localeCompare(b[1])).forEach(([id, name]) => {
    const o = document.createElement('option');
    o.value = id;
    o.textContent = name;
    catSel.appendChild(o);
  });

  ptSel.innerHTML = '<option value="">All Product Types</option>';
  adminPtData.forEach(pt => {
    const o = document.createElement('option');
    o.value = pt.id;
    o.textContent = pt.name;
    ptSel.appendChild(o);
  });

  catSel.addEventListener('change', () => {
    adminFilterCatId = catSel.value;
    adminFilterPtId  = '';
    ptSel.value = '';
    // filter pt dropdown by selected category
    ptSel.innerHTML = '<option value="">All Product Types</option>';
    const filtered = adminFilterCatId
      ? adminPtData.filter(pt => String(pt.category_id) === String(adminFilterCatId))
      : adminPtData;
    filtered.forEach(pt => {
      const o = document.createElement('option');
      o.value = pt.id;
      o.textContent = pt.name;
      ptSel.appendChild(o);
    });
    renderAdminSpecsTable();
  });

  ptSel.addEventListener('change', () => {
    adminFilterPtId = ptSel.value;
    renderAdminSpecsTable();
  });
}

function filteredSpecs() {
  let specs = adminSpecsData;
  if (adminFilterPtId) {
    specs = specs.filter(s => String(s.product_type_id) === String(adminFilterPtId));
  } else if (adminFilterCatId) {
    const ptIds = adminPtData
      .filter(pt => String(pt.category_id) === String(adminFilterCatId))
      .map(pt => pt.id);
    specs = specs.filter(s => ptIds.includes(s.product_type_id));
  }
  return specs;
}

function renderAdminSpecsTable() {
  const tbody = document.getElementById('admin-specs-tbody');
  tbody.innerHTML = '';

  const specs = filteredSpecs();
  if (specs.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td colspan="9" style="text-align:center;color:#aaa;padding:2rem">No specs found.</td>';
    tbody.appendChild(tr);
    return;
  }

  // Group by product_type_id, preserving order
  const groups = [];
  const groupMap = {};
  specs.forEach(s => {
    if (!groupMap[s.product_type_id]) {
      const pt = adminPtData.find(p => p.id === s.product_type_id);
      const g = { pt, specs: [] };
      groups.push(g);
      groupMap[s.product_type_id] = g;
    }
    groupMap[s.product_type_id].specs.push(s);
  });

  const unitMap = Object.fromEntries(adminUnitsData.map(u => [u.id, u]));

  groups.forEach(({ pt, specs: groupSpecs }) => {
    // Group header row
    const hdr = document.createElement('tr');
    hdr.className = 'pt-group-row';
    const catName = pt ? pt.category_name : '';
    const ptName  = pt ? pt.name : `Product Type ${groupSpecs[0].product_type_id}`;
    hdr.innerHTML = `<td colspan="9">${catName ? catName + ' &rsaquo; ' : ''}${ptName}</td>`;
    tbody.appendChild(hdr);

    groupSpecs.forEach((spec, idx) => {
      const isFirst = idx === 0;
      const isLast  = idx === groupSpecs.length - 1;
      const unit    = unitMap[spec.unit_id];
      const unitStr = unit && unit.abbreviation ? unit.abbreviation : (unit ? unit.name : '—');

      const tr = document.createElement('tr');
      if (!spec.is_active) tr.classList.add('inactive-row');
      tr.dataset.specId = spec.id;

      tr.innerHTML = `
        <td class="col-order">
          <div class="order-cell">
            <button class="btn-arrow btn-up" data-id="${spec.id}" ${isFirst ? 'disabled' : ''} title="Move up">&uarr;</button>
            <span class="order-num">${spec.sort_order}</span>
            <button class="btn-arrow btn-dn" data-id="${spec.id}" ${isLast  ? 'disabled' : ''} title="Move down">&darr;</button>
          </div>
        </td>
        <td>${ptName}</td>
        <td class="mono">${spec.name}</td>
        <td>${spec.display_label}</td>
        <td><span class="badge-match badge-${spec.match_type}">${spec.match_type}</span></td>
        <td>${unitStr}</td>
        <td><span class="badge-req ${spec.is_required ? 'badge-yes' : 'badge-no'}">${spec.is_required ? 'Yes' : 'No'}</span></td>
        <td><span class="badge-active ${spec.is_active ? 'badge-on' : 'badge-off'}">${spec.is_active ? 'Active' : 'Off'}</span></td>
        <td class="col-actions">
          <button class="btn-edit" data-id="${spec.id}">Edit</button>
          <button class="${spec.is_active ? 'btn-deactivate' : 'btn-activate'}" data-id="${spec.id}">
            ${spec.is_active ? 'Deactivate' : 'Activate'}
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  });

  // Bind up/down arrows
  tbody.querySelectorAll('.btn-up').forEach(btn => {
    btn.addEventListener('click', () => reorderSpec(parseInt(btn.dataset.id), 'up'));
  });
  tbody.querySelectorAll('.btn-dn').forEach(btn => {
    btn.addEventListener('click', () => reorderSpec(parseInt(btn.dataset.id), 'down'));
  });

  // Bind edit
  tbody.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', () => openSpecModal(parseInt(btn.dataset.id)));
  });

  // Bind activate/deactivate
  tbody.querySelectorAll('.btn-deactivate, .btn-activate').forEach(btn => {
    btn.addEventListener('click', () => toggleSpecActive(parseInt(btn.dataset.id)));
  });
}

async function reorderSpec(specId, direction) {
  // Find spec in data and its group sibling
  const spec = adminSpecsData.find(s => s.id === specId);
  if (!spec) return;

  const group = adminSpecsData.filter(s => s.product_type_id === spec.product_type_id)
    .sort((a,b) => a.sort_order - b.sort_order);

  const idx = group.findIndex(s => s.id === specId);
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= group.length) return;

  const swapSpec = group[swapIdx];

  // Swap sort_order values
  const newOrderA = swapSpec.sort_order;
  const newOrderB = spec.sort_order;

  const [r1, r2] = await Promise.all([
    sbClient.from('pm_spec_definitions').update({ sort_order: newOrderA }).eq('id', spec.id),
    sbClient.from('pm_spec_definitions').update({ sort_order: newOrderB }).eq('id', swapSpec.id)
  ]);

  if (r1.error || r2.error) {
    showAdminError('Reorder failed: ' + (r1.error || r2.error).message);
    return;
  }

  // Update local data and re-render
  spec.sort_order = newOrderA;
  swapSpec.sort_order = newOrderB;
  // Re-sort adminSpecsData by product_type_id then sort_order
  adminSpecsData.sort((a,b) => a.product_type_id - b.product_type_id || a.sort_order - b.sort_order);

  showAdminSuccess('Order updated.');
  renderAdminSpecsTable();
}

async function toggleSpecActive(specId) {
  const spec = adminSpecsData.find(s => s.id === specId);
  if (!spec) return;
  const newVal = !spec.is_active;
  const { error } = await sbClient
    .from('pm_spec_definitions')
    .update({ is_active: newVal })
    .eq('id', specId);
  if (error) { showAdminError(error.message); return; }
  spec.is_active = newVal;
  showAdminSuccess(`Spec "${spec.display_label}" ${newVal ? 'activated' : 'deactivated'}.`);
  renderAdminSpecsTable();
}

// ===== MODAL =====
function openSpecModal(specId) {
  const spec = specId ? adminSpecsData.find(s => s.id === specId) : null;
  document.getElementById('spec-modal-title').textContent = spec ? 'Edit Spec Definition' : 'Add Spec Definition';
  document.getElementById('modal-spec-id').value = spec ? spec.id : '';

  // Populate product type dropdown
  const ptSel = document.getElementById('modal-pt');
  ptSel.innerHTML = '<option value="">&mdash; Select &mdash;</option>';
  adminPtData.forEach(pt => {
    const o = document.createElement('option');
    o.value = pt.id;
    o.textContent = pt.name;
    if (spec && spec.product_type_id === pt.id) o.selected = true;
    ptSel.appendChild(o);
  });

  // Populate unit dropdown
  const unitSel = document.getElementById('modal-unit');
  unitSel.innerHTML = '<option value="">-- none --</option>';
  adminUnitsData.forEach(u => {
    const o = document.createElement('option');
    o.value = u.id;
    o.textContent = u.abbreviation ? `${u.name} (${u.abbreviation})` : u.name;
    if (spec && spec.unit_id === u.id) o.selected = true;
    unitSel.appendChild(o);
  });

  document.getElementById('modal-name').value       = spec ? spec.name : '';
  document.getElementById('modal-label').value      = spec ? spec.display_label : '';
  document.getElementById('modal-match-type').value = spec ? spec.match_type : 'exact';
  document.getElementById('modal-required').checked = spec ? spec.is_required : false;
  document.getElementById('modal-active').checked   = spec ? spec.is_active : true;
  document.getElementById('modal-error').classList.add('hidden');

  document.getElementById('spec-modal-overlay').classList.remove('hidden');
}

function closeSpecModal() {
  document.getElementById('spec-modal-overlay').classList.add('hidden');
}

async function saveSpec(e) {
  e.preventDefault();
  const modalErr = document.getElementById('modal-error');
  modalErr.classList.add('hidden');

  const specId     = document.getElementById('modal-spec-id').value;
  const ptId       = parseInt(document.getElementById('modal-pt').value);
  const name       = document.getElementById('modal-name').value.trim().toLowerCase().replace(/\s+/g,'_');
  const label      = document.getElementById('modal-label').value.trim();
  const matchType  = document.getElementById('modal-match-type').value;
  const unitVal    = document.getElementById('modal-unit').value;
  const unitId     = unitVal ? parseInt(unitVal) : 12; // default to 'none'
  const isRequired = document.getElementById('modal-required').checked;
  const isActive   = document.getElementById('modal-active').checked;

  if (!ptId || !name || !label || !matchType) {
    modalErr.textContent = 'Product type, field name, display label, and match type are required.';
    modalErr.classList.remove('hidden');
    return;
  }

  const saveBtn = document.getElementById('modal-save-btn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving…';

  try {
    if (specId) {
      // UPDATE
      const { error } = await sbClient.from('pm_spec_definitions').update({
        product_type_id: ptId,
        name,
        display_label: label,
        match_type: matchType,
        unit_id: unitId,
        is_required: isRequired,
        is_active: isActive
      }).eq('id', parseInt(specId));
      if (error) throw error;
      // Update local cache
      const existing = adminSpecsData.find(s => s.id === parseInt(specId));
      if (existing) Object.assign(existing, { product_type_id: ptId, name, display_label: label, match_type: matchType, unit_id: unitId, is_required: isRequired, is_active: isActive });
      showAdminSuccess(`Spec "${label}" updated.`);
    } else {
      // INSERT — sort_order = max for this pt + 1
      const ptSpecs = adminSpecsData.filter(s => s.product_type_id === ptId);
      const nextOrder = ptSpecs.length > 0 ? Math.max(...ptSpecs.map(s => s.sort_order)) + 1 : 1;

      const { data, error } = await sbClient.from('pm_spec_definitions').insert({
        product_type_id: ptId,
        name,
        display_label: label,
        match_type: matchType,
        unit_id: unitId,
        is_required: isRequired,
        is_active: isActive,
        sort_order: nextOrder,
        created_by: 'admin-ui'
      }).select().single();
      if (error) throw error;

      // Also insert into quote_template_fields for the matching template
      const { data: tmpl, error: tmplErr } = await sbClient
        .from('pm_quote_templates')
        .select('id')
        .eq('product_type_id', ptId)
        .eq('is_active', true)
        .single();
      if (!tmplErr && tmpl) {
        await sbClient.from('pm_quote_template_fields').insert({
          template_id: tmpl.id,
          spec_definition_id: data.id,
          sort_order: nextOrder,
          is_required: isRequired,
          display_hint: null
        });
      }

      adminSpecsData.push(data);
      adminSpecsData.sort((a,b) => a.product_type_id - b.product_type_id || a.sort_order - b.sort_order);
      showAdminSuccess(`Spec "${label}" added.`);
    }

    closeSpecModal();
    renderAdminSpecsTable();
  } catch (err) {
    modalErr.textContent = err.message;
    modalErr.classList.remove('hidden');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save';
  }
}

function showAdminError(msg) {
  const el = document.getElementById('admin-specs-error');
  el.textContent = msg;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 6000);
}

function showAdminSuccess(msg) {
  const el = document.getElementById('admin-specs-success');
  el.textContent = msg;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 3000);
}

// Wire up modal events (called once from app.js after DOMContentLoaded)
function bindAdminSpecsModalEvents() {
  document.getElementById('modal-cancel-btn').addEventListener('click', closeSpecModal);
  document.getElementById('spec-modal-overlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('spec-modal-overlay')) closeSpecModal();
  });
  document.getElementById('spec-modal-form').addEventListener('submit', saveSpec);
  document.getElementById('admin-add-spec-btn').addEventListener('click', () => openSpecModal(null));
}
