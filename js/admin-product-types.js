// ===== ADMIN: PRODUCT TYPES =====
// Requires: sbClient (config.js)

let ptItems      = [];  // [{id, category_id, name, description, is_active}]
let ptCategories = [];  // [{id, name}]

// ---- Init ----
async function initAdminProductTypes() {
  const loadingEl = document.getElementById('pt-loading');
  const errorEl   = document.getElementById('pt-error');
  const wrapEl    = document.getElementById('pt-table-wrap');

  loadingEl.textContent = 'Loading…';
  loadingEl.classList.remove('hidden');
  errorEl.classList.add('hidden');
  wrapEl.classList.add('hidden');

  try {
    await loadPtRefData();
    renderPtTable();
    loadingEl.classList.add('hidden');
    wrapEl.classList.remove('hidden');
  } catch (err) {
    loadingEl.classList.add('hidden');
    showPtError(err.message);
  }
}

async function loadPtRefData() {
  const [ptsRes, catsRes] = await Promise.all([
    sbClient.from('pm_product_types').select('id, category_id, name, description, is_active').order('name'),
    sbClient.from('pm_product_categories').select('id, name').order('name')
  ]);
  if (ptsRes.error)  throw ptsRes.error;
  if (catsRes.error) throw catsRes.error;
  ptItems      = ptsRes.data  || [];
  ptCategories = catsRes.data || [];
}

// ---- Render table ----
function renderPtTable() {
  const tbody = document.getElementById('pt-tbody');
  tbody.innerHTML = '';

  if (ptItems.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td colspan="5" style="text-align:center;color:#aaa;padding:2rem">No product types found.</td>';
    tbody.appendChild(tr);
    return;
  }

  const catMap = Object.fromEntries(ptCategories.map(c => [c.id, c.name]));

  // Group by category
  const groups = [];
  const groupMap = {};
  ptItems.forEach(pt => {
    if (!groupMap[pt.category_id]) {
      groups.push({ catId: pt.category_id, catName: catMap[pt.category_id] || `Cat ${pt.category_id}`, items: [] });
      groupMap[pt.category_id] = groups[groups.length - 1];
    }
    groupMap[pt.category_id].items.push(pt);
  });
  groups.sort((a, b) => a.catName.localeCompare(b.catName));

  groups.forEach(({ catName, items }) => {
    const hdr = document.createElement('tr');
    hdr.className = 'pt-group-row';
    hdr.innerHTML = `<td colspan="5">${catName}</td>`;
    tbody.appendChild(hdr);

    items.forEach(pt => {
      const tr = document.createElement('tr');
      if (!pt.is_active) tr.classList.add('inactive-row');
      tr.innerHTML = `
        <td>${catName}</td>
        <td>${pt.name}</td>
        <td class="desc-cell">${pt.description || '<span style="color:#bbb">—</span>'}</td>
        <td><span class="badge-active ${pt.is_active ? 'badge-on' : 'badge-off'}">${pt.is_active ? 'Active' : 'Off'}</span></td>
        <td class="col-actions">
          <button class="btn-edit" data-id="${pt.id}">Edit</button>
          <button class="${pt.is_active ? 'btn-deactivate' : 'btn-activate'}" data-id="${pt.id}">${pt.is_active ? 'Deactivate' : 'Activate'}</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  });

  tbody.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', () => openPtModal(parseInt(btn.dataset.id)));
  });
  tbody.querySelectorAll('.btn-deactivate, .btn-activate').forEach(btn => {
    btn.addEventListener('click', () => togglePtActive(parseInt(btn.dataset.id)));
  });
}

async function togglePtActive(id) {
  const item = ptItems.find(p => p.id === id);
  if (!item) return;
  const newVal = !item.is_active;
  const { error } = await sbClient.from('pm_product_types').update({ is_active: newVal }).eq('id', id);
  if (error) { showPtError(error.message); return; }
  item.is_active = newVal;
  showPtSuccess(`"${item.name}" ${newVal ? 'activated' : 'deactivated'}.`);
  renderPtTable();
}

// ---- Modal ----
function openPtModal(id) {
  const item = id ? ptItems.find(p => p.id === id) : null;
  document.getElementById('pt-modal-title').textContent   = item ? 'Edit Product Type' : 'Add Product Type';
  document.getElementById('pt-modal-id').value            = item ? item.id : '';
  document.getElementById('pt-modal-name').value          = item ? item.name : '';
  document.getElementById('pt-modal-desc').value          = item ? (item.description || '') : '';
  document.getElementById('pt-modal-active').checked      = item ? item.is_active : true;
  document.getElementById('pt-modal-error').classList.add('hidden');

  const catSel = document.getElementById('pt-modal-category');
  catSel.innerHTML = '<option value="">&mdash; Select &mdash;</option>';
  ptCategories.forEach(c => {
    const o = document.createElement('option');
    o.value = c.id; o.textContent = c.name;
    if (item && item.category_id === c.id) o.selected = true;
    catSel.appendChild(o);
  });

  document.getElementById('pt-modal-overlay').classList.remove('hidden');
}

function closePtModal() {
  document.getElementById('pt-modal-overlay').classList.add('hidden');
}

async function saveProductType(e) {
  e.preventDefault();
  const errEl = document.getElementById('pt-modal-error');
  errEl.classList.add('hidden');

  const id       = document.getElementById('pt-modal-id').value;
  const catId    = document.getElementById('pt-modal-category').value;
  const name     = document.getElementById('pt-modal-name').value.trim();
  const desc     = document.getElementById('pt-modal-desc').value.trim();
  const isActive = document.getElementById('pt-modal-active').checked;

  if (!catId || !name) {
    errEl.textContent = 'Category and name are required.';
    errEl.classList.remove('hidden');
    return;
  }

  const saveBtn = document.getElementById('pt-modal-save-btn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving…';

  try {
    const payload = { category_id: parseInt(catId), name, description: desc || null, is_active: isActive };

    if (id) {
      const { error } = await sbClient.from('pm_product_types').update(payload).eq('id', parseInt(id));
      if (error) throw error;
      const existing = ptItems.find(p => p.id === parseInt(id));
      if (existing) Object.assign(existing, payload);
    } else {
      const { data, error } = await sbClient.from('pm_product_types').insert({ ...payload, created_by: 'admin-ui' }).select('id').single();
      if (error) throw error;
      ptItems.push({ id: data.id, ...payload });
      ptItems.sort((a, b) => a.name.localeCompare(b.name));
    }

    showPtSuccess(`"${name}" ${id ? 'updated' : 'added'}.`);
    closePtModal();
    renderPtTable();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save';
  }
}

// ---- Messages ----
function showPtError(msg) {
  const el = document.getElementById('pt-error');
  el.textContent = msg;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 7000);
}

function showPtSuccess(msg) {
  const el = document.getElementById('pt-success');
  el.textContent = msg;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 3000);
}

// ---- Event binding ----
function bindAdminProductTypesEvents() {
  document.getElementById('pt-modal-cancel-btn').addEventListener('click', closePtModal);
  document.getElementById('pt-modal-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('pt-modal-overlay')) closePtModal();
  });
  document.getElementById('pt-modal-form').addEventListener('submit', saveProductType);
  document.getElementById('pt-add-btn').addEventListener('click', () => openPtModal(null));
}
