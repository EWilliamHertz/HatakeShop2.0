#!/bin/bash
set -a
source .env
set +a
npx tsx scripts/migrate_images.ts
