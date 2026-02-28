# Business Rules — HONE Store

This document defines the expected behavior for the HONE demo store. The Relay Engine agent reads this document to determine whether observed behavior is intentional, a known limitation, or a bug.

## Order Status Transitions

Orders follow a linear lifecycle:

```
pending → processing → shipped → delivered
```

Cancellation is allowed from `pending` or `processing`:

```
pending → cancelled
processing → cancelled
```

**Invalid transitions are rejected** with error code `ERR_INVALID_TRANSITION`. For example, attempting to go directly from `pending` to `shipped` will fail.

Valid transitions summary:

| Current Status | Allowed Next Status |
|---|---|
| pending | processing, cancelled |
| processing | shipped, cancelled |
| shipped | delivered |
| delivered | *(none — terminal)* |
| cancelled | *(none — terminal)* |

### Known UX Gap

The order detail page currently shows a "Request Shipping" button on `pending` orders. This button attempts a `pending → shipped` transition, which the API correctly rejects. The user sees an error. This is a **known UX issue** — the button should either be hidden for pending orders or should transition to `processing` first.

## Inventory & Checkout Rules

### Stock Checking

- Stock is checked **at checkout time only**, not when adding items to the cart.
- There is **no cart reservation** system. Adding an item to the cart does not hold inventory.
- If any item in the cart has insufficient stock at checkout, the entire checkout fails with error code `STOCK_INSUFFICIENT`.

### Out-of-Stock Behavior

Products with `stock: 0` should show "Out of Stock" and have a disabled button. However:

**Known UX Issue:** The Desk Mat product (`prod-5`) has `stock: 0` but still displays an active "Add to Cart" button due to a deliberate exception in the UI code (`product.id !== 'prod-5'` check inverts the intended logic). Users can add it to cart, but checkout will fail with `STOCK_INSUFFICIENT`. This is a known edge case for demo purposes.

## Error Message Policy

Error codes are **internal identifiers**, not user-friendly messages. The store intentionally surfaces raw error codes to demonstrate poor error UX that the Relay Engine agent can detect and classify.

| Error Code | Meaning | When It Occurs |
|---|---|---|
| `ERR_INVALID_TRANSITION` | Order status transition not allowed | Attempting an invalid status change (e.g., pending → shipped) |
| `STOCK_INSUFFICIENT` | Item has zero stock | Checkout with out-of-stock item |
| `CHECKOUT_FAILED` | General checkout failure | Wraps stock errors at checkout |

These codes appear in API responses and are shown directly to users in error toasts — this is intentional for the demo. A production store would translate these into friendly messages.

## Products

| ID | Name | Price | Stock |
|---|---|---|---|
| prod-1 | Wireless Headphones | $79.99 | 5 |
| prod-2 | USB-C Cable | $12.99 | 50 |
| prod-3 | Mechanical Keyboard | $149.99 | 3 |
| prod-4 | Monitor Stand | $45.00 | 8 |
| prod-5 | Desk Mat | $29.99 | 0 |
| prod-6 | Webcam HD Pro | $89.99 | 2 |
