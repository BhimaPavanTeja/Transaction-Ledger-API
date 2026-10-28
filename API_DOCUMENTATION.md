# Transaction Ledger API — API Documentation

## 1. Overview

The Transaction Ledger API is a RESTful backend service for managing accounts, recording credit and debit transactions, retrieving account balances, and viewing transaction history.

### Technology Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** Supabase PostgreSQL
- **Database Client:** Supabase JavaScript Client
- **Development Tool:** Nodemon

### Base URL

Local development:

`http://localhost:3000`

### Content Type

Requests with a JSON body must use:

`Content-Type: application/json`

## 2. API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | API health message |
| GET | `/health/db` | Check database connectivity |
| POST | `/accounts` | Create an account |
| POST | `/transactions` | Create a credit or debit transaction |
| GET | `/accounts/:id/balance` | Retrieve account balance |
| GET | `/accounts/:id/transactions` | Retrieve transaction history |

## 3. Health Check

### GET `/`

Returns a message confirming that the API server is running.

**Successful response — 200 OK**

```json
{
  "message": "Transaction Ledger API is running!"
}
```

### GET `/health/db`

Checks whether the backend can query the Supabase `accounts` table.

**Successful response — 200 OK**

```json
{
  "status": "success",
  "message": "Supabase database connection is working"
}
```

**Error response — 500 Internal Server Error**

```json
{
  "error": "Database query failed"
}
```

## 4. Create Account

### POST `/accounts`

Creates a new account with a server-generated UUID, a zero initial balance, and a database-generated creation timestamp.

**Request body**

```json
{
  "name": "Sunny"
}
```

The client may provide the account name only. The server does not accept a client-supplied initial balance, ID, or timestamp.

**Successful response — 201 Created**

```json
{
  "id": "11111111-1111-4111-8111-111111111111",
  "name": "Sunny",
  "balance": 0,
  "created_at": "2026-10-28T05:30:00+00:00"
}
```

The ID and timestamp above are illustrative.

**Possible errors**

- `400 Bad Request` — missing, blank, or invalid account name.
- `500 Internal Server Error` — account creation fails.

## 5. Create Transaction

### POST `/transactions`

Creates a credit or debit transaction and updates the account balance atomically through a PostgreSQL function.

**Request body — Credit**

```json
{
  "account_id": "11111111-1111-4111-8111-111111111111",
  "type": "credit",
  "amount": 1000,
  "description": "Initial deposit",
  "reference_id": "TXN-001"
}
```

**Request body — Debit**

```json
{
  "account_id": "11111111-1111-4111-8111-111111111111",
  "type": "debit",
  "amount": 250,
  "description": "Grocery shopping",
  "reference_id": "TXN-002"
}
```

### Transaction rules

- `account_id` must identify an existing account.
- `type` must be `credit` or `debit`.
- `amount` must be positive and have at most two decimal places.
- `description` and `reference_id` are required.
- A reference ID must be unique within its account.
- Credits increase the balance.
- Debits decrease the balance only when sufficient funds are available.
- The transaction insert and balance update must succeed or roll back together.

**Successful response — 201 Created**

```json
{
  "message": "Transaction created successfully",
  "transaction": {
    "id": "22222222-2222-4222-8222-222222222222",
    "account_id": "11111111-1111-4111-8111-111111111111",
    "type": "debit",
    "amount": 250,
    "description": "Grocery shopping",
    "reference_id": "TXN-002",
    "created_at": "2026-10-28T05:35:00+00:00"
  },
  "balance": 750
}
```

The response values are illustrative. The returned balance reflects the account's actual balance after the transaction.

### Possible errors

| Status | Meaning |
|---|---|
| `400 Bad Request` | Invalid account UUID, transaction type, amount, description, or reference ID |
| `404 Not Found` | Account does not exist |
| `409 Conflict` | Duplicate reference ID or insufficient balance |
| `500 Internal Server Error` | Unexpected database or processing error |

**Example — Insufficient balance**

