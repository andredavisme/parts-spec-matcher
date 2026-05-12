// ===== ADMIN: VENDORS =====
// Requires: sbClient (config.js)

let vendorItems = [];  // [{id, name, contact_name, contact_email, notes, is_active}]

// ---- Init ----
async function initAdminVendors() {
  const loadingEl = document.getElementById('ven-loading');
  const errorEl   = document.getElementById('ven-error');
  const wrapEl    = document.getElementById('ven-table-wrap');

  loadingEl.textContent = 'Loading…';
  loadingEl.classList.remove('hidden');
  errorEl.classList.add('hidden');
  wrapEl.classList.add('hidden');

  try {
    await loadVendors();
    renderVendorsTable();
    loadingEl.classList.add('hidden');
    wrapEl.classList.remove('hidden');
  } catch (err) {
    loadingEl.classList.add('hidden');
    showVenError(err.message);
  }
}

async function loadVendors() {
  const { data, error } = await sbClient
    .from('pm_vendors')
    .select('id, name, contact_name, contact_email, notes, is_active')
    .order('name');
  if (error) throw error;
  vendorItems = data || [];
}

// ---- Render table ----
function renderVendorsTable() {
  const tbody = document.getElementById('ven-tbody');
  tbody.innerHTML = '';

  if (vendorItems.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td colspan="6" style="text-align:center;color:#aaa;padding:2rem">No vendors found.</td>';
    tbody.appendChild(tr);
    return;
  }

  vendorItems.forEach(v => {
    const tr = document.createElement('tr');
    if (!v.is_active) tr.classList.add('inactive-row');
    tr.innerHTML = `
      <td>${v.name}</td>
      <td>${v.contact_name || '<span style="color:#bbb">—</span>'}</td>
      <td>${v.contact_email ? `<a href="mailto:${v.contact_email}">${v.contact_email}</a>` : '<span style="color:#bbb">—</span>'}</td>
      <td class="desc-cell">${v.notes || '<span style="color:#bbb">—</span>'}</td>
      <td><span class="badge-active ${v.is_active ? 'badge-on' : 'badge-off'}">${v.is_active ? 'Active' : 'Off'}</span></td>
      <td class="col-actions">
        <button class="btn-edit" data-id="${v.id}">Edit</button>
        <button class="${v.is_active ? 'btn-deactivate' : 'btn-activate'}" data-id="${v.id}">${v.is_active ? 'Deactivate' : 'Activate'}</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', () => openVenModal(parseInt(btn.dataset.id)));
  });
  tbody.querySelectorAll('.btn-deactivate, .btn-activate').forEach(btn => {
    btn.addEventListener('click', () => toggleVenActive(parseInt(btn.dataset.id)));
  });
}

async function toggleVenActive(id) {
  const item = vendorItems.find(v => v.id === id);
  if (!item) return;
  const newVal = !item.is_active;
  const { error } = await sbClient.from('pm_vendors').update({ is_active: newVal }).eq('id', id);
  if (error) { showVenError(error.message); return; }
  item.is_active = newVal;
  showVenSuccess(`"${item.name}" ${newVal ? 'activated' : 'deactivated'}.`);
  renderVendorsTable();
}

// ---- Modal ----
function openVenModal(id) {
  const item = id ? vendorItems.find(v => v.id === id) : null;
  document.getElementById('ven-modal-title').textContent = item ? 'Edit Vendor' : 'Add Vendor';
  document.getElementById('ven-modal-id').value          = item ? item.id : '';
  document.getElementById('ven-modal-name').value        = item ? item.name : '';
  document.getElementById('ven-modal-contact').value     = item ? (item.contact_name || '') : '';
  document.getElementById('ven-modal-email').value       = item ? (item.contact_email || '') : '';
  document.getElementById('ven-modal-notes').value       = item ? (item.notes || '') : '';
  document.getElementById('ven-modal-active').checked    = item ? item.is_active : true;
  document.getElementById('ven-modal-error').classList.add('hidden');
  document.getElementById('ven-modal-overlay').classList.remove('hidden');
}

function closeVenModal() {
  document.getElementById('ven-modal-overlay').classList.add('hidden');
}

async function saveVendor(e) {
  e.preventDefault();
  const errEl  = document.getElementById('ven-modal-error');
  errEl.classList.add('hidden');

  const id       = document.getElementById('ven-modal-id').value;
  const name     = document.getElementById('ven-modal-name').value.trim();
  const contact  = document.getElementById('ven-modal-contact').value.trim();
  const email    = document.getElementById('ven-modal-email').value.trim();
  const notes    = document.getElementById('ven-modal-notes').value.trim();
  const isActive = document.getElementById('ven-modal-active').checked;

  if (!name) {
    errEl.textContent = 'Vendor name is required.';
    errEl.classList.remove('hidden');
    return;
  }

  const saveBtn = document.getElementById('ven-modal-save-btn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving…';

  try {
    const payload = {
      name,
      contact_name:  contact || null,
      contact_email: email   || null,
      notes:         notes   || null,
      is_active:     isActive
    };

    if (id) {
      const { error } = await sbClient.from('pm_vendors').update(payload).eq('id', parseInt(id));
      if (error) throw error;
      const existing = vendorItems.find(v => v.id === parseInt(id));
      if (existing) Object.assign(existing, payload);
    } else {
      const { data, error } = await sbClient.from('pm_vendors').insert({ ...payload, created_by: 'admin-ui' }).select('id').single();
      if (error) throw error;
      vendorItems.push({ id: data.id, ...payload });
      vendorItems.sort((a, b) => a.name.localeCompare(b.name));
    }

    showVenSuccess(`"${name}" ${id ? 'updated' : 'added'}.`);
    closeVenModal();
    renderVendorsTable();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save';
  }
}

// ---- Messages ----
function showVenError(msg) {
  const el = document.getElementById('ven-error');
  el.textContent = msg;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 7000);
}

function showVenSuccess(msg) {
  const el = document.getElementById('ven-success');
  el.textContent = msg;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 3000);
}

// ---- Event binding ----
function bindAdminVendorsEvents() {
  document.getElementById('ven-modal-cancel-btn').addEventListener('click', closeVenModal);
  document.getElementById('ven-modal-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('ven-modal-overlay')) closeVenModal();
  });
  document.getElementById('ven-modal-form').addEventListener('submit', saveVendor);
  document.getElementById('ven-add-btn').addEventListener('click', () => openVenModal(null));
}
