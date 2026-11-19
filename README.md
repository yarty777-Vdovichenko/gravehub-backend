# GraveHub Backend

REST API for GraveHub, a marketplace for funeral and cemetery services. Customers publish contracts (service requests), employees (service providers) respond with proposals, the customer picks one, and after the work is done the customer confirms it and leaves a review that feeds the provider's rating.

University coursework project. This repository contains the backend only; the React frontend is developed separately by a teammate.

## Tech Stack

- NestJS, TypeScript
- PostgreSQL with Prisma ORM (Prisma 6, migrations and seed)
- JWT authentication: short-lived access token plus rotating refresh token in an httpOnly cookie
- Swagger (OpenAPI) documentation
- Docker Compose for the local database

## Features

- Registration and login with two roles, `customer` and `employee`. One account can hold both roles and switch between them (`activeMode`), and the active mode is stored on the backend.
- Refresh token rotation: every refresh issues a new pair and invalidates the old one. One active session per user.
- Role-based access: customer endpoints and employee endpoints are separated by the active mode and return 403 otherwise.
- Public reference data: hierarchical service categories and selectable subservices, plus regions, seeded with fixed UUIDs (idempotent seed).
- Customer contracts: create, list own, view one, delete (only while `open` and without an assigned employee).
- Employee feed: search and filter open contracts in the employee's regions, plus contract details.
- Employee search: search and filter providers by name, region, service and rating.
- Employee profiles: edit the description, services and regions, and upload photo/video work samples to Cloudinary.
- Proposals: an employee submits one proposal per contract, can cancel it while it is `pending`, and customers list proposals for their contract with the employee's rating, review count and completed contracts.
- Accepting a proposal is a single operation: the contract moves to `in_progress` with the executor assigned, the chosen proposal becomes `accepted`, all other pending proposals become `rejected`.
- Contract lifecycle: `open` -> `in_progress` -> `awaiting_confirmation` -> `completed`, with the option for the customer to send the work back (`awaiting_confirmation` -> `in_progress`). Invalid transitions return 409.
- Reviews and rating: confirming a contract creates a review (rating 1-5, text up to 1000 characters) in the same step. Employee rating, reviews count and completed contracts are derived from reviews. Reviews of an employee are available with pagination.
- Unified error format `{ statusCode, message, error }`, strict DTO validation (unknown fields are rejected with 400), UUID validation in paths.

## Contract Statuses

| Status | Meaning |
| --- | --- |
| `open` | Created, accepting proposals |
| `in_progress` | Executor assigned |
| `awaiting_confirmation` | Executor marked the work as done |
| `completed` | Confirmed by the customer, review created |
| `cancelled` | Cancelled |

## API Overview

Full request and response schemas are available in Swagger at `http://localhost:3000/docs` after the server starts.

