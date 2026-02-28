# API Reference

Base URL: `/api`

All endpoints return JSON. Data is stored in-memory (mock data) and resets on redeploy.

---

## GET /api/orders

List all orders.

**Response**

```json
{
  "orders": [
    {
      "id": "ORD-001",
      "customerName": "Sarah Chen",
      "customerEmail": "sarah@example.com",
      "status": "pending",
      "items": [
        { "id": "item-1", "name": "Wireless Headphones", "quantity": 1, "price": 79.99, "inStock": true }
      ],
      "total": 105.97,
      "createdAt": "2026-02-27T10:30:00Z",
      "updatedAt": "2026-02-27T10:30:00Z"
    }
  ]
}
```

---

## GET /api/orders/:id

Get a single order with its valid status transitions.

**Response**

```json
{
  "order": { "id": "ORD-001", "status": "pending", "..." : "..." },
  "validTransitions": ["processing", "cancelled"]
}
```

**Errors**

| Status | Meaning |
|--------|---------|
| 404 | Order not found |

---

## PATCH /api/orders/:id/status

Update an order's status.

**Request body**

```json
{ "status": "processing" }
```

**Valid transitions**

| From | To |
|------|----|
| pending | processing, cancelled |
| processing | shipped, cancelled |
| shipped | delivered |
| delivered | _(none)_ |
| cancelled | _(none)_ |

**Response**

```json
{ "order": { "id": "ORD-001", "status": "processing", "..." : "..." } }
```

**Errors**

| Status | Meaning |
|--------|---------|
| 404 | Order not found |
| 422 | Invalid status transition |

---

## GET /api/products

List all products with stock levels.

**Response**

```json
{
  "products": [
    { "id": "prod-1", "name": "Wireless Headphones", "price": 79.99, "stock": 5 }
  ]
}
```

---

## POST /api/checkout

Create a new order.

**Request body**

```json
{
  "items": [
    { "productId": "prod-1", "quantity": 1 }
  ]
}
```

**Response**

```json
{ "success": true, "orderId": "ORD-4821" }
```

**Errors**

| Status | Meaning |
|--------|---------|
| 400 | No items provided |
| 404 | Product not found |
| 409 | Insufficient stock |
