/* ============================================================================
   Wisp configuration
   The site talks to this Supabase project for its database, accounts, and image
   storage. Both values below are safe to commit: the anon key is meant to be
   public and ships in the browser; your data is protected by Row Level Security
   in the database, not by hiding the key.

   NEVER put a service_role or "secret" key here. Those bypass Row Level Security
   and must stay private. Only the project URL and the anon public key belong in
   this file. Leave them blank to run the site in demo mode (mock data).
   ==========================================================================*/
window.WISP_CONFIG = {
  SUPABASE_URL: "https://cznvbvcfhxwmhbnwczho.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6bnZidmNmaHh3bWhibndjemhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5MDY0ODgsImV4cCI6MjEwMjQ4MjQ4OH0.hD-eIeDjjq26RQ-N90qq2jyt8qLW2hAuT1x_gw62Gss"
};
