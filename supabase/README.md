# Shared pigeon chat setup

The website is static. Shared messages use a Supabase database and the `pigeon-chat` Edge Function. The function checks a random token in the invitation URL before it can read or write messages.

## Set up Supabase

1. Create a Supabase project.
2. Open **SQL Editor** in the Supabase dashboard and run [`schema.sql`](./schema.sql).
3. In **Settings → API Keys**, create a **Secret API key**. In the Supabase dashboard's **Edge Function Secrets** settings, add it under the name `PIGEON_CHAT_SECRET_KEY`. Keep this key out of the website and GitHub.
4. Install the Supabase CLI, open a terminal in the repository folder, then link the project and deploy the function:

   ```sh
   supabase login
   supabase link --project-ref YOUR_PROJECT_REF
   supabase functions deploy pigeon-chat
   ```

   `SUPABASE_URL` is available to the Edge Function automatically. The function sets `verify_jwt = false` in [`config.toml`](./config.toml) because it verifies each private room token itself.

5. Copy the **Project URL** and **Publishable API key** from the project's Connect dialog or API Keys settings. Put them in [`../chat-config.js`](../chat-config.js). The publishable key is intended for browser use; never put the Secret API key there.
6. Host the website on a public HTTPS URL. For GitHub Pages, choose **Settings → Pages → Deploy from a branch → `main` → `/(root)`** in the GitHub repository and save.
7. Open the hosted site once, then use **Copy private invitation link** and send that link. Both people must use the copied link to enter the same chat room.

Each invitation URL contains a random room ID and a random room token. Treat the link as private: anyone who has it can join that conversation. Messages are stored in the Supabase database until removed.
