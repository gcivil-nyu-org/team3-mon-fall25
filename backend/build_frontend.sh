#!/bin/bash
set -e

ENV=${1:-prod}

echo "Building React frontend..."

cd ../frontend
npm install

if [ "$ENV" = "dev" ]; then
  echo "Building frontend for DEV (mode=dev-aws)..."
  npm run build:dev
else
  echo "Building frontend for PROD (mode=production)..."
  npm run build:prod
fi

echo "Frontend build complete."