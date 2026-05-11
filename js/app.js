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

async function init() {
  // Check existing session on load
  const session = await getSession();
  if (session) {
    document.getElementById('user-email').textContent = session.user.email;
    showView('view-selector');
    await initSelector();
  } else {
    showView('view-login');
  }

  // Login form
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
      document.getElementById('user-email').textContent = user.email;
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

  // Logout
  document.getElementById('logout-btn').addEventListener('click', async () => {
    await signOut();
    showView('view-login');
  });
}

document.addEventListener('DOMContentLoaded', init);
