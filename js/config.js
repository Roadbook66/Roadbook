/* =========================================================================
   Roadbook — réglages du serveur de la communauté (Supabase)
   Les deux valeurs se trouvent dans Supabase : Project Settings → API.
   La clé « anon » (ou « publishable ») est faite pour être dans l’application :
   ce sont les règles de la base (outils/communaute.sql) qui protègent les données.
   Ne mets JAMAIS ici la clé « service_role » (ou « secret »).
   ========================================================================= */
RB.config = {
  supabaseUrl: "https://gjbrzplaurmasiurtxjb.supabase.co",
  // clé publique « anon » (faite pour être dans l’application)
  supabaseCle: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdqYnJ6cGxhdXJtYXNpdXJ0eGpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI1ODI2NTgsImV4cCI6MjEwODE1ODY1OH0.s1TCP0d8DIFehd4dzxHpfv02xdR6JRc7BCzPy0h3vk4"
};
