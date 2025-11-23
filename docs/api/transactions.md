# Transaction API Documentation

This document describes the Transaction API endpoints for the NYU Marketplace platform.

## Overview

The Transaction API allows buyers and sellers to manage transactions for listings. Transactions go through several states: PENDING → NEGOTIATING → SCHEDULED → COMPLETED (or CANCELLED).

## Authentication

All transaction endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <token>
```

## Endpoints

### 1. Buy a Listing

Create a new transaction by purchasing a listing.

**Endpoint:** `POST /api/v1/listings/{id}/buy/`

**Authentication:** Required

**Request Body:** None

**Response:** `201 Created`

```json
{
  "transaction_id": 1,
  "listing": 123,
  "buyer": 456,
  "seller": 789,
  "payment_method": null,
  "delivery_method": null,
  "meet_location": null,
  "meet_time": null,
  "status": "PENDING",
  "created_at": "2025-11-20T12:00:00Z",
  "updated_at": "2025-11-20T12:00:00Z"
}
```

**Validation:**
- Buyer must be authenticated
- Buyer cannot be the seller
- Listing must be available (status = "active")

**Side Effects:**
- Creates a new Transaction with status PENDING
- Updates listing.status to "pending"
- Creates a system chat message (if conversation exists)

**Error Responses:**
- `400 Bad Request`: Buyer is the seller, or listing is not available
- `401 Unauthorized`: Not authenticated
- `404 Not Found`: Listing not found

---

### 2. Update Payment Method

Set or change the payment method for a transaction.

**Endpoint:** `PATCH /api/v1/transactions/{id}/payment-method/`

**Authentication:** Required (Buyer only)

**Request Body:**

```json
{
  "payment_method": "venmo"
}
```

**Valid Values:** `"venmo"`, `"zelle"`, `"cash"`

**Response:** `200 OK`

```json
{
  "transaction_id": 1,
  "listing": 123,
  "buyer": 456,
  "seller": 789,
  "payment_method": "venmo",
  "delivery_method": null,
  "meet_location": null,
  "meet_time": null,
  "status": "PENDING",
  "created_at": "2025-11-20T12:00:00Z",
  "updated_at": "2025-11-20T12:05:00Z"
}
```

**Validation:**
- Only the buyer can set or change the payment method
- Payment method must be one of: venmo, zelle, cash

**Side Effects:**
- Updates transaction.payment_method
- Creates a system chat message summarizing the chosen method

**Error Responses:**
- `400 Bad Request`: Invalid payment method
- `403 Forbidden`: User is not the buyer
- `401 Unauthorized`: Not authenticated
- `404 Not Found`: Transaction not found

---

### 3. Update Delivery Details

Set delivery details for a transaction.

**Endpoint:** `PATCH /api/v1/transactions/{id}/delivery-details/`

**Authentication:** Required (Buyer only)

**Request Body (Meetup):**

```json
{
  "delivery_method": "meetup",
  "meet_location": "Bobst Library",
  "meet_time": "2025-12-01T14:00:00Z"
}
```

**Request Body (Pickup):**

```json
{
  "delivery_method": "pickup"
}
```

**Valid Values:**
- `delivery_method`: `"meetup"` or `"pickup"`
- `meet_location`: Required for meetup, optional for pickup
- `meet_time`: Required for meetup, optional for pickup (ISO 8601 format)

**Response:** `200 OK`

```json
{
  "transaction_id": 1,
  "listing": 123,
  "buyer": 456,
  "seller": 789,
  "payment_method": "venmo",
  "delivery_method": "meetup",
  "meet_location": "Bobst Library",
  "meet_time": "2025-12-01T14:00:00Z",
  "status": "PENDING",
  "created_at": "2025-11-20T12:00:00Z",
  "updated_at": "2025-11-20T12:10:00Z"
}
```

**Validation:**
- Only the buyer can set delivery details
- For `meetup`: `meet_location` and `meet_time` are required
- For `pickup`: `meet_location` and `meet_time` are optional

**Side Effects:**
- Updates transaction delivery fields
- Creates a system chat message summarizing the proposal

**Error Responses:**
- `400 Bad Request`: Missing required fields for delivery method
- `403 Forbidden`: User is not the buyer
- `401 Unauthorized`: Not authenticated
- `404 Not Found`: Transaction not found

---

### 4. Confirm Transaction

Seller confirms the meetup and schedules the transaction.

**Endpoint:** `PATCH /api/v1/transactions/{id}/confirm/`

**Authentication:** Required (Seller only)

**Request Body:** None

**Response:** `200 OK`

```json
{
  "transaction_id": 1,
  "listing": 123,
  "buyer": 456,
  "seller": 789,
  "payment_method": "venmo",
  "delivery_method": "meetup",
  "meet_location": "Bobst Library",
  "meet_time": "2025-12-01T14:00:00Z",
  "status": "SCHEDULED",
  "created_at": "2025-11-20T12:00:00Z",
  "updated_at": "2025-11-20T12:15:00Z"
}
```

**Validation:**
- Only the seller can confirm
- Transaction must be in PENDING or NEGOTIATING state

**Side Effects:**
- Updates transaction.status to SCHEDULED
- Creates a system chat message indicating seller confirmation

**Error Responses:**
- `400 Bad Request`: Transaction cannot be confirmed in its current state
- `403 Forbidden`: User is not the seller
- `401 Unauthorized`: Not authenticated
- `404 Not Found`: Transaction not found

---

### 5. Mark as Sold

Seller marks the transaction as completed after payment and delivery.

**Endpoint:** `PATCH /api/v1/transactions/{id}/mark-sold/`

**Authentication:** Required (Seller only)

**Request Body:** None

**Response:** `200 OK`

```json
{
  "transaction_id": 1,
  "listing": 123,
  "buyer": 456,
  "seller": 789,
  "payment_method": "venmo",
  "delivery_method": "meetup",
  "meet_location": "Bobst Library",
  "meet_time": "2025-12-01T14:00:00Z",
  "status": "COMPLETED",
  "created_at": "2025-11-20T12:00:00Z",
  "updated_at": "2025-11-20T15:00:00Z"
}
```

**Validation:**
- Only the seller can mark as sold
- Transaction must not be COMPLETED or CANCELLED

**Side Effects:**
- Updates transaction.status to COMPLETED
- Updates listing.status to "sold"
- Creates a system chat message indicating completion

**Error Responses:**
- `400 Bad Request`: Transaction is already completed or cancelled
- `403 Forbidden`: User is not the seller
- `401 Unauthorized`: Not authenticated
- `404 Not Found`: Transaction not found

---

## Transaction Status Flow

```
PENDING → NEGOTIATING → SCHEDULED → COMPLETED
                ↓
           CANCELLED
