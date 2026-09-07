# Stock Tracker

A full-stack application for tracking stocks, managing a simulated portfolio and
communicating with other users. Developed by Mehmet Eray Ozdemir during the
July 2025 Figensoft internship.

**Technologies:** React, Express, MongoDB/Mongoose, Socket.IO, RabbitMQ,
JWT, Docker Compose and Nginx.

## Key capabilities

- Account registration, password-based login and optional Google sign-in.
- Stock search, favorites, historical prices and price alert management.
- Simulated portfolio, buy/sell records and limit-order processing.
- User discovery, following, direct messaging and online/typing indicators.
- Market charts, exchange rates and supporting dashboard widgets.
- Background workers and Docker Compose service definitions.

## Public release configuration

**SMS delivery, SMS verification and Google reCAPTCHA are disabled in this release.**
Registration proceeds without an OTP, and login does not require a CAPTCHA.
Password checks and JWT authentication remain in place. Google OAuth sign-in is
a separate optional integration and is retained.

SMS alerts are not delivered. Restoring SMS and CAPTCHA requires implementing the
verification flows again; setting credentials alone does not re-enable them.
Personal test data and embedded provider credentials have been removed.

## Architecture

```text
frontend/           React interface and Nginx configuration
backend/routes/     HTTP endpoints
backend/models/     MongoDB models
backend/utils/      Queue helpers and disabled SMS adapter
backend/*Worker.js  Background workers
docker-compose.yml  Local service definitions
```

MongoDB stores users, messages, alerts and simulated transactions. Socket.IO
handles real-time events; RabbitMQ supports the background messaging workflow.
Trading features record simulated operations rather than executing brokerage orders.

## Setup

Copy `.env.example` to `.env` in both `backend/` and `frontend/`. Configure
MongoDB, RabbitMQ, a random JWT secret and the market-data integrations you need
(Twelve Data and Finnhub). Google sign-in requires its own client configuration.
SMS and reCAPTCHA credentials are not required.

With MongoDB and RabbitMQ running, use local service addresses in `backend/.env`:

```sh
# From backend/
npm install
npm start

# In another terminal, from frontend/
npm install
npm start
```

The web interface runs at localhost:3000 and the API at localhost:5001. Run
`node limitWorker.js` from `backend/` for limit-order processing. The retained
SMS worker cannot send messages in this release.

Alternatively, with Docker installed, run from the repository root:

```sh
docker compose --env-file frontend/.env up --build
```

The Compose example uses container hostnames for MongoDB and RabbitMQ. React
configuration is passed at build time. The Dockerfiles retain the original Node 18
base; runtime updates should be evaluated before deployment.

## Validation and limitations

The application previously ran in its original development environment. In this
release, syntax checks passed for 26 backend and 27 frontend JavaScript files;
SMS/CAPTCHA removal was checked in the source. Full build, Docker startup and
external-service workflows have not been rerun in the current environment.

- Some market-data calls originate in the browser. `REACT_APP_` values are public
  in the bundle; restricted provider access belongs behind backend endpoints.
- Socket events trust client-supplied user IDs and need authentication hardening.
- Portfolio and balance updates are prototype bookkeeping, not a transactional
  financial platform.
- Provider availability, credentials and rate limits affect dependent features.

## Author

Mehmet Eray Ozdemir. Published as an internship portfolio project.
No new project-wide license is assigned; existing dependency licenses apply.
