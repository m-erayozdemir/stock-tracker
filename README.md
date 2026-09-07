# Stock Tracker

A full-stack stock tracking prototype developed by Mehmet Eray Ozdemir during
the July 2025 Figensoft internship. React provides the interface; Express,
MongoDB, Socket.IO and RabbitMQ support the application and background workers.

## Features represented in the source

- Registration, JWT authentication and optional Google sign-in; SMS and reCAPTCHA disabled.
- Stock lookup, favorites, historical prices and price alerts.
- Portfolio and simulated trade/limit-order bookkeeping in MongoDB.
- User discovery, following, direct messages and online/typing events.
- Charts, exchange rates, precious-metal quotes and weather widgets.
- Separate SMS and limit-order workers, with Docker Compose service definitions.

This is a portfolio source release. A live end-to-end run has not been verified
in this preparation; API credentials, MongoDB, RabbitMQ and identity/SMS services
are required for the corresponding features. No real brokerage execution is
implemented or claimed.

## Structure

```text
frontend/           React interface and Nginx configuration
backend/routes/     HTTP endpoints
backend/models/     MongoDB models
backend/utils/      SMS and RabbitMQ helpers
backend/*Worker.js  Background workers
docker-compose.yml  Local service definitions
```

## Configuration

Copy each `.env.example` to `.env` in its own directory. Configure MongoDB,
RabbitMQ and a random JWT secret. External integrations include Twelve Data,
Finnhub, Google OAuth, reCAPTCHA and Posta Güvercini SMS. Provider access and
current API behavior have not been checked as part of this preparation.

SMS and Google reCAPTCHA verification are disabled in this public release.
Registration proceeds without an OTP and login does not require a CAPTCHA.
SMS delivery (including alerts) is disabled; Google OAuth sign-in is a separate
optional integration and remains in the source. Re-enabling verification requires
restoring the relevant flows, not just setting an environment variable.

Some original components call market-data providers from the browser. Values
prefixed `REACT_APP_` are embedded in the frontend bundle and are not secrets.
Move restricted provider access behind backend endpoints before public hosting.

## Local source setup

With MongoDB and RabbitMQ running, use local service addresses in `backend/.env`.
In `backend/`, run `npm install` then `npm start`. In `frontend/`, run `npm install`
then `npm start`. Worker entry points are `node smsWorker.js` and
`node limitWorker.js` from the backend directory. The original Docker images use
Node 18; runtime modernization and full dependency/build verification are pending.

Alternatively, configure both environment files and run
`docker compose --env-file frontend/.env up --build` from the project root.
The frontend is at localhost:3000 and the API at localhost:5001. The React build
needs build-time variables; the Compose file supplies those separately from the
backend runtime environment. Docker startup has not been validated here.

## Known limitations

- Socket events trust client-supplied user IDs; authentication hardening is needed.
- Order/balance updates are prototype bookkeeping, not a verified transactional
  financial system.
- External services, background workers and rate limits affect functionality.
- No automated suite is present in this archive; `sendTest.js` is a manual SMS
  utility, not an isolated unit test. It requires an explicit `SMS_TEST_PHONE`.

## Portfolio preparation

Removed a hardcoded provider key and personal SMS test number from this copy,
replaced local-network CORS entries with configuration, standardized Twelve Data
environment names, and added example environment files and Docker exclusions.
Original project files are preserved separately. No new project license is assigned.

## Validation

Syntax checks passed for 26 backend and 27 frontend JavaScript files. A controlled
check confirmed that disabled SMS sending makes no provider request. Full frontend
build, Docker startup, database workflows and external integrations remain untested.
