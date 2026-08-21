# Creates root .env for free local publish via Cloudflare Tunnel (Windows / XAMPP).
# Usage:
#   powershell -ExecutionPolicy Bypass -File .\deploy\write-env-local.ps1
# Optional:
#   powershell -ExecutionPolicy Bypass -File .\deploy\write-env-local.ps1 -MysqlUser root -MysqlPass "" -AdminPass "Admin12345"

param(
  [string]$MysqlUser = "root",
  [string]$MysqlPass = "",
  [string]$AdminPass = "Admin12345",
  [string]$Domain = "dhruvmodi.online"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path (Join-Path $Root "package.json"))) {
  $Root = Get-Location
}

$Jwt = -join ((1..64) | ForEach-Object { "{0:x}" -f (Get-Random -Max 16) })
try {
  $Jwt = node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
} catch {
  Write-Host "node not found; using fallback secret"
}

$Auth = if ($MysqlPass -eq "") { $MysqlUser } else { "$MysqlUser`:$MysqlPass" }
$DatabaseUrl = "mysql://${Auth}@127.0.0.1:3306/mydryfruits"

$EnvPath = Join-Path $Root ".env"
@"
NODE_ENV=production
DATABASE_URL="$DatabaseUrl"
PORT=4000
PUBLIC_API_URL="https://$Domain"
JWT_SECRET="$Jwt"
JWT_EXPIRES_IN="7d"
CORS_ORIGIN="https://$Domain,https://www.$Domain"
SITE_URL="https://$Domain"
TRUST_PROXY=true
ADMIN_EMAIL="admin@$Domain"
ADMIN_PASSWORD="$AdminPass"
UPLOAD_DRIVER=local
UPLOAD_DIR=""
CLOUDINARY_CLOUD_NAME=""
CLOUDINARY_API_KEY=""
CLOUDINARY_API_SECRET=""
SENDGRID_API_KEY=""
SENDGRID_FROM_EMAIL=""
SENDGRID_FROM_NAME="MyDryFruits"
SMTP_HOST=""
SMTP_PORT="587"
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM=""
PAYMENTS_ENABLED=false
RAZORPAY_KEY_ID=""
RAZORPAY_KEY_SECRET=""
NEXT_PUBLIC_API_URL="https://$Domain"
NEXT_PUBLIC_SITE_URL="https://$Domain"
NEXT_PUBLIC_SITE_NAME="MyDryFruits"
NEXT_PUBLIC_PAYMENTS_ENABLED=false
INTERNAL_API_URL="http://127.0.0.1:4000"
"@ | Set-Content -Path $EnvPath -Encoding UTF8

$DbEnv = Join-Path $Root "packages\db\.env"
New-Item -ItemType Directory -Force -Path (Split-Path $DbEnv) | Out-Null
Copy-Item $EnvPath $DbEnv -Force

$WebEnv = Join-Path $Root "apps\web\.env.production"
New-Item -ItemType Directory -Force -Path (Split-Path $WebEnv) | Out-Null
Copy-Item $EnvPath $WebEnv -Force

Write-Host ""
Write-Host "Wrote $EnvPath"
Write-Host "Admin login: admin@$Domain"
Write-Host "Admin password: $AdminPass"
Write-Host "Email is NOT required — admin@ is only a username."
Write-Host ""
