# What changed

## New npm package needed
Run this before deploying:
```
npm install helmet
```
(`express-rate-limit`, `jsonwebtoken`, `bcryptjs`, `mysql2`, `cors`, `multer`, `cloudinary`, `axios`, `fuse.js`, `nodemailer` were already in use, so they should already be in your package.json.)

## New / changed environment variables
- `FRONTEND_URL` — **set this on Render.** Comma-separated list of the exact origins allowed to call your API, e.g.
  `FRONTEND_URL=https://your-app.netlify.app`
  If you leave it unset, CORS stays open to every origin (fine for testing, not for production).
- `NODE_ENV=production` — set this on Render. It disables the `/test-cloudinary` and `/test-upload` debug routes and hides error stack traces from API responses.
- `USER_JWT_SECRET` — **required now.** A long random string used to sign customer session tokens (separate from `ADMIN_JWT_SECRET`). See the "Real user authentication" section below.
- Everything else (`DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_HOST`, `EMAIL_PORT`, `ADMIN_EMAIL`, `ADMIN_JWT_SECRET`, `BREVO_API_KEY`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`) is unchanged — just make sure they're all set on Render, since a couple of routes now fail loudly (instead of crashing) if `ADMIN_JWT_SECRET` or `ADMIN_EMAIL` is missing.

## Bugs fixed
1. **`cart.js` checkout** — `db.getConnection()` was called outside the try/catch. If it ever failed, the request would crash instead of returning a clean error, and the catch block would then try to call `.rollback()` on `undefined`. Also added validation for `items`, `contact`, and `total_price` so a malformed request can't reach the DB layer at all.
2. **`cart.js` add-to-cart** — an invalid `category` silently fell back to `"vegetables"` instead of being rejected.
3. **No global error handler** — multer errors (bad file type, oversized upload) and any other thrown error had nowhere to go, so Express's default handler returned a raw HTML page with a stack trace. Added one central JSON error handler in `server.js`.
4. **No 404 handler** for unmatched routes.

## Security hardening
1. **CORS was open to any origin** — now restricted via `FRONTEND_URL`.
2. **`/test-cloudinary` and `/test-upload` were public and unauthenticated** — anyone could push arbitrary files into your Cloudinary account through them. Now dev-only.
3. **No rate limiting on admin `/login` or `/verify-otp`** — brute-forceable. Added limiters matching the ones already used for user OTP.
4. **OTP stores (`otpStore`, `pendingAdminOtps`) grew forever** — added periodic cleanup of expired entries.
5. **OTPs generated with `Math.random()`** — switched to `crypto.randomInt` (cryptographically strong).
6. **No `trust proxy` setting** — on Render, behind its reverse proxy, `express-rate-limit` was likely reading the proxy's IP for every request instead of the real client's, silently defeating every rate limit in the app.
7. **No request body size limit** — added a 2MB cap.
8. Added `helmet()` for standard security response headers.

## Known gap — not changed, needs your input
None of the data routes (`cart.js`, `orders.js`, `address.js`, `garland.js`, `courier.js`) actually verify who's calling them — they trust whatever `user_id` (a phone number) the client sends in the request body/URL. The OTP login in `auth.js` never issues a session token, so in principle anyone who knows (or guesses) another user's phone number can read or modify that user's cart, orders, and saved addresses.

Fixing this properly means:
- `auth.js` issues a JWT (or similar token) on successful OTP verification, containing the verified identity.
- A new `requireUser` middleware validates that token on every user-facing route.
- Your frontend attaches that token (e.g. `Authorization: Bearer ...`) on every request instead of just sending `user_id`.

I didn't make this change because it requires matching updates on the frontend that I don't have visibility into — happy to wire it up end-to-end if you share that code.

## Real user authentication — now implemented
This is the item flagged last time as "not changed, needs your input." It's now wired up end-to-end:

- `routes/auth.js` — `/verify-otp` now issues a signed JWT (`USER_JWT_SECRET`, 30-day expiry) alongside the success message, instead of just a bare `{ success: true }`.
- `middleware/requireUser.js` (new) — verifies that token on every request and attaches `req.userEmail`, the one and only source of truth for "who is making this request."
- `routes/cart.js`, `routes/orders.js`, `routes/address.js`, `routes/garland.js`, `routes/courier.js` — every route that touches a specific user's data now requires `requireUser` and uses `req.userEmail` instead of trusting `user_id` from the request body/URL.
- Along the way this also closed **two extra IDOR bugs** that existed independent of the identity-spoofing issue:
  - `cart.js` `/increase/:id`, `/decrease/:id`, `DELETE /:id` had **no ownership check at all** — anyone could modify or delete any other user's cart row just by guessing/incrementing its numeric id. Now scoped with `AND user_id = ?`.
  - `address.js` `PUT /:id/default` and `DELETE /:id` had the same problem for saved addresses. Now scoped the same way.

**New required env var:** `USER_JWT_SECRET` — set this on Render (a long random string, same idea as `ADMIN_JWT_SECRET` but must be a different value).

**Frontend changes** (see `frontend-patch.zip`, 3 files):
- `api.jsx` — added a global `axios.interceptors.request.use(...)` that attaches `Authorization: Bearer <token>` from `localStorage.getItem("userToken")` to every outgoing request. Because every page already imports from this file, no other component needs to change — the interceptor applies globally the moment the app loads.
- `Login.jsx` — stores the token returned by `/auth/verify-otp` as `localStorage["userToken"]`.
- `Header.jsx` — clears `userToken` on logout, alongside the existing keys.

Drop these three files back into your existing `src/` in place of the originals. No other frontend file needs to change — they keep sending `user_id` exactly as before, it's just no longer trusted; the backend now uses the verified token instead and simply ignores/overrides the client-supplied value.

One behavior change to expect: any user who was already "logged in" (has `isLoggedIn`/`phone` in localStorage from before this change) but has no `userToken` will get `401 Please log in first` on cart/orders/address/garland/courier calls until they log in again once. That's expected — it's the whole point.

## Scripts (diagnose-images.js, hash-existing-passwords.js, migrate-to-cloudinary.js, sync-cloudinary-images.js)
Left untouched — they're one-off maintenance scripts, not part of the running server. Just don't deploy/run them automatically on Render (no `npm start` or Procfile should reference them); run them manually and once, locally or via a one-off shell.

