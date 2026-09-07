# Wordle en Español

A private, single-player Spanish Wordle. One shared password gates the whole
site; a deterministic algorithm picks the word of the day; every day ever served
is frozen in DynamoDB so you can go back and replay any of them.

Built as a learning project — see [how it works](#how-it-works).

```
frontend/   React + Vite + TypeScript  (static, served from S3 via CloudFront)
backend/    One Node 20 Lambda behind a Function URL  (/api/*)
infra/      Terraform: S3 + CloudFront + Lambda + DynamoDB + IAM
scripts/    build-wordlist.mjs, deploy.sh
```

## How it works

### Daily word

`backend/src/puzzle.ts`. A fixed epoch (`2026-01-01` = day 0). For any date,
`dayNumber = whole days since epoch`. At startup we build **one deterministic
permutation** of the ~1000 solution indices from a hardcoded seed
(`xmur3` -> `mulberry32` -> Fisher-Yates, in `permutation.ts`). The word is
`permutation[dayNumber mod N]`.

Because we walk a permutation *in order*:

- no word repeats for a full cycle (~2.7 years at 1000 words), and
- consecutive days are always different — the "not the same as yesterday"
  rule falls out for free.

The word flips at midnight in `WORDLE_TZ` (default `America/New_York`).

### History & replay

`GET /api/puzzle?date=YYYY-MM-DD` does get-or-create against DynamoDB:

1. If that date is already stored, return the stored word — it stays correct
   even if the word list or seed is later changed.
2. Otherwise compute it, `PutItem` with `attribute_not_exists(date)`, return it.

Future dates are rejected. The frontend's **Archivo** panel lists past dates;
picking one replays that day. Per-day progress (your guesses) lives in
`localStorage`, keyed by date — it survives refreshes and is only wiped by the
**Reiniciar / Jugar de nuevo** button (`sessionStore.clear`).

### Auth

`POST /api/auth {password}` compares (constant-time) against the SSM parameter
`/wordle/password` and returns a 30-day HMAC-SHA256 token signed with
`/wordle/token-secret`. Every other route needs `Authorization: Bearer <token>`.
The word list ships only inside the Lambda bundle, never in the frontend assets.

### Hosting & cost

One CloudFront distribution fronts both origins, so the app and API are
same-origin (no CORS):

- `/*` -> private S3 bucket (CloudFront OAC)
- `/api/*` -> Lambda Function URL (IAM auth + CloudFront OAC, so the URL is not
  publicly callable)

DynamoDB is on-demand; SSM uses standard (free) parameters; CloudWatch logs
retain 14 days. At personal volume this sits inside the AWS free tier —
realistically **$0/month**, well under $1 worst case.

## Local development

```bash
# terminal 1 - fake backend (in-memory store, env-var password)
cd backend && npm install
WORDLE_PASSWORD=hunter2 npm run dev        # http://localhost:8787

# terminal 2 - frontend (proxies /api to :8787)
cd frontend && npm install && npm run dev  # http://localhost:5173
```

Default local password is `letmein` if `WORDLE_PASSWORD` is unset.

### Tests

```bash
cd backend  && npm test   # permutation determinism, no-repeat cycle, handler, auth, dates
cd frontend && npm test   # evaluate() duplicate-letter cases, normalize(), game reducer
```

## Deploy

One-time setup:

```bash
# 1. AWS credentials
aws sts get-caller-identity

# 2. secrets (plaintext never touches Terraform state)
aws ssm put-parameter --name /wordle/password \
  --type SecureString --value 'choose-a-password'
aws ssm put-parameter --name /wordle/token-secret \
  --type SecureString --value "$(openssl rand -hex 32)"

# 3. terraform
cd infra && cp terraform.tfvars.example terraform.tfvars && terraform init
```

Then, for every deploy:

```bash
./scripts/deploy.sh
```

It builds the Lambda, runs `terraform apply`, builds the frontend, syncs it to
S3, and invalidates CloudFront. The CloudFront URL is printed at the end (and is
`terraform output site_url`).

### Regenerating the word list

```bash
node scripts/build-wordlist.mjs --solutions 1000
```

Rewrites `backend/src/words.json` (solutions) and
`backend/src/valid-guesses.json` from public sources. Changing the solution set
or `permutation_seed` reshuffles **future** days; days already in DynamoDB are
unaffected.

## Verify a deployment

```bash
SITE=$(cd infra && terraform output -raw site_url)

curl -s -o /dev/null -w '%{http_code}\n' "$SITE/api/puzzle"          # 401
TOKEN=$(curl -s -XPOST "$SITE/api/auth" -d '{"password":"..."}' | jq -r .token)
curl -s -H "authorization: Bearer $TOKEN" "$SITE/api/puzzle"          # today
curl -s -H "authorization: Bearer $TOKEN" "$SITE/api/puzzle?date=2999-01-01"  # 403

aws dynamodb get-item --table-name wordle-es-puzzles \
  --key '{"date":{"S":"2026-09-07"}}'
```