```

- **PENDING**: Transaction created, awaiting payment/delivery details
- **NEGOTIATING**: Buyer and seller are discussing details
- **SCHEDULED**: Seller confirmed, meetup scheduled
- **COMPLETED**: Transaction finished, item sold
- **CANCELLED**: Transaction cancelled

## System Messages

All transaction events automatically create system chat messages in the conversation between buyer and seller. These messages are marked with `metadata.is_system = true` and include transaction context.

## Error Response Format

All error responses follow this format:

```json
{
  "error": "Error message describing what went wrong"
}
```

## Example Transaction Flow

1. **Buyer purchases listing:**
   ```
   POST /api/v1/listings/123/buy/
   → Creates transaction with status PENDING
   ```

2. **Buyer sets payment method:**
   ```
   PATCH /api/v1/transactions/1/payment-method/
   {"payment_method": "venmo"}
   → System message: "Buyer selected payment method: VENMO"
   ```

3. **Buyer sets delivery details:**
   ```
   PATCH /api/v1/transactions/1/delivery-details/
   {
     "delivery_method": "meetup",
     "meet_location": "Bobst Library",
     "meet_time": "2025-12-01T14:00:00Z"
   }
   → System message with meetup details
   ```

4. **Seller confirms:**
   ```
   PATCH /api/v1/transactions/1/confirm/
   → Status changes to SCHEDULED
   → System message: "Seller confirmed the meetup. Transaction is scheduled."
   ```

5. **Seller marks as sold:**
   ```
   PATCH /api/v1/transactions/1/mark-sold/
   → Status changes to COMPLETED
   → Listing status changes to "sold"
   → System message: "Seller marked the item as sold. Transaction completed."
   ```

