#!/bin/bash
echo "Building React frontend..."

cd ../frontend
npm install
npm run build

echo "Frontend build complete."