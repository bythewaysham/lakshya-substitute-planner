# Lakshya Substitute Planner

The planner stores teacher profiles, each teacher's weekly timetable, school
period timings, date-wise absences, and substitution assignments in separate
Supabase tables. Browser localStorage is used only as a recovery cache.

## Configure Supabase

1. Create a Supabase project.
2. In the Supabase dashboard, open **SQL Editor**, paste the contents of
   [`schema.sql`](./schema.sql), and run it. This creates the periods, teachers,
   timetable, absence, and substitution-assignment tables with row-level
   security enabled. If the old `app_state` table contains data, the script
   migrates it into the new tables once.
3. In the Supabase dashboard, open **Connect** and copy the PostgreSQL
   connection string (use the session pooler if the direct connection is not
   reachable). Put it in a local `.env` file:

   If `.env` does not exist, create it from `.env.example`. If it already
   exists, edit it instead of overwriting it. Set `DATABASE_URL` to the
   Supabase connection string. Keep its database password private and only in
   the server environment, never in browser code.

## Run locally

1. Install Node.js 18+.
2. Install dependencies and start the server:

   ```sh
   npm install
   npm start
   ```

3. Open <http://localhost:3000>. On first load, existing planner data in that
   browser is copied to Supabase if the Supabase table is empty. Otherwise,
   Supabase's existing data is loaded.

For the first launch, open the app on the device/browser that currently has
the latest teacher and timetable data before opening it on other devices. This
lets the app copy that browser's saved data into an empty Supabase table.

All devices must open the same running/deployed planner server URL; opening
`localhost` separately on each device will not share the same server. For
devices on the same Wi-Fi network, use
`http://<server-computer-LAN-IP>:3000` on every device. The server must remain
running. To access it from anywhere, deploy the Node server with HTTPS and keep
the Supabase credentials in the hosting provider's server-side environment
variables. Use **Save to Supabase** to manually push changes; the planner also
attempts to save edits automatically and shows the current sync status.

This app currently has no user login. Keep the server private or add
authentication before exposing it publicly; the service-role key is only used
by the server and bypasses Supabase row-level security.
