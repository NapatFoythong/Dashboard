# Staff workspace setup

The public dashboard remains open and read-only. Staff sign in at `/staff/login/`; the shared account is supplied through environment variables. Publication entries, hidden source rows, and faculty-to-programme overrides are stored in Cloudflare D1.

## Cloudflare D1 and Worker

From the repository root, apply the additional D1 schema to the existing database:

```powershell
npx wrangler d1 execute coc-dashboard-visitors --remote --file=drizzle/0001_staff_content.sql
```

Create a long random token locally with:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Save that same token as the Cloudflare Worker secret and as the Vercel environment variable `STAFF_API_TOKEN`:

```powershell
npx wrangler secret put STAFF_API_TOKEN
```

Deploy the updated Worker after building its bundled assets:

```powershell
npm run build
npx wrangler deploy
```

## Vercel environment variables

In the existing Vercel project settings, add these variables for Production (and Preview if needed):

- `STAFF_USERNAME`: one staff sign-in name.
- `STAFF_PASSWORD`: a long password for that account.
- `STAFF_SESSION_SECRET`: a separate random 32-byte value used to sign the HttpOnly session cookie.
- `STAFF_API_TOKEN`: the same value saved as the Cloudflare Worker secret.
- `CLOUDFLARE_VISITORS_API`: the existing Worker base URL used by the visitor counter and charts.

Redeploy the existing Vercel project after changing its environment variables. No new Vercel project is needed. Keep the password and both tokens out of Git and browser code.

## Local development

The custom dev server forwards `/api/publications` and `/api/staff/*` to FastAPI on port 8000. In a PowerShell terminal, set the variables before starting the API:

```powershell
$env:CLOUDFLARE_VISITORS_API = "https://<your-worker>.<your-subdomain>.workers.dev"
$env:STAFF_USERNAME = "<staff-login-name>"
$env:STAFF_PASSWORD = "<long-random-password>"
$env:STAFF_SESSION_SECRET = "<random-session-secret>"
$env:STAFF_API_TOKEN = "<same-token-as-cloudflare>"
npm run charts:api
```

Start the website in a second terminal with `npm run dev`, then open `http://localhost:3000/staff/login/`. If the API or D1 overlay is unavailable, the public dashboard falls back to the imported CSV snapshot.

## Data behaviour

- Staff-added rows are stored separately from `data/research.json` and appear in the public dashboard after it reloads its D1 overlay.
- Deleting a source row hides it from the dashboard and can be undone in the staff page; it does not alter the CSV snapshot.
- The roster currently does not distinguish AISE from DE. Existing DE assignments stay DE, `MsComp` is excluded, and staff can assign AISE/DE/COMP/Dbiz affiliations in the staff workspace.
- The month filter affects totals and charts as well as the publication table. The month sort orders records by year and month.
