#!/bin/bash
set -e

# Post-merge reconciliation for Nexxo.
#
# IMPORTANT: this project NEVER runs `drizzle-kit push` (db:push).
# - Production (VPS) schema changes are applied manually via scripts/vps-schema-changes.sql
# - Dev database schema changes are applied manually via executeSql
# `drizzle-kit push` is interactive (prompts to truncate tables) and can cause
# data loss, so it must not run in automated post-merge setup.

npm install
