# Wheat Harvester — API (NestJS)

NestJS + Mongoose REST API. All routes are prefixed with `/api/v1` and require a
Bearer JWT except `POST /auth/login`.

## Run

```bash
# from the repo root
npm install
npm run shared:build      # build @wh/shared once (or `npm run shared:watch`)

# configure the database
#   edit apps/api/.env and set MONGODB_URI (Atlas) + bootstrap admin creds
npm run api:dev           # starts on http://localhost:3000/api/v1
```

On first start, if no admin exists, a `SUPER_ADMIN` is seeded from
`BOOTSTRAP_ADMIN_EMAIL` / `BOOTSTRAP_ADMIN_PASSWORD`. Log in with those.

## Auth

| Method | Endpoint        | Body                      | Notes                    |
| ------ | --------------- | ------------------------- | ------------------------ |
| POST   | `/auth/login`   | `{ email, password }`     | Public. Returns `{ accessToken, admin }` |
| GET    | `/auth/me`      | —                         | Current admin profile    |

Send the token as `Authorization: Bearer <accessToken>` on every other call.

## Admins (SUPER_ADMIN only)

| Method | Endpoint                | Body |
| ------ | ----------------------- | ---- |
| POST   | `/admins`               | `{ name, email, password, phone?, role? }` |
| GET    | `/admins`               | — |
| GET    | `/admins/:id`           | — |
| PATCH  | `/admins/:id`           | `{ name?, email?, phone?, role?, isActive? }` |
| PATCH  | `/admins/:id/password`  | `{ newPassword }` |

## Harvesters

| Method | Endpoint                     | Body / Query |
| ------ | ---------------------------- | ------------ |
| POST   | `/harvesters`                | `{ name, registrationNo?, model?, status?, notes? }` |
| GET    | `/harvesters`                | `?status=ACTIVE\|INACTIVE` |
| GET    | `/harvesters/:id`            | — |
| PATCH  | `/harvesters/:id`            | partial body |
| PATCH  | `/harvesters/:id/activate`   | — |
| PATCH  | `/harvesters/:id/deactivate` | — |

## Customers

| Method | Endpoint           | Body / Query |
| ------ | ------------------ | ------------ |
| POST   | `/customers`       | `{ name, phone, village?, address?, deviceContactId? }` |
| GET    | `/customers`       | `?page&limit&search` → paginated |
| GET    | `/customers/:id`   | — |
| PATCH  | `/customers/:id`   | partial body |
| GET    | `/customers/:id/ledger` | Customer ledger (bill, paid, outstanding, plots, payments) |

## Settings

| Method | Endpoint    | Body |
| ------ | ----------- | ---- |
| GET    | `/settings` | — (auto-creates defaults: rate 900, INR, BIGHA) |
| PATCH  | `/settings` | `{ defaultRatePerBigha?, currency?, defaultAreaUnit? }` |

## Expenses

| Method | Endpoint        | Body / Query |
| ------ | --------------- | ------------ |
| POST   | `/expenses`     | `{ harvesterId, type, amount, date?, notes?, attachmentUrl? }` |
| GET    | `/expenses`     | `?harvesterId&type&from&to` |
| GET    | `/expenses/:id` | — |
| PATCH  | `/expenses/:id` | partial body |
| DELETE | `/expenses/:id` | — |

## Labour

| Method | Endpoint      | Body / Query |
| ------ | ------------- | ------------ |
| POST   | `/labour`     | `{ name, mobile, type, harvesterId, dailyWage?, customAmount?, paymentStatus? }` |
| GET    | `/labour`     | `?harvesterId` |
| GET    | `/labour/:id` | — |
| PATCH  | `/labour/:id` | partial body |
| DELETE | `/labour/:id` | — |

## Plots (harvesting jobs)

`harvestingAmount` and `totalAmount` are computed server-side.
`ratePerBigha` defaults to the configured rate when omitted.
Bhusa buyer/amount is only valid for `WITHOUT_BHUSA`.

| Method | Endpoint     | Body / Query |
| ------ | ------------ | ------------ |
| POST   | `/plots`     | `{ customerId, harvesterId, plotName, area, harvestDate, harvestType, areaUnit?, village?, remarks?, ratePerBigha?, bhusaBuyerId?, bhusaAmount? }` |
| GET    | `/plots`     | `?harvesterId&customerId` |
| GET    | `/plots/:id` | — |
| PATCH  | `/plots/:id` | partial body (amounts recomputed) |
| DELETE | `/plots/:id` | — |

## Payments

`partyType` ∈ `CUSTOMER | BHUSA_BUYER | LABOUR`; `partyId` points at that party.

| Method | Endpoint        | Body / Query |
| ------ | --------------- | ------------ |
| POST   | `/payments`     | `{ partyType, partyId, amount, date?, plotId?, harvesterId?, notes? }` |
| GET    | `/payments`     | `?partyType&partyId&harvesterId` |
| GET    | `/payments/:id` | — |
| PATCH  | `/payments/:id` | partial body |
| DELETE | `/payments/:id` | — |

## Dashboard

| Method | Endpoint              | Query |
| ------ | --------------------- | ----- |
| GET    | `/dashboard/summary`  | `?harvesterId=<id>\|ALL` (omit = ALL) |

Returns financial / harvesting / expense-by-type / labour summary.

## Notes on accounting choices (MVP)

- **Total earnings** = sum of plot `totalAmount` (harvesting charge + Bhusa sales).
- **Total expenses** = sum of recorded `Expense.amount` across all categories.
- **Net profit** = earnings − expenses.
- **Pending receivables** = earnings − payments received from customers/bhusa buyers.
- **Customer ledger bill** = sum of `harvestingAmount` of that customer's plots
  (Bhusa is billed to the buyer separately, so it is not on the landowner's ledger).
- **Labour cost** is reported separately in the labour summary (`customAmount` overrides
  `dailyWage`); revisit if labour wages should also post into `Expense` to avoid/contain
  double counting.
