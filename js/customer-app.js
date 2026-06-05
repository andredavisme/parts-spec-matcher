// Customer Portal — routing and initialization

function showView(viewId) {
  document.querySelectorAll('.view').forEach(v => {
    v.classList.remove('active');
    v.classList.add('hidden');
  });
  const target = document.getElementById(viewId);
  if (!target) return;
  target.classList.remove('hidden');
  target.classList.add('active');
}

function setEmailAll(email) {
  [
    'user-email-dashboard',
    'user-email-selector',
    'user-email-request',
    'user-email-results'
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = email;
  });
}

function bindLogout(ids) {
  ids.forEach(id => {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener('click', async () => {
      await signOut();
      showView('view-login');
    });
  });
}

async function initCustomerApp() {
  const session = await getSession();

  if (session) {
    setEmailAll(session.user.email);
    showView('view-dashboard');
    await initDashboard(session);
  } else {
    showView('view-login');
  }

  // ── Login ──
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('login-error');
    const btn     = document.getElementById('login-btn');
    errorEl.classList.add('hidden');
    btn.disabled = true;
    btn.textContent = 'Signing in\u2026';
    try {
      const user = await signIn(
        document.getElementById('email').value.trim(),
        document.getElementById('password').value
      );
      setEmailAll(user.email);
      const sess = await getSession();
      showView('view-dashboard');
      await initDashboard(sess);
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.classList.remove('hidden');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Sign In';
    }
  });

  // ── Logout ──
  bindLogout([
    'logout-btn-dashboard',
    'logout-btn-selector',
    'logout-btn-request',
    'logout-btn-results'
  ]);

  // ── Dashboard → Selector ──
  document.getElementById('new-request-btn').addEventListener('click', async () => {
    showView('view-selector');
    await initCustomerSelector();
  });

  // ── Selector → Request ──
  document.getElementById('start-request-btn').addEventListener('click', async () => {
    const select = document.getElementById('product-type-select');
    const productTypeId   = parseInt(select.value);
    const productTypeName = select.options[select.selectedIndex].text;
    if (!productTypeId) return;
    showView('view-request');
    await initRequestForm(productTypeId, productTypeName);
  });

  // ── Back buttons ──
  document.getElementById('selector-back-btn').addEventListener('click', async () => {
    showView('view-dashboard');
    const sess = await getSession();
    await initDashboard(sess);
  });

  document.getElementById('request-back-btn').addEventListener('click', () => {
    showView('view-selector');
  });

  document.getElementById('results-dashboard-btn').addEventListener('click', async () => {
    showView('view-dashboard');
    const sess = await getSession();
    await initDashboard(sess);
  });

  document.getElementById('results-new-btn').addEventListener('click', async () => {
    showView('view-selector');
    await initCustomerSelector();
  });

  // ── Print ──
  document.getElementById('results-print-btn').addEventListener('click', () => {
    window.print();
  });

  // ── Override request.js submit to go to customer results view ──
  // request.js calls showView('view-results') and renderResults() — these work
  // as-is since the HTML IDs match. No override needed.
}

// Customer-scoped selector: only active product types with a template
async function initCustomerSelector() {
  const sel     = document.getElementById('product-type-select');
  const errorEl = document.getElementById('selector-error');
  errorEl.classList.add('hidden');
  sel.innerHTML = '<option value="">Loading\u2026</option>';

  try {
    const { data, error } = await sbClient
      .from('pm_product_types')
      .select('id, display_name')
      .eq('is_active', true)
      .order('display_name');
    if (error) throw error;

    sel.innerHTML = '<option value="">Select a product type\u2026</option>';
    (data || []).forEach(pt => {
      const opt = document.createElement('option');
      opt.value = pt.id;
      opt.textContent = pt.display_name;
      sel.appendChild(opt);
    });
  } catch (err) {
    errorEl.textContent = 'Failed to load product types: ' + err.message;
    errorEl.classList.remove('hidden');
  }
}

document.addEventListener('DOMContentLoaded', initCustomerApp);
