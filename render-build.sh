#!/usr/bin/env bash
set -e

echo "===> Installing npm dependencies"
npm install

echo "===> Installing Chromium for Puppeteer"
npx puppeteer browsers install chrome

echo "===> Build complete"
