// ===== ADMIN: VENDOR ITEM PRIORITY =====
// Requires: sbClient (config.js)

let prioItems    = [];  // [{id, vendor_id, product_type_id, brand_id, priority_rank, notes}]
let prioVendors  = [];  // [{id, name}]
let prioPtypes   = [];  // [{id, name, category_id}]
let prioBrands   = [];  // [{id, name}]
let prioFilterPtId = '';

// ---- Init ----
async function initAdminPriority() {
  const loadingEl = document.getElementById('prio-loading');
  const errorEl   = document.getElementById('prio-error');
  const wrapEl    = document.getElementById('prio-table-wrap');

  loadingEl.textContent = 'Loading\u2026';
  loadingEl.classList.remove('hidden');
  errorEl.classList.add('hidden');
  wrapEl.classList.add('hidden');

  try {
    await loadPrioRefData();
    populatePrioFilters();
    renderPrioTable();
    loadingEl.classList.add('hidden');
    wrapEl.classList.remove('hidden');
  } catch (err) {
    loadingEl.classList.add('hidden');
    showPrioError(err.message);
  }
}

async function loadPrioRefData() {
  const [prioRes, vendorsRes, ptsRes, brandsRes] = await Promise.all([
    sbClient.from('pm_distributor_priority').select('id, vendor_id, product_type_id, brand_id, priority_rank, notes').order('product_type_id').order('priority_rank'),
    sbClient.from('pm_vendors').select('id, name').eq('is_active', true).order('name'),
    sbClient.from('pm_product_types').select('id, name, category_id').eq('is_active', true).order('name'),
    sbClient.from('pm_brands').select('id, name').eq('is_active', true).order('name')
  ]);
  if (prioRes.error)    throw prioRes.error;
  if (vendorsRes.error) throw vendorsRes.error;
  if (ptsRes.error)     throw ptsRes.error;
  if (brandsRes.error)  throw brandsRes.error;
  prioItems   = prioRes.data   || [];
  prioVendors = vendorsRes.data || [];
  prioPtypes  = ptsRes.data    || [];
  prioBrands  = brandsRes.data || [];
}

// ---- Filters ----
function populatePrioFilters() {
  const ptSel = document.getElementById('prio-filter-pt');
  ptSel.innerHTML = '<option value="">All Product Types</option>';
  prioPtypes.forEach(pt => {
    const o = document.createElement('option'); o.value = pt.id; o.textContent = pt.name;
    ptSel.appendChild(o);
  });
  ptSel.addEventListener('change', () => {
    prioFilterPtId = ptSel.value;
    renderPrioTable();
  });
}

// ---- Render table ----
function renderPrioTable() {
  const tbody = document.getElementById('prio-tbody');
  tbody.innerHTML = '';

  const vendorMap = Object.fromEntries(prioVendors.map(v => [v.id, v.name]));
  const ptMap     = Object.fromEntries(prioPtypes.map(p => [p.id, p.name]));
  const brandMap  = Object.fromEntries(prioBrands.map(b => [b.id, b.name]));

  let rows = prioItems;
  if (prioFilterPtId) rows = rows.filter(r => String(r.product_type_id) === String(prioFilterPtId));

  if (rows.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td colspan="6" style="text-align:center;color:#aaa;padding:2rem">No priority rules found.</td>';
    tbody.appendChild(tr);
    return;
  }

  // Group by product type
  const groups = [];
  const groupMap = {};
  rows.forEach(r => {
    if (!groupMap[r.product_type_id]) {
      groups.push({ ptId: r.product_type_id, ptName: ptMap[r.product_type_id] || `PT ${r.product_type_id}`, items: [] });
      groupMap[r.product_type_id] = groups[groups.length - 1];
    }
    groupMap[r.product_type_id].items.push(r);
  });

  groups.forEach(({ ptName, items }) => {
    const hdr = document.createElement('tr');
    hdr.className = 'pt-group-row';
    hdr.innerHTML = `<td colspan="6">${ptName}</td>`;
    tbody.appendChild(hdr);

    items.sort((a, b) => a.priority_rank - b.priority_rank).forEach(r => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${ptName}</td>
        <td>${vendorMap[r.vendor_id] || `Vendor ${r.vendor_id}`}</td>
        <td>${r.brand_id ? (brandMap[r.brand_id] || `Brand ${r.brand_id}`) : '<span style="color:#bbb">Any</span>'}</td>
        <td style="text-align:center"><strong>${r.priority_rank}</strong></td>
        <td class="desc-cell">${r.notes || '<span style="color:#bbb">\u2014</span>'}</td>
        <td class="col-actions">
          <button class="btn-edit" data-id="${r.id}">Edit</button>
          <button class="btn-deactivate" data-id="${r.id}">Delete</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  });

  tbody.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', () => openPrioModal(parseInt(btn.dataset.id)));
  });
  tbody.querySelectorAll('.btn-deactivate').forEach(btn => {
    btn.addEventListener('click', () => deletePrioRule(parseInt(btn.dataset.id)));
  });
}