| Area | Endpoints |
| --- | --- |
| Auth | `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/roles/customer`, `/auth/roles/employee`, `/auth/switch-mode` |
| Reference data | `GET /services` (categories with selectable subservices), `GET /regions` |
| Customer contracts | `POST /contracts/estimate`, `POST /contracts`, `GET /contracts/my` (search and filters), `GET /contracts/:id`, `DELETE /contracts/:id` |
| Customer proposals | `GET /contracts/:id/proposals`, `POST /contracts/:contractId/proposals/:id/accept`, `POST /contracts/:contractId/proposals/:id/reject` |
| Customer completion | `POST /customer/contracts/:id/confirm`, `POST /customer/contracts/:id/reject-completion` |
| Employee contracts | `GET /employee/contracts` (search and filters), `GET /employee/contracts/:id`, `GET /employee/my-contracts`, `POST /employee/my-contracts/:id/complete` |
| Employee proposals | `POST /employee/contracts/:contractId/proposals`, `GET /employee/proposals`, `DELETE /employee/proposals/:id` |
| Employees and reviews | `GET /employees` (search and filters), `GET /employees/:id`, `GET /employees/:id/reviews` |
| Employee profile | `GET /employees/profile/me`, `PATCH /employees/profile/me`, `POST /employees/profile/me/media`, `DELETE /employees/profile/me/media/:mediaId` |
| Conversations | `POST /conversations`, `GET /conversations`, `GET /conversations/:id/messages` |
| Notifications | `GET /notifications`, `GET /notifications/unread-count`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all` |

List endpoints use `page` and `limit` query parameters (limit 1-50, default 10) and respond with `{ items, total, page, limit, totalPages }`.

## Authentication Notes

- The access token lives 15 minutes and is sent as `Authorization: Bearer <token>`. The client should keep it in memory, not in localStorage.
- The refresh token is an httpOnly cookie sent only to `/auth/*` paths. Requests from the browser must include credentials (`withCredentials: true` for axios, `credentials: 'include'` for fetch).
- On a 401 the client calls `POST /auth/refresh` once and retries the original request. On app start the client calls refresh to restore the session.
- CORS allows only the origin from `FRONTEND_URL` (default `http://localhost:5173`).

## Getting Started

Requirements: Node.js and Docker Desktop.

```bash
cp .env.example .env
docker compose up -d
npm install
npx prisma migrate deploy
npx prisma db seed
npm run start:dev
```

The API is available at `http://localhost:3000`, Swagger at `http://localhost:3000/docs`. The seed fills services and regions and is safe to run repeatedly. After each `git pull`, run `npm install` and `npx prisma migrate deploy` again.

## Tests

Run unit tests from the project root:

```bash
npm test
```

Jest runs `*.spec.ts` files under `src/`. Tests use Prisma mocks and do not require a running database.

```bash
npm run test:watch
npm run test:cov
npm test -- --runInBand plots/credit.spec.ts
```

## Cloudinary Setup

1. Create a Cloudinary account at [cloudinary.com](https://cloudinary.com/).
2. In the Cloudinary Console, copy the cloud name, API key and API secret.
3. Add them to your local `.env` file:

   ```dotenv
   CLOUDINARY_CLOUD_NAME="your-cloud-name"
   CLOUDINARY_API_KEY="your-api-key"
   CLOUDINARY_API_SECRET="your-api-secret"
   ```

4. Restart the backend. Keep the API secret private and never commit `.env`.

Authenticated employees can upload JPEG, PNG, WebP, MP4, WebM, and MOV files (up to 50 MB each) as multipart form data using the `file` field; `caption` is optional. Public employee profiles include the uploaded work samples.

`GET /services` returns categories with their selectable subservices. Employee profiles and contracts store subservice IDs only; category IDs cannot be selected. Each subservice carries its own price.

The profile update accepts any combination of `description`, `specializationIds` and `regionIds`. `specializationIds` must contain subservice IDs. Supplying a service or region array replaces the whole list; use an empty array to remove all entries from that list. Omitted fields remain unchanged.

To estimate a contract budget, send `POST /contracts/estimate` with `{ "serviceTypeIds": ["<service-uuid>", "..."] }`. The response contains each selected service's price and their total in `estimatedPrice`; the amount is an estimate based on the current service prices.

## Chat and Real-Time Events

Connect to the Socket.IO server with the access token in the handshake auth object:

```js
io('http://localhost:3000', { auth: { token: accessToken } });
```

The client sends `message:send` with `{ "conversationId": "<uuid>", "text": "Hello" }`. Its acknowledgement is `{ "ok": true, "message": { ... } }` or `{ "ok": false, "error": "..." }`. Participants receive `message:new` with `{ id, conversationId, senderId, text, createdAt, sender: { id, name } }`.

The server sends `notification:new` with `{ id, userId, type, payload, readAt, createdAt }`. Types are `proposal_received`, `proposal_accepted`, `proposal_rejected` and `contract_status_changed`; payloads contain the relevant contract/proposal IDs, contract title and, for status changes, `from`/`to`.

To test messaging, create a conversation first and run `node scripts/ws-test.mjs <sender-access-token> <recipient-access-token> <conversation-id>`. Both tokens must belong to participants in that conversation. The script prints the message received by the second user.

## Project Structure

```
prisma/    schema, migrations, seed
src/       NestJS modules
```

## Roadmap

- Burial plot purchase with an interactive cemetery map and protection against simultaneous reservation
- Mock payment
- Real-time chat over WebSocket
- Email verification and password reset
- Admin panel

## Related

Frontend: developed in a separate repository by a teammate.
