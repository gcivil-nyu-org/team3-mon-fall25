#!/usr/bin/env bash
# ---------------------------------------------------------------------------------
# IMPORTANT FOR DEPLOY:
# This script MUST be executable (chmod +x).
# If it's not executable, Elastic Beanstalk will SKIP it and deploy will break
# because static files won't be collected.
#
# To fix (run locally before git commit/push):
#   chmod +x .platform/hooks/postdeploy/50_collectstatic.sh
#
# After changing permissions, commit the mode change:
#   git add .platform/hooks/postdeploy/50_collectstatic.sh
#   git commit -m "fix: make collectstatic hook executable"
#
# ---------------------------------------------------------------------------------
set -euo pipefail

cd /var/app/current

export DJANGO_SETTINGS_MODULE=core.settings

echo "[postdeploy] Running collectstatic"

/var/app/venv/*/bin/python manage.py collectstatic --noinput
echo "[postdeploy] collectstatic done."