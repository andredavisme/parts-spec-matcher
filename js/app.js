// View routing and app initialization
function showView(viewId) {
  document.querySelectorAll('.view').forEach(v => {
    v.classList.remove('active');
    v.classList.add('hidden');
  });
  const target = document.getElementById(viewId);
  target.classList.remove('hidden');
  target.classList.add('active');
}

function setUserEmailAll(email) {
  [
    'user-email',
    'user-email-request',
    'user-email-results',
    'user-email-admin-vendors',
    'user-email-admin-brands',
    'user-email-admin-specs',
    'user-email-admin-catalog',
    'user-email-admin-upload'
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = email;
  });
}

async function init() {
  const session = await getSession();
  if (session) {
    setUserEmailAll(session.user.email);
    showView('view-selector');
    await initSelector();
    maybeShowAdminBtns(session);
  } else {
    showView('view-login');
  }

  // Login
  const loginForm  = document.getElementById('login-form');
  const loginBtn   = document.getElementById('login-btn');
  const loginError = document.getElementById('login-error');

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.classList.add('hidden');
    loginBtn.disabled = true;
    loginBtn.textContent = 'Signing in…';
    const email    = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    try {
      const user = await signIn(email, password);
      setUserEmailAll(user.email);
      showView('view-selector');
      await initSelector();
      const sess = await getSession();
      maybeShowAdminBtns(sess);
    } catch (err) {
      loginError.textContent = err.message;
      loginError.classList.remove('hidden');
    } finally {
      loginBtn.disabled = false;
      loginBtn.textContent = 'Sign In';
    }
  });

  // Logout (all views)
  [
    'logout-btn',
    'logout-btn-request',
    'logout-btn-results',
    'logout-btn-admin-vendors',
    'logout-btn-admin-brands',
    'logout-btn-admin-specs',
    'logout-btn-admin-catalog',
    'logout-btn-admin-upload'
  ].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', async () => {
      await signOut();
      showView('view-login');
    });
  });

  // Selector → Request
  document.getElementById('start-request-btn').addEventListener('click', async () => {
    const select = document.getElementById('product-type-select');
    const productTypeId   = parseInt(select.value);
    const productTypeName = select.options[select.selectedIndex].text;
    if (!productTypeId) return;
    showView('view-request');
    await initRequestForm(productTypeId, productTypeName);
  });

  // Back: Request → Selector
  document.getElementById('request-back-btn').addEventListener('click', () => showView('view-selector'));

  // Back: Results → Selector
  document.getElementById('results-back-btn').addEventListener('click', () => showView('view-selector'));

  // Admin: Vendors
  document.getElementById('admin-vendors-btn').addEventListener('click', async () => {
    showView('view-admin-vendors');
    await initAdminVendors();
  });
  document.getElementById('admin-vendors-back-btn').addEventListener('click', () => showView('view-selector'));

  // Admin: Brands
  document.getElementById('admin-brands-btn').addEventListener('click', async () => {
    showView('view-admin-brands');
    await initAdminBrands();
  });
  document.getElementById('admin-brands-back-btn').addEventListener('click', () => showView('view-selector'));

  // Admin: Spec Definitions
  document.getElementById('admin-specs-btn').addEventListener('click', async () => {
    showView('view-admin-specs');
    await initAdminSpecs();
  });
  document.getElementById('admin-specs-back-btn').addEventListener('click', () => showView('view-selector'));

  // Admin: Catalog Items
  document.getElementById('admin-catalog-btn').addEventListener('click', async () => {
    showView('view-admin-catalog');
    await initAdminCatalog();
  });
  document.getElementById('admin-catalog-back-btn').addEventListener('click', () => showView('view-selector'));

  // Admin: Catalog Upload
  document.getElementById('admin-upload-btn').addEventListener('click', () => {
    showView('view-admin-upload');
    initAdminUpload();
  });
  document.getElementById('admin-upload-back-btn').addEventListener('click', () => showView('view-selector'));

  // Bind modal + upload events
  bindAdminVendorsEvents();
  bindAdminBrandsEvents();
  bindAdminSpecsModalEvents();
  bindAdminCatalogEvents();
  bindAdminUploadEvents();
}

function maybeShowAdminBtns(session) {
  const meta = session && session.user && session.user.app_metadata;
  const isAdmin = meta && meta.parts_matcher_role === 'admin';
  [
    'admin-vendors-btn',
    'admin-brands-btn',
    'admin-catalog-btn',
    'admin-specs-btn',
    'admin-upload-btn'
  ].forEach(id => {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.classList.toggle('hidden', !isAdmin);
  });
}

document.addEventListener('DOMContentLoaded', init);
