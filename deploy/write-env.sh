#!/usr/bin/env bash
# Writes /var/www/mydryfruits/.env for free EC2 + Hostinger domain.
# Usage:
#   bash deploy/write-env.sh 'MYSQL_PASSWORD' 'ADMIN_PASSWORD'
# Example:
#   bash deploy/write-env.sh 'CHANGE_THIS_PASSWORD' 'Admin12345'

set -euo pipefail

ROOT="/var/www/mydryfruits"
MYSQL_PASS="${1:-CHANGE_THIS_PASSWORD}"
ADMIN_PASS="${2:-Admin12345}"
DOMAIN="dhruvmodi.online"

JWT_SECRET="$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"

cat > "$ROOT/.env" <<EOF
NODE_ENV=production
DATABASE_URL="mysql://mydryfruits:${MYSQL_PASS}@127.0.0.1:3306/mydryfruits"
PORT=4000
PUBLIC_API_URL="https://${DOMAIN}"
JWT_SECRET="${JWT_SECRET}"
JWT_EXPIRES_IN="7d"
CORS_ORIGIN="https://${DOMAIN},https://www.${DOMAIN}"
SITE_URL="https://${DOMAIN}"
TRUST_PROXY=true
ADMIN_EMAIL="admin@${DOMAIN}"
ADMIN_PASSWORD="${ADMIN_PASS}"
UPLOAD_DRIVER=local
UPLOAD_DIR="/var/www/mydryfruits/uploads"
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
NEXT_PUBLIC_API_URL="https://${DOMAIN}"
NEXT_PUBLIC_SITE_URL="https://${DOMAIN}"
NEXT_PUBLIC_SITE_NAME="MyDryFruits"
NEXT_PUBLIC_PAYMENTS_ENABLED=false
INTERNAL_API_URL="http://127.0.0.1:4000"
EOF

ln -sf "$ROOT/.env" "$ROOT/packages/db/.env"
ln -sf "$ROOT/.env" "$ROOT/apps/web/.env.production"

echo ""
echo "Wrote $ROOT/.env"
echo "Admin login email: admin@${DOMAIN}"
echo "Admin login password: ${ADMIN_PASS}"
echo "Write the admin password on paper. Email is NOT required — it is only a username."
echo ""