async function deletePrioRule(id) {
  const item = prioItems.find(r => r.id === id);
  if (!item) return;
  if (!confirm('Delete this priority rule?')) return;
  const { error } = await sbClient.from('pm_distributor_priority').delete().eq('id', id);
  if (error) { showPrioError(error.message); return; }
  prioItems = prioItems.filter(r => r.id !== id);
  showPrioSuccess('Priority rule deleted.');
  renderPrioTable();
}

// ---- Modal ----
function openPrioModal(id) {
  const item = id ? prioItems.find(r => r.id === id) : null;
  document.getElementById('prio-modal-title').textContent = item ? 'Edit Priority Rule' : 'Add Priority Rule';
  document.getElementById('prio-modal-id').value          = item ? item.id : '';
  document.getElementById('prio-modal-rank').value        = item ? item.priority_rank : '';
  document.getElementById('prio-modal-notes').value       = item ? (item.notes || '') : '';
  document.getElementById('prio-modal-error').classList.add('hidden');

  // Vendor dropdown
  const vendorSel = document.getElementById('prio-modal-vendor');
  vendorSel.innerHTML = '<option value="">&mdash; Select &mdash;</option>';
  prioVendors.forEach(v => {
    const o = document.createElement('option'); o.value = v.id; o.textContent = v.name;
    if (item && item.vendor_id === v.id) o.selected = true;
    vendorSel.appendChild(o);
  });

  // Product type dropdown
  const ptSel = document.getElementById('prio-modal-pt');
  ptSel.innerHTML = '<option value="">&mdash; Select &mdash;</option>';
  prioPtypes.forEach(pt => {
    const o = document.createElement('option'); o.value = pt.id; o.textContent = pt.name;
    if (item && item.product_type_id === pt.id) o.selected = true;
    ptSel.appendChild(o);
  });

  // Brand dropdown (optional)
  const brandSel = document.getElementById('prio-modal-brand');
  brandSel.innerHTML = '<option value="">\u2014 Any brand \u2014</option>';
  prioBrands.forEach(b => {
    const o = document.createElement('option'); o.value = b.id; o.textContent = b.name;
    if (item && item.brand_id === b.id) o.selected = true;
    brandSel.appendChild(o);
  });

  document.getElementById('prio-modal-overlay').classList.remove('hidden');
}

function closePrioModal() {
  document.getElementById('prio-modal-overlay').classList.add('hidden');
}

async function savePrioRule(e) {
  e.preventDefault();
  const errEl = document.getElementById('prio-modal-error');
  errEl.classList.add('hidden');

  const id       = document.getElementById('prio-modal-id').value;
  const vendorId = document.getElementById('prio-modal-vendor').value;
  const ptId     = document.getElementById('prio-modal-pt').value;
  const brandId  = document.getElementById('prio-modal-brand').value;
  const rank     = document.getElementById('prio-modal-rank').value;
  const notes    = document.getElementById('prio-modal-notes').value.trim();

  if (!vendorId || !ptId || !rank) {
    errEl.textContent = 'Vendor, product type, and priority rank are required.';
    errEl.classList.remove('hidden');
    return;
  }
  const rankInt = parseInt(rank);
  if (isNaN(rankInt) || rankInt < 1) {
    errEl.textContent = 'Priority rank must be a positive integer.';
    errEl.classList.remove('hidden');
    return;
  }

  const saveBtn = document.getElementById('prio-modal-save-btn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving\u2026';

  try {
    const payload = {
      vendor_id:       parseInt(vendorId),
      product_type_id: parseInt(ptId),
      brand_id:        brandId ? parseInt(brandId) : null,
      priority_rank:   rankInt,
      notes:           notes || null
    };

    if (id) {
      const { error } = await sbClient.from('pm_distributor_priority').update(payload).eq('id', parseInt(id));
      if (error) throw error;
      const existing = prioItems.find(r => r.id === parseInt(id));
      if (existing) Object.assign(existing, payload);
    } else {
      const { data, error } = await sbClient
        .from('pm_distributor_priority')
        .insert({ ...payload, created_by: 'admin-ui' })
        .select('id').single();
      if (error) throw error;
      prioItems.push({ id: data.id, ...payload });
    }

    showPrioSuccess(`Priority rule ${id ? 'updated' : 'added'}.`);
    closePrioModal();
    renderPrioTable();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save';
  }
}

// ---- Messages ----
function showPrioError(msg) {
  const el = document.getElementById('prio-error');
  el.textContent = msg;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 7000);
}

function showPrioSuccess(msg) {
  const el = document.getElementById('prio-success');
  el.textContent = msg;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 3000);
}

// ---- Event binding ----
function bindAdminPriorityEvents() {
  document.getElementById('prio-modal-cancel-btn').addEventListener('click', closePrioModal);
  document.getElementById('prio-modal-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('prio-modal-overlay')) closePrioModal();
  });
  document.getElementById('prio-modal-form').addEventListener('submit', savePrioRule);
  document.getElementById('prio-add-btn').addEventListener('click', () => openPrioModal(null));
}
