# Shared pigeon chat setup

The website is static. Shared messages use a Supabase database and the `pigeon-chat` Edge Function. The function checks a random token in the invitation URL before it can read or write messages.

## Set up Supabase

1. Create a Supabase project.
2. Open **SQL Editor** in the Supabase dashboard and run [`schema.sql`](./schema.sql).
3. Create a server-side **Secret API key** in the project's API settings. Add it to Edge Function secrets as `PIGEON_CHAT_SECRET_KEY`. Keep this key out of the website and GitHub.
4. Install the Supabase CLI, then link the project and deploy the function from the repository root:

   ```sh
   supabase login
   supabase link --project-ref YOUR_PROJECT_REF
   supabase secrets set PIGEON_CHAT_SECRET_KEY=YOUR_SECRET_KEY
   supabase functions deploy pigeon-chat
   ```

   `SUPABASE_URL` is available to the Edge Function automatically. The function sets `verify_jwt = false` in [`config.toml`](./config.toml) because it verifies each private room token itself.

5. In [`../chat-config.js`](../chat-config.js), set `supabaseUrl` and `publishableKey` to the project's URL and publishable key. The publishable key is intended for the browser; never put the Secret API key there.
6. Host the website on a public HTTPS URL. Open it once, then use **Copy private invitation link** and send that link. Both people must use the copied link to enter the same chat room.

Each invitation URL contains a random room ID and a random room token. Treat the link as private: anyone who has it can join that conversation. Messages are stored in the Supabase database until removed.
