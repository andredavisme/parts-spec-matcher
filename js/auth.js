// Auth helpers
async function signIn(email, password) {
  const { data, error } = await sbClient.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.user;
}

async function signOut() {
  await sbClient.auth.signOut();
}

async function getSession() {
  const { data: { session } } = await sbClient.auth.getSession();
  return session;
}
