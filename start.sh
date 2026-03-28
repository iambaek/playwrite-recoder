#!/bin/sh
npx playwright install chromium
npm install
npm run build
npm start
