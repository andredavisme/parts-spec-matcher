// Supabase client
// Named sbClient to avoid collision with the `supabase` global exposed by the CDN bundle.
const sbClient = window.supabase.createClient(
  'https://hhyhulqngdkwsxhymmcd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhoeWh1bHFuZ2Rrd3N4aHltbWNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYxNjI0NjUsImV4cCI6MjA2MTczODQ2NX0.NTJiePsMrTGOiGXe8gLVWEBZPVBuvxYm6t-8TJUf-g8'
);
