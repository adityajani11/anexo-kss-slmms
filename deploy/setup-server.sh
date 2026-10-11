#!/usr/bin/env bash
# One-time bootstrap for a fresh Ubuntu 22.04/24.04 EC2 instance.
# Run as: ssh ubuntu@<server-ip> then `sudo bash setup-server.sh`
set -euo pipefail

echo "==> Updating packages"
apt-get update -y && apt-get upgrade -y

echo "==> Installing Node.js 20.x"
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

echo "==> Installing nginx, git, ufw, certbot"
apt-get install -y nginx git ufw certbot python3-certbot-nginx

echo "==> Installing MongoDB 7.0"
# MongoDB's apt repo lags behind new Ubuntu releases, so pin to jammy (22.04)
# regardless of the actual host codename -- the packages are ABI-compatible.
curl -fsSL https://pgp.mongodb.com/server-7.0.asc | gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" \
  > /etc/apt/sources.list.d/mongodb-org-7.0.list
apt-get update -y
apt-get install -y mongodb-org
systemctl enable --now mongod

echo "==> Installing PM2"
npm install -g pm2

echo "==> Creating deploy user"
if ! id -u deploy >/dev/null 2>&1; then
  adduser --disabled-password --gecos "" deploy
  usermod -aG sudo deploy
  mkdir -p /home/deploy/.ssh
  touch /home/deploy/.ssh/authorized_keys
  chown -R deploy:deploy /home/deploy/.ssh
  chmod 700 /home/deploy/.ssh
  chmod 600 /home/deploy/.ssh/authorized_keys
fi

echo "==> Configuring firewall"
ufw allow OpenSSH
ufw allow "Nginx Full"
ufw --force enable

echo "==> Creating app directory"
mkdir -p /var/www
chown deploy:deploy /var/www

cat <<'EOF'

Done. Next steps (as the 'deploy' user):
  1. Add your GitHub Actions public deploy key to /home/deploy/.ssh/authorized_keys
  2. su - deploy
  3. git clone https://github.com/adityajani11/slmms-v2.git /var/www/slmms-v2
  4. Create /var/www/slmms-v2/server/.env with production secrets (never via git)
  5. cd /var/www/slmms-v2/server && npm ci --omit=dev
  6. cd /var/www/slmms-v2/client && npm ci && npm run build
  7. cd /var/www/slmms-v2 && pm2 start ecosystem.config.js --env production
  8. pm2 startup systemd -u deploy --hp /home/deploy   (then run the printed sudo command)
  9. pm2 save
  10. sudo cp deploy/nginx.conf /etc/nginx/sites-available/slmms-v2
  11. sudo ln -s /etc/nginx/sites-available/slmms-v2 /etc/nginx/sites-enabled/
  12. sudo rm -f /etc/nginx/sites-enabled/default
  13. sudo nginx -t && sudo systemctl reload nginx
  14. sudo certbot --nginx -d krishnaschoolgroupksd.in -d www.krishnaschoolgroupksd.in
EOF