```json
{
  "error": "Insufficient account balance"
}
```

**Example — Duplicate transaction**

```json
{
  "error": "Transaction reference already exists for this account"
}
```

A rejected transaction must not be recorded, and the account balance must remain unchanged.

## 6. Get Account Balance

### GET `/accounts/:id/balance`

Retrieves the current balance for an account.

**Example request**

`GET /accounts/11111111-1111-4111-8111-111111111111/balance`

**Successful response — 200 OK**

```json
{
  "account_id": "11111111-1111-4111-8111-111111111111",
  "balance": 750
}
```

**Possible errors**

- `400 Bad Request` — invalid account UUID.
- `404 Not Found` — account does not exist.
- `500 Internal Server Error` — database query fails.

## 7. Get Transaction History

### GET `/accounts/:id/transactions`

Retrieves transactions belonging to an account, ordered newest first.

### Query parameters

| Parameter | Required | Default | Description |
|---|---|---|---|
| `type` | No | Both types | Filter by `credit` or `debit` |
| `page` | No | `1` | Page number, starting at 1 |
| `limit` | No | `10` | Records per page; maximum 100 |

### Examples

Retrieve all transactions:

`GET /accounts/11111111-1111-4111-8111-111111111111/transactions`

Retrieve only credits:

`GET /accounts/11111111-1111-4111-8111-111111111111/transactions?type=credit`

Retrieve the second page with five records per page:

`GET /accounts/11111111-1111-4111-8111-111111111111/transactions?page=2&limit=5`

Retrieve debits with pagination:

`GET /accounts/11111111-1111-4111-8111-111111111111/transactions?type=debit&page=1&limit=10`

**Successful response — 200 OK**

```json
{
  "account_id": "11111111-1111-4111-8111-111111111111",
  "transactions": [
    {
      "id": "22222222-2222-4222-8222-222222222222",
      "account_id": "11111111-1111-4111-8111-111111111111",
      "type": "debit",
      "amount": 250,
      "description": "Grocery shopping",
      "reference_id": "TXN-002",
      "created_at": "2026-10-28T05:35:00+00:00"
    }
  ],
  "pagination": {
    "current_page": 1,
    "page_size": 10,
    "total_records": 1,
    "total_pages": 1
  }
}
```

**Possible errors**

- `400 Bad Request` — invalid account UUID, transaction type, page, or limit.
- `404 Not Found` — account does not exist.
- `500 Internal Server Error` — history query fails.

## 8. Data Integrity and Security

### Transaction immutability

The API does not provide endpoints for editing or deleting transactions. Database triggers can reject transaction updates and deletes.

### Balance consistency

The account balance is updated alongside transaction creation within a PostgreSQL function. A database error causes the operation to roll back.

### Duplicate prevention

A unique database constraint on `(account_id, reference_id)` prevents duplicate references for the same account.

### Validation

Incoming data is validated before processing. PostgreSQL constraints provide an additional layer of data integrity.

### Credentials

Supabase credentials must be stored in environment variables and must never be exposed to frontend clients or committed to source control.

## 9. Error Response Format

Errors use a consistent JSON structure:

```json
{
  "error": "A description of the error"
}
```

HTTP status codes distinguish invalid input, missing accounts, transaction conflicts, and unexpected server failures.

## 11. Running Locally

1. Install Node.js.
2. Install dependencies using `npm install`.
3. Configure `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, and `PORT` in `.env`.
4. Apply the database schema and PostgreSQL function using the Supabase SQL Editor.
5. Start development with `npm run dev`.
6. Test the endpoints using Postman or another HTTP client.

## 12. Assumptions

- New accounts always start with a zero balance.
- Account IDs and transaction IDs are generated by the database.
- Creation timestamps are generated by the database.
- Amounts must be positive and have at most two decimal places.
- A reference ID is unique within an account but may be reused by another account.
- Transactions cannot be edited or deleted through the API.
- The money-transfer feature is optional and is not included in this version.
