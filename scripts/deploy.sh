#!/usr/bin/env bash
# Build everything and deploy to AWS.
#
# Prerequisites (one time):
#   - AWS credentials configured (aws sts get-caller-identity works)
#   - the two SSM SecureString parameters created (see infra/secrets.tf)
#   - cd infra && terraform init
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "==> backend: build Lambda bundle"
( cd backend && npm ci --silent && npm test --silent && npm run build )

echo "==> infra: terraform apply"
( cd infra && terraform apply -auto-approve )

BUCKET="$(cd infra && terraform output -raw s3_bucket)"
DIST_ID="$(cd infra && terraform output -raw cloudfront_distribution_id)"
SITE_URL="$(cd infra && terraform output -raw site_url)"

echo "==> frontend: build"
( cd frontend && npm ci --silent && npm run build )

echo "==> frontend: sync to s3://$BUCKET"
aws s3 sync frontend/dist "s3://$BUCKET" --delete

echo "==> cloudfront: invalidate"
aws cloudfront create-invalidation \
  --distribution-id "$DIST_ID" \
  --paths '/*' >/dev/null

echo
echo "Done. Play at: $SITE_URL"
