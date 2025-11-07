#!/usr/bin/env bash
# ---------------------------------------------------------------------------------
# TEMPORARILY DISABLED:
# This hook is disabled because collectstatic is already run in container_commands
# (see .ebextensions/django.config).
# 
# Running collectstatic twice can cause issues, so we've commented this out.
# If you need to re-enable this hook in the future, uncomment the lines below.
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
# set -euo pipefail

# cd /var/app/current

# echo "[postdeploy] Running collectstatic"
# echo "[postdeploy] Using DJANGO_SETTINGS_MODULE: ${DJANGO_SETTINGS_MODULE:-not set}"

# /var/app/venv/*/bin/python manage.py collectstatic --noinput
# echo "[postdeploy] collectstatic done."

echo "[postdeploy] 50_collectstatic.sh is currently disabled (collectstatic runs in container_commands)"