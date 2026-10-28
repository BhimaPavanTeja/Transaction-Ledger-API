# Transaction Ledger API

A REST API for managing accounts and recording credit and debit transactions. It uses Express.js for HTTP routing and Supabase for PostgreSQL storage.

## Requirements

- Node.js 18 or later
- Express.js
- Supabase Database

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. In your Supabase project's SQL Editor, run the contents of [`database.sql`](./database.sql). This creates the accounts and transactions tables and the database function used to record transactions atomically.

3. Create a `.env` file in the project root:

   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SECRET_KEY=your-supabase-secret-key
   PORT=3000
   ```

   `PORT` is optional and defaults to `3000`. Use a Supabase key with permission to access the tables and execute the `create_ledger_transaction` function (granted to `service_role`). Keep this key private; do not commit `.env` or expose the key in client-side code.

4. Start the server:

   ```bash
   node server.js
   ```

   The API will be available at `http://localhost:3000` (or the configured port).

## API

All request and response bodies use JSON. The API accepts JSON request bodies up to 100 KB.

### `GET /`

Returns an API status message.

### `GET /health/db`

Checks that the API can query the Supabase database.

### `POST /accounts`

Creates an account.

Request:

```json
{
  "name": "Alex"
}
```

Returns the created account with its ID, name, starting balance, and creation time.

### `POST /transactions`

Records a credit or debit and updates the account balance through the database function.

Request:

```json
{
  "account_id": "00000000-0000-0000-0000-000000000000",
  "type": "credit",
  "amount": 1250,
  "description": "Initial deposit",
  "reference_id": "TXN-001"
}
```

`type` must be `credit` or `debit`; `amount` must be positive and have no more than two decimal places. A reference ID can be used only once per account. Debits that exceed the available balance are rejected.

Returns the created transaction and the updated balance.

### `GET /accounts/:id/balance`

Returns the balance for the account identified by `id` (a UUID).

### `GET /accounts/:id/transactions`

Returns a paginated transaction history for the account identified by `id` (a UUID).

Optional query parameters:

| Parameter | Default | Description |
| --- | --- | --- |
| `type` | — | Filter by `credit` or `debit` |
| `page` | `1` | Page number, starting at 1 |
| `limit` | `10` | Transactions per page; maximum 100 |

Example: `GET /accounts/00000000-0000-0000-0000-000000000000/transactions?type=debit&page=1&limit=10`

Transactions are returned newest first. The response includes the account ID, transaction list, and pagination metadata.

## Project structure

```text
.
├── controllers/        # Request handlers and API logic
├── routes/             # Express route definitions
├── database.sql        # Supabase tables and transaction function
├── server.js           # Express app setup and server entry point
└── supabase.js         # Supabase client configuration
```

## Tests

No automated test suite is configured yet. The `npm test` script currently exits with a placeholder message.
