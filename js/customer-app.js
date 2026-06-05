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

// ── Customer request submit override ──────────────────────────────────────────
// Wraps request.js initRequestForm so the inserted pm_part_requests row
// uses initiated_by='customer' and records customer_email from the session.
// The sales_rep field is set to null; customer_name is unused in this portal.
const _origInitRequestForm = initRequestForm;

async function initRequestForm(productTypeId, productTypeName) {
  // Let request.js build the form fields as normal
  await _origInitRequestForm(productTypeId, productTypeName);

  // Now replace the form's onsubmit with a customer-aware version
  const form      = document.getElementById('request-form');
  const errorEl   = document.getElementById('request-error');
  const submitBtn = document.getElementById('request-submit-btn');

  form.onsubmit = async (e) => {
    e.preventDefault();
    errorEl.classList.add('hidden');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Finding matches\u2026';

    try {
      const session    = await getSession();
      const userEmail  = session.user.email;
      const customerRef = document.getElementById('customer-ref')?.value.trim() || null;

      // Insert request with customer context
      const { data: reqData, error: reqError } = await sbClient
        .from('pm_part_requests')
        .insert({
          product_type_id: productTypeId,
          template_id:     currentTemplate.id,
          customer_name:   null,
          customer_ref:    customerRef,
          customer_email:  userEmail,
          sales_rep:       null,
          initiated_by:    'customer',
          status:          'open'
        })
        .select('id')
        .single();
      if (reqError) throw reqError;
      const requestId = reqData.id;

      // Insert spec values
      const specValues = [];
      currentFields.forEach(field => {
        const sd    = field.pm_spec_definitions;
        const input = document.getElementById(`field-${sd.id}`);
        if (!input || input.value === '') return;
        const isNum = sd.match_type === 'nearest' || sd.match_type === 'range';
        specValues.push({
          request_id:          requestId,
          spec_definition_id:  sd.id,
          value_text:          isNum ? null : input.value.trim(),
          value_numeric:       isNum ? parseFloat(input.value) : null
        });
      });

      if (specValues.length > 0) {
        const { error: valError } = await sbClient
          .from('pm_request_spec_values')
          .insert(specValues);
        if (valError) throw valError;
      }

      // Run match
      const { data: matchData, error: matchError } = await sbClient
        .rpc('run_match', { p_request_id: requestId });
      if (matchError) throw matchError;

      window.currentRequestId       = requestId;
      window.currentMatchResults    = matchData;
      window.currentProductTypeName = productTypeName;
      showView('view-results');
      renderResults(matchData, productTypeName);

    } catch (err) {
      errorEl.textContent = 'Error: ' + err.message;
      errorEl.classList.remove('hidden');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Find Matches \u2192';
    }
  };
}
// ───────────────────────────────────────────────────────────────────────────────

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
}

// Customer-scoped selector: active product types only
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
