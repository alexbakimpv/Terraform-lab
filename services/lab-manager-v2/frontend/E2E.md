# Lab Manager v2 UI E2E

This project uses Playwright for UI end-to-end tests.

## Setup

Install deps and Playwright browsers:

```
npm install
npm run test:e2e:install
```

## Environment variables

Required:

- `E2E_PASSWORD` - shared password/token (ex: `lab-manager-auth-token`)
- `E2E_ADMIN_EMAIL` - admin user email
- `E2E_STUDENT_EMAIL` - student user email

Optional:

- `E2E_BASE_URL` - UI base URL (default `http://localhost:5173`)
- `E2E_API_BASE_URL` - API base URL to preflight Zscaler (ex: `https://lab-manager-v2-api.lab.amplifys.us/api/v1`)
- `E2E_SKIP_WEB_SERVER=1` - disable auto `npm run dev`
- `E2E_BAD_PASSWORD` - override invalid password (default `bad-password`)
- `E2E_ALLOW_MUTATIONS=1` - allow tests that change state
- `E2E_ADMIN_INVITE_EMAIL` - admin invite target (used when mutations enabled)

## Run

Local dev server (auto):

```
npm run test:e2e
```

Against deployed UI:

```
E2E_BASE_URL="https://manager.lab.amplifys.us" \
E2E_SKIP_WEB_SERVER=1 \
E2E_ADMIN_EMAIL="alexb@imperva.com" \
E2E_STUDENT_EMAIL="alexbak@gmail.com" \
E2E_PASSWORD="lab-manager-auth-token" \
npm run test:e2e

## macOS notes

- `npx` is used in scripts to ensure Playwright is resolved from `node_modules/.bin`.
- `--with-deps` is not required on macOS.
```
