# Deployment: Vercel frontend + Hostinger API + MongoDB Atlas

This repository is configured as a split deployment:

- `client/` is the Vite/React frontend deployed by Vercel.
- `server/` is the Express API run on a Hostinger VPS (or Hostinger's Node.js app hosting).
- MongoDB Atlas is the database.
- S3 remains required for uploaded MCQ images and PDF materials; Hostinger does not replace that storage automatically.

## 1. Choose the API URL first

Create an API subdomain such as `api.your-domain.com` and point its DNS `A` record to the Hostinger server IP. The final API value used everywhere is:

```text
https://api.your-domain.com/api/v1
```

Do not use a trailing slash.

## 2. Hostinger backend

These commands are for a Hostinger VPS with SSH access. Clone the repository and enter the server directory:

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL> slmms
cd slmms/server
npm ci --omit=dev
cp .env.example .env
nano .env
```

Set at least `MONGO_URI`, `JWT_SECRET`, `CLIENT_ORIGINS`, and `BASE_URL` in `server/.env`. Set `MONGO_DB_NAME` only if your Atlas URI does not already select the correct database. Keep every S3 variable because the current code reads and writes uploads to the existing S3 bucket.

Start and persist the app with PM2:

```bash
npm install -g pm2
pm2 start index.js --name slmms-api
pm2 save
pm2 startup
```

Copy `deploy/hostinger-nginx.conf` to `/etc/nginx/sites-available/slmms-api`, replace `api.example.com`, enable it, test it, and obtain TLS:

```bash
sudo ln -s /etc/nginx/sites-available/slmms-api /etc/nginx/sites-enabled/slmms-api
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d api.example.com
```

Then verify it publicly:

```bash
curl https://api.example.com/api/v1/health
```

Expected result: `{"ok":true}`.

If your Hostinger plan is shared hosting instead of a VPS/Node.js application plan, it cannot run this persistent Express + PM2 setup. Use Hostinger's Node.js application feature or a VPS.

The API generates PDFs with Puppeteer. `npm ci` normally downloads its Chromium browser; if the server blocks that download or PDF generation fails with a missing-browser error, run `npx puppeteer browsers install chrome` from `server/` and install the OS libraries named in the resulting error. Test a paper-generation request after deployment.

## 3. Vercel frontend

Import the GitHub repository in Vercel and use these settings:

| Setting | Value |
| --- | --- |
| Root Directory | `client` |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm ci` |

In Vercel project **Environment Variables**, set this for Production (and Preview too if you want preview deployments to call the live API):

```text
VITE_API_BASE_URL=https://api.example.com/api/v1
```

Redeploy after adding it. `client/vercel.json` makes direct visits to React routes such as `/admin/dashboard` resolve to the SPA instead of returning 404.

Finally, add the actual Vercel production URL and any custom frontend domain to `CLIENT_ORIGINS` on the backend, then run `pm2 restart slmms-api --update-env`.

## Important checks before going live

- Atlas **Network Access** must allow the Hostinger server's public IP (or the appropriate temporary rule while testing).
- The code uses S3 for all file uploads, including MCQ images and learning materials. Existing `AWS_*` values are still required. Migrating files to Hostinger storage is a separate code/data migration.
- `BASE_URL` must be the public API URL, or generated PDFs cannot fetch private MCQ images from the API.
- Never commit `.env`, private deploy keys, or Atlas/S3 credentials. The committed `.env.example` files are safe templates only.
- The backend routes currently do not consistently apply authentication middleware. Deploying it does not fix that access-control issue; restrict or add auth before exposing sensitive admin operations publicly.
