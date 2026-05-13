// Supabase client
// Named sbClient to avoid collision with the `supabase` global exposed by the CDN bundle.
//
// Uses an in-memory storage adapter for auth so the session is never written to
// localStorage or sessionStorage. This prevents tracking-prevention errors in
// private/incognito browsers (Edge, Safari, Firefox) where third-party CDN scripts
// are blocked from accessing browser storage. Trade-off: session is lost on page reload,
// but that is acceptable for this internal tool.
const _memStore = {};
const _inMemoryStorage = {
  getItem:    (key)        => _memStore[key] ?? null,
  setItem:    (key, value) => { _memStore[key] = value; },
  removeItem: (key)        => { delete _memStore[key]; }
};

const sbClient = window.supabase.createClient(
  'https://hhyhulqngdkwsxhymmcd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhoeWh1bHFuZ2Rrd3N4aHltbWNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxMzEyMDEsImV4cCI6MjA5MjcwNzIwMX0.dmSy7Q8Je5lEY4XCFzwvfPnkBYLebPE0yZMhy6Y8czI',
  {
    auth: {
      storage: _inMemoryStorage
    }
  }
);
