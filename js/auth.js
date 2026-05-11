// Auth helpers
async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.user;
}

async function signOut() {
  await supabase.auth.signOut();
}

async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}
