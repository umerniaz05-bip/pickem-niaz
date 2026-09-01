/**
 * Admin utility: create a family login account.
 *
 * Usage (loads .env.local for the service-role key):
 *   node --env-file=.env.local scripts/create-user.mjs \
 *     --email dad@example.com --password 'somePassword' [--username dad] [--display "Dad"]
 *
 * Accounts are created pre-confirmed (no email verification step). A profile row
 * is auto-created by the on_auth_user_created trigger; --username / --display
 * just override its defaults.
 */
import { createClient } from "@supabase/supabase-js";

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

const email = arg("email");
const password = arg("password");
const username = arg("username");
const display = arg("display");

if (!email || !password) {
  console.error("Missing --email or --password");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) {
  console.error(
    "NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set. Run with: node --env-file=.env.local scripts/create-user.mjs ...",
  );
  process.exit(1);
}

const admin = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: display ? { display_name: display } : undefined,
});

if (error) {
  console.error("createUser failed:", error.message);
  process.exit(1);
}

const userId = data.user.id;
console.log(`Created auth user ${email} (${userId})`);

if (username || display) {
  const patch = {};
  if (username) patch.username = username;
  if (display) patch.display_name = display;
  const { error: pErr } = await admin
    .from("profiles")
    .update(patch)
    .eq("id", userId);
  if (pErr) {
    console.error("profile update failed:", pErr.message);
    process.exit(1);
  }
  console.log("Profile updated:", patch);
}

const { data: profile } = await admin
  .from("profiles")
  .select("username, display_name")
  .eq("id", userId)
  .single();
console.log("Final profile:", profile);
