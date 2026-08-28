#!/usr/bin/env bash
# Copies static assets into the standalone build output so
# `node .next/standalone/server.js` can serve them correctly.
set -e
cp -r public .next/standalone/public
rm -rf .next/standalone/.next/static
mkdir -p .next/standalone/.next
cp -r .next/static .next/standalone/.next/static
echo "Standalone build prepared."
