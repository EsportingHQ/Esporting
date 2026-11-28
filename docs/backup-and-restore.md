# Database backup and restore

What is backed up: the `public` schema (all app data), `auth` (accounts and logins) and the
`storage` index. Uploaded logo files are not in the dump; they can be re-uploaded from the logos zip.
Backups run every night at 03:30 Lagos time and are encrypted before they leave GitHub.

## One-time setup
1. Cloudflare dashboard > R2 > create a bucket, e.g. `esportinghq-backups` (free tier is plenty).
2. In the bucket's Settings > Object lifecycle rules, add a rule to delete objects after 30 days.
3. R2 > Manage API tokens > create a token with Object Read & Write, limited to that bucket.
4. Supabase > Connect > Session pooler: copy the connection string (GitHub runs on IPv4, the
   direct connection is IPv6 only). Put your real database password in it.
5. Make a long random passphrase. Give copies to the founder and two trusted people
   (password manager). Without it the backups cannot be opened, so do not keep it in one place.
6. GitHub repo > Settings > Secrets and variables > Actions: add SUPABASE_DB_URL, BACKUP_PASSPHRASE,
   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET.
7. Actions tab > "Database backup" > Run workflow. Check the file appears in the bucket.

## Restore (do a practice restore every quarter)
1. Download the newest `.dump.gpg` from the bucket.
2. `gpg --output backup.dump --decrypt esportinghq_DATE.dump.gpg` (enter the passphrase)
3. Create a NEW empty Supabase project (never restore over the live one while testing).
4. `pg_restore --no-owner --no-privileges --clean --if-exists -d "NEW_PROJECT_DB_URL" backup.dump`
5. Check the data, then point the site's Supabase keys at it if you are recovering for real.
