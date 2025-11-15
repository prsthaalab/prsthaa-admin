Prsthaa - Supabase Admin UI (starter)
====================================

What this is
------------
A minimal React Admin UI that connects to Supabase to manage products:
- Sign in (email magic-link)
- Add / Edit / Delete products
- Upload product images to Supabase Storage

Files included
--------------
- src/
  - index.js
  - App.js
  - supabaseClient.js
  - Admin.js
  - Login.js
- sql/
  - create_products_table.sql
- README.md (this file)

Quick setup (non-technical steps)
--------------------------------
1. Create a Supabase project at https://app.supabase.com
2. In Supabase -> SQL Editor, run the SQL in sql/create_products_table.sql
3. In Supabase -> Storage, create a bucket named: product-images
4. In Supabase -> Settings -> API, copy:
   - SUPABASE_URL
   - SUPABASE_ANON_KEY

5. In Netlify (or locally), set environment variables:
   - REACT_APP_SUPABASE_URL  = <SUPABASE_URL>
   - REACT_APP_SUPABASE_ANON_KEY = <SUPABASE_ANON_KEY>

6. Install & run locally (or deploy to Netlify):
   - npm install
   - npm start   (for local testing)
   - For Netlify deploy, connect this repo and set the env vars in Site settings.

Notes on security
-----------------
- This starter uses the Supabase anon key and client-side authenticated users.
- For production, create admin accounts in Supabase Auth and restrict access using RLS or server-side functions.
- I can help lock this down (add RLS policies and service-side functions) if you want.

Need help?
----------
Tell me when you've created the Supabase project and I will:
- Walk you through creating one admin account
- Help set Row Level Security or server functions for safer production use
