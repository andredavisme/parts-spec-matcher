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
  ['user-email', 'user-email-request', 'user-email-results', 'user-email-admin-specs'].forEach(id => {
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
    maybeShowAdminBtn(session);
  } else {
    showView('view-login');
  }

  // Login
  const loginForm = document.getElementById('login-form');
  const loginBtn  = document.getElementById('login-btn');
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
      // Re-fetch session to get app_metadata
      const sess = await getSession();
      maybeShowAdminBtn(sess);
    } catch (err) {
      loginError.textContent = err.message;
      loginError.classList.remove('hidden');
    } finally {
      loginBtn.disabled = false;
      loginBtn.textContent = 'Sign In';
    }
  });

  // Logout (all views)
  ['logout-btn', 'logout-btn-request', 'logout-btn-results', 'logout-btn-admin-specs'].forEach(id => {
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
  document.getElementById('request-back-btn').addEventListener('click', () => {
    showView('view-selector');
  });

  // Back: Results → Selector
  document.getElementById('results-back-btn').addEventListener('click', () => {
    showView('view-selector');
  });

  // Admin Spec Definitions button
  document.getElementById('admin-specs-btn').addEventListener('click', async () => {
    showView('view-admin-specs');
    await initAdminSpecs();
  });

  // Back: Admin → Selector
  document.getElementById('admin-specs-back-btn').addEventListener('click', () => {
    showView('view-selector');
  });

  // Bind modal events
  bindAdminSpecsModalEvents();
}

function maybeShowAdminBtn(session) {
  const btn = document.getElementById('admin-specs-btn');
  if (!btn) return;
  const meta = session && session.user && session.user.app_metadata;
  if (meta && meta.parts_matcher_role === 'admin') {
    btn.classList.remove('hidden');
  } else {
    btn.classList.add('hidden');
  }
}

document.addEventListener('DOMContentLoaded', init);
