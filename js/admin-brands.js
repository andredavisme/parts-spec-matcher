// ===== ADMIN: BRANDS =====
// Requires: sbClient (config.js)

let brandItems   = [];  // [{id, name, primary_vendor_id, notes, is_active}]
let brandVendors = [];  // [{id, name}] — for vendor dropdown

// ---- Init ----
async function initAdminBrands() {
  const loadingEl = document.getElementById('br-loading');
  const errorEl   = document.getElementById('br-error');
  const wrapEl    = document.getElementById('br-table-wrap');

  loadingEl.textContent = 'Loading…';
  loadingEl.classList.remove('hidden');
  errorEl.classList.add('hidden');
  wrapEl.classList.add('hidden');

  try {
    await loadBrandsRefData();
    renderBrandsTable();
    loadingEl.classList.add('hidden');
    wrapEl.classList.remove('hidden');
  } catch (err) {
    loadingEl.classList.add('hidden');
    showBrError(err.message);
  }
}

async function loadBrandsRefData() {
  const [brandsRes, vendorsRes] = await Promise.all([
    sbClient.from('pm_brands').select('id, name, primary_vendor_id, notes, is_active').order('name'),
    sbClient.from('pm_vendors').select('id, name').eq('is_active', true).order('name')
  ]);
  if (brandsRes.error)  throw brandsRes.error;
  if (vendorsRes.error) throw vendorsRes.error;
  brandItems   = brandsRes.data  || [];
  brandVendors = vendorsRes.data || [];
}

// ---- Render table ----
function renderBrandsTable() {
  const tbody = document.getElementById('br-tbody');
  tbody.innerHTML = '';

  if (brandItems.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td colspan="5" style="text-align:center;color:#aaa;padding:2rem">No brands found.</td>';
    tbody.appendChild(tr);
    return;
  }

  const vendorMap = Object.fromEntries(brandVendors.map(v => [v.id, v.name]));

  brandItems.forEach(b => {
    const vendorName = b.primary_vendor_id ? (vendorMap[b.primary_vendor_id] || `Vendor ${b.primary_vendor_id}`) : '<span style="color:#bbb">—</span>';
    const tr = document.createElement('tr');
    if (!b.is_active) tr.classList.add('inactive-row');
    tr.innerHTML = `
      <td>${b.name}</td>
      <td>${vendorName}</td>
      <td class="desc-cell">${b.notes || '<span style="color:#bbb">—</span>'}</td>
      <td><span class="badge-active ${b.is_active ? 'badge-on' : 'badge-off'}">${b.is_active ? 'Active' : 'Off'}</span></td>
      <td class="col-actions">
        <button class="btn-edit" data-id="${b.id}">Edit</button>
        <button class="${b.is_active ? 'btn-deactivate' : 'btn-activate'}" data-id="${b.id}">${b.is_active ? 'Deactivate' : 'Activate'}</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', () => openBrModal(parseInt(btn.dataset.id)));
  });
  tbody.querySelectorAll('.btn-deactivate, .btn-activate').forEach(btn => {
    btn.addEventListener('click', () => toggleBrActive(parseInt(btn.dataset.id)));
  });
}

async function toggleBrActive(id) {
  const item = brandItems.find(b => b.id === id);
  if (!item) return;
  const newVal = !item.is_active;
  const { error } = await sbClient.from('pm_brands').update({ is_active: newVal }).eq('id', id);
  if (error) { showBrError(error.message); return; }
  item.is_active = newVal;
  showBrSuccess(`"${item.name}" ${newVal ? 'activated' : 'deactivated'}.`);
  renderBrandsTable();
}

// ---- Modal ----
function openBrModal(id) {
  const item = id ? brandItems.find(b => b.id === id) : null;
  document.getElementById('br-modal-title').textContent  = item ? 'Edit Brand' : 'Add Brand';
  document.getElementById('br-modal-id').value           = item ? item.id : '';
  document.getElementById('br-modal-name').value         = item ? item.name : '';
  document.getElementById('br-modal-notes').value        = item ? (item.notes || '') : '';
  document.getElementById('br-modal-active').checked     = item ? item.is_active : true;
  document.getElementById('br-modal-error').classList.add('hidden');

  // Populate vendor dropdown
  const vendorSel = document.getElementById('br-modal-vendor');
  vendorSel.innerHTML = '<option value="">— None —</option>';
  brandVendors.forEach(v => {
    const o = document.createElement('option');
    o.value = v.id;
    o.textContent = v.name;
    if (item && item.primary_vendor_id === v.id) o.selected = true;
    vendorSel.appendChild(o);
  });

  document.getElementById('br-modal-overlay').classList.remove('hidden');
}

function closeBrModal() {
  document.getElementById('br-modal-overlay').classList.add('hidden');
}

async function saveBrand(e) {
  e.preventDefault();
  const errEl = document.getElementById('br-modal-error');
  errEl.classList.add('hidden');

  const id         = document.getElementById('br-modal-id').value;
  const name       = document.getElementById('br-modal-name').value.trim();
  const vendorId   = document.getElementById('br-modal-vendor').value;
  const notes      = document.getElementById('br-modal-notes').value.trim();
  const isActive   = document.getElementById('br-modal-active').checked;

  if (!name) {
    errEl.textContent = 'Brand name is required.';
    errEl.classList.remove('hidden');
    return;
  }

  const saveBtn = document.getElementById('br-modal-save-btn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving…';

  try {
    const payload = {
      name,
      primary_vendor_id: vendorId ? parseInt(vendorId) : null,
      notes:     notes || null,
      is_active: isActive
    };

    if (id) {
      const { error } = await sbClient.from('pm_brands').update(payload).eq('id', parseInt(id));
      if (error) throw error;
      const existing = brandItems.find(b => b.id === parseInt(id));
      if (existing) Object.assign(existing, payload);
    } else {
      const { data, error } = await sbClient.from('pm_brands').insert({ ...payload, created_by: 'admin-ui' }).select('id').single();
      if (error) throw error;
      brandItems.push({ id: data.id, ...payload });
      brandItems.sort((a, b) => a.name.localeCompare(b.name));
    }

    showBrSuccess(`"${name}" ${id ? 'updated' : 'added'}.`);
    closeBrModal();
    renderBrandsTable();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save';
  }
}

// ---- Messages ----
function showBrError(msg) {
  const el = document.getElementById('br-error');
  el.textContent = msg;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 7000);
}

function showBrSuccess(msg) {
  const el = document.getElementById('br-success');
  el.textContent = msg;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 3000);
}

// ---- Event binding ----
function bindAdminBrandsEvents() {
  document.getElementById('br-modal-cancel-btn').addEventListener('click', closeBrModal);
  document.getElementById('br-modal-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('br-modal-overlay')) closeBrModal();
  });
  document.getElementById('br-modal-form').addEventListener('submit', saveBrand);
  document.getElementById('br-add-btn').addEventListener('click', () => openBrModal(null));
}
