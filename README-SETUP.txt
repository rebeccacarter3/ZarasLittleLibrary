ZARA'S LITTLE LIBRARY — D1 CONNECTION ONLY

Add these three files to the ROOT of the EXISTING GitHub repository:
  wrangler.jsonc
  .assetsignore
  src/index.js

Do not replace or delete index.html, assets/, books.json, or manifest.webmanifest.
Commit to main; the existing Cloudflare GitHub build should run npx wrangler deploy.
After the deployment succeeds, visit:
  https://zaraslittlelibrary.com/api/health
Expected: {"status":"ok","database":"connected"}
Then verify the home page, reading controls, and images still work.

This stage does NOT create or update reader data. The API only checks database connectivity.
Note: The asset directory is set to the repository root to match the existing
static-file layout. The .assetsignore excludes Worker code/config from public assets.
