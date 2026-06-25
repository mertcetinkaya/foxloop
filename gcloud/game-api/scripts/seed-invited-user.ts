/**
 * Optional: add invited user to Firestore (same as manual Console entry).
 * Usage: npm run seed-invited -- inviteduser inviteduser1
 */
import { config as loadEnv } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { createInvitedUser } from "../src/services/invited-users.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.resolve(__dirname, "../.env") });

const [username, password] = process.argv.slice(2);

if (!username || !password) {
  console.error("Usage: npm run seed-invited -- <username> <password>");
  process.exit(1);
}

if (!process.env.GOOGLE_CLOUD_PROJECT) {
  console.error("GOOGLE_CLOUD_PROJECT must be set in .env");
  process.exit(1);
}

await createInvitedUser(username, password);
console.log(
  `Added invitedUsers/${username.trim().toLowerCase()} with plain password field.`
);
