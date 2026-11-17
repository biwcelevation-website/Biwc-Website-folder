# Supabase and Netlify setup

The site keeps Netlify Forms as its form handler. Once configured, each contact,
prayer, and newsletter submission is also inserted into Supabase. If Supabase
credentials are left blank, submissions continue through Netlify as before.

## Supabase

1. Create a Supabase project.
2. In the Supabase SQL Editor, run `supabase-schema.sql`. If you already ran an
   earlier version, run this updated file again to add the dashboard access rules.
3. Copy the project URL and the public publishable (or legacy anon) key from the project's
   API settings into `url` and `anonKey` in `supabase-config.js`.
4. Create an Auth user for each BIWC administrator. Disable public sign-ups in
   Supabase Auth settings.
5. In the SQL Editor, assign each approved user administrator access by replacing
   the example email and running:

   ```sql
   insert into public.biwc_admins (user_id)
   select id from auth.users where lower(email) = lower('admin@example.com')
   on conflict (user_id) do nothing;
   ```

   Run this only in the trusted Supabase SQL Editor, never in the browser.
6. Deploy the site over HTTPS and submit one test of each form. Sign in at
   `/admin.html` to view up to the 100 latest submissions in each category.

The public key is intended for browser use. The SQL grants anonymous visitors
insert-only access and enables row-level security; it does not grant them
permission to read submitted records. Review submitted data in the Supabase
dashboard using an authorized account. Only user IDs added to `biwc_admins` can
read submissions through the admin dashboard. Never put a secret or
`service_role` key in this site's files.

Prayer requests may contain sensitive personal information. Restrict dashboard
access to authorized BIWC staff and define an appropriate retention policy.

## Netlify

The `netlify.toml` file publishes this static site from the project root.
Netlify Forms are already enabled on the contact, prayer, and newsletter forms.
Connect this folder/repository to a Netlify site and enable form submissions in
that site's settings; no Netlify API token belongs in the site code.
