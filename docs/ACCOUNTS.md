# Django accounts

## Local development database

Development uses SQLite, configured in `server/config/settings.py`. The database
is `server/db.sqlite3`; no separate database service or credentials are needed.
Accounts, hometown profiles, social identities, and refresh-token records persist
in this file across server restarts. Existing local data is preserved by migrations.

Run `python manage.py migrate` from `server` after pulling schema changes.
Run `python manage.py showmigrations` to inspect applied migrations.
Tests use a separate temporary database and do not clear your development data.
To back up local data, stop Django and copy `server/db.sqlite3` to a safe location.

Start the API from `server`:

```sh
python -m venv .venv
.venv\Scripts\activate
python -m pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

Start the app from `PTP-app` with `npm run web` (or `npm start` for mobile).
Sign up with a display name (username or nickname), hometown/area, email, and password. Registration signs you in automatically.
The account page allows display name and hometown updates and sign-out. Django stores hashed passwords;
the app stores tokens in SecureStore on mobile and sessionStorage on web.
Sign-out revokes the refresh token; existing access tokens expire after five minutes.

The API defaults to http://localhost:8000. For a physical phone, copy
`PTP-app/.env.example` to `.env.local`, set `EXPO_PUBLIC_API_URL` to your computer's
LAN address, add that host to Django `ALLOWED_HOSTS`, and run Django with
`python manage.py runserver 0.0.0.0:8000`. Restart Expo after changing environment values.
For deployment, configure HTTPS, a private Django secret, production hosts/origins,
and disable DEBUG. Email verification and password recovery are not included.

Endpoints under `/api/auth/`: `register/`, `sign-in/`, `refresh/`, `sign-out/`,
and `me/` (authenticated GET/PATCH). Accounts also appear in Django admin.

Checks: `python manage.py test api`, `npx tsc --noEmit`, and `npm run lint`.

## Google and Apple sign-in

Both sign-in and registration offer Google and Apple. Email registration asks for
hometown/area. Social accounts (and existing accounts without a hometown) complete
display name and hometown on the account screen before accessing Explore. The location is
editable, stored on the server, and does not request device GPS access.

Install updated server requirements and run `python manage.py migrate`.
Set these environment variables on the **Django server**, then restart it:

- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
- `APPLE_CLIENT_ID`, `APPLE_CLIENT_SECRET`, `APPLE_REDIRECT_URI`

Google uses a Web application OAuth client. Register its exact callback URL:
`https://YOUR_API_HOST/api/auth/social/google/callback/`.
Apple uses a Services ID configured for Sign in with Apple, a verified domain,
and return URL `https://YOUR_API_HOST/api/auth/social/apple/callback/`.
`APPLE_CLIENT_SECRET` must be the signed developer client-secret JWT; rotate it
before its expiration. Apple requires an HTTPS return URL, including for testing.
No provider secrets belong in Expo environment variables or client code.

The browser opens the provider consent page. After consent, close the browser and
return to PTP. The app retrieves the result using a separate random secret that
never enters the provider URL. Requests expire after five minutes and results
can be consumed once. ID tokens are checked for signature, issuer, audience,
expiration, and nonce. Existing accounts are not automatically linked by email;
use the original sign-in method if an email is already registered. Apple private
relay addresses are supported. Unconfigured providers display an explanatory error.

Live provider consent requires your own credentials and provider-console setup;
backend tests mock provider responses and do not certify a live OAuth integration.
Periodically remove expired `SocialAttempt` rows as database housekeeping.

References: [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect),
[Apple token validation](https://developer.apple.com/documentation/signinwithapplerestapi/generate-and-validate-tokens).

Display names do not need to be real or unique; sign-in still uses email. The API
keeps the `name` field for compatibility. New social accounts choose their own
display name during setup instead of importing a provider name.
