# KN Admin Portal — Full Prototype

## Contents
- `index.html`: all-in-one admin portal prototype (browser Local Storage).
- `supabase/schema.sql`: relational schema starter for Supabase.

## Modules
Dashboard; Master Agent; Airlines/Flight Prices; Destinations; Tour Packages; Departures; Summary Quota; Booking; Participants; Rooming; Payments; Invoice preview/print; CSV reports; Settings; JSON backup/restore.

## Deploy on GitHub Pages
1. Create repository (suggested `kn-admin-portal`).
2. Upload `index.html` to repository root. Optional: upload the `supabase/` directory too for SQL reference.
3. Repository > Settings > Pages > Deploy from branch > `main` > `/root`.
4. Visit the Pages URL and hard refresh.

## Data storage / limitations
This build is a complete UI and functional prototype using browser Local Storage. It does NOT connect to Supabase, does NOT have server authentication, and is NOT multi-user. Invoice print is a basic layout; CSV exports are available. Browser popup permission may be required for invoice preview.

**Do not use passport/identity data in a public production system yet.** GitHub Pages is static hosting. Before production use, configure authentication, backend APIs, row-level security policies, and secure data handling. The included schema is a starting schema only; no credentials or Supabase project connection are embedded.

## Supabase schema
Open `supabase/schema.sql` in Supabase SQL Editor. It creates tables and enables RLS, but deliberately does not add permissive policies. Configure policies and auth before connecting a frontend.
