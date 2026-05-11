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
  ['user-email', 'user-email-request', 'user-email-results'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = email;
  });
}

async function init() {
  // Check existing session
  const session = await getSession();
  if (session) {
    setUserEmailAll(session.user.email);
    showView('view-selector');
    await initSelector();
  } else {
    showView('view-login');
  }

  // ===== LOGIN =====
  const loginForm = document.getElementById('login-form');
  const loginBtn = document.getElementById('login-btn');
  const loginError = document.getElementById('login-error');

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.classList.add('hidden');
    loginBtn.disabled = true;
    loginBtn.textContent = 'Signing in\u2026';
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    try {
      const user = await signIn(email, password);
      setUserEmailAll(user.email);
      showView('view-selector');
      await initSelector();
    } catch (err) {
      loginError.textContent = err.message;
      loginError.classList.remove('hidden');
    } finally {
      loginBtn.disabled = false;
      loginBtn.textContent = 'Sign In';
    }
  });

  // ===== LOGOUT (all views) =====
  ['logout-btn', 'logout-btn-request', 'logout-btn-results'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', async () => {
      await signOut();
      showView('view-login');
    });
  });

  // ===== SELECTOR → REQUEST =====
  document.getElementById('start-request-btn').addEventListener('click', async () => {
    const select = document.getElementById('product-type-select');
    const productTypeId = parseInt(select.value);
    const productTypeName = select.options[select.selectedIndex].text;
    if (!productTypeId) return;
    showView('view-request');
    await initRequestForm(productTypeId, productTypeName);
  });

  // ===== BACK: REQUEST → SELECTOR =====
  document.getElementById('request-back-btn').addEventListener('click', () => {
    showView('view-selector');
  });

  // ===== BACK: RESULTS → SELECTOR =====
  document.getElementById('results-back-btn').addEventListener('click', () => {
    showView('view-selector');
  });
}

document.addEventListener('DOMContentLoaded', init);
