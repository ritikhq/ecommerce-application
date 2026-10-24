# E-commerce Application API

A Spring Boot backend MVP for an e-commerce application. It supports user registration, catalog management, carts, checkout, orders, addresses, reviews, and mock payments.

The bundled storefront is served from the application root. Shoppers can search, filter by category, and sort products, then read and submit product reviews using a selected account.

## Prerequisites

- Java 21
- MySQL running locally
- Maven (the included Maven wrapper is currently broken, so install Maven or regenerate the wrapper before running the project)

Create the database once:

```sql
CREATE DATABASE ecommerce_db;
```

Set the database password in PowerShell before starting the app:

```powershell
$env:DB_PASSWORD = "your-mysql-password"
mvn spring-boot:run
```

The server starts on `http://localhost:8080`.

## Main API flow

1. Create a user with `POST /api/users/register`.
2. Create a category with `POST /api/categories`.
3. Create a product with `POST /api/products`.
4. Add products to a cart with `POST /api/users/{userId}/cart/items`.
5. Checkout with `POST /api/users/{userId}/orders/checkout`.
6. Record a mock payment with `POST /api/users/{userId}/orders/{orderId}/payment`.

## Example requests

### Register a user

```http
POST /api/users/register
Content-Type: application/json

{
  "name": "Ritik",
  "email": "ritik@example.com",
  "password": "strong-password"
}
```

### Create a category

```http
POST /api/categories
Content-Type: application/json

{
  "name": "Electronics"
}
```

### Create a product

```http
POST /api/products
Content-Type: application/json

{
  "name": "Wireless Mouse",
  "description": "Bluetooth mouse",
  "price": 799.00,
  "stockQuantity": 20,
  "categoryId": 1
}
```

### Add a product to a cart

```http
POST /api/users/1/cart/items
Content-Type: application/json

{
  "productId": 1,
  "quantity": 2
}
```

### Checkout

```http
POST /api/users/1/orders/checkout
```

### Record a mock payment

```http
POST /api/users/1/orders/1/payment
Content-Type: application/json

{
  "method": "UPI"
}
```

## Endpoints

| Area | Endpoints |
| --- | --- |
| Users | `POST /api/users/register`, `GET /api/users/{id}` |
| Categories | `GET`, `POST /api/categories` |
| Products | `GET`, `POST /api/products`, `GET /api/products/{id}`, `GET /api/products/category/{categoryId}` |
| Cart | `GET /api/users/{userId}/cart`, `POST /items`, `PATCH /items/{itemId}`, `DELETE /items/{itemId}` |
| Orders | `POST /api/users/{userId}/orders/checkout`, `GET /api/users/{userId}/orders`, `GET /{orderId}` |
| Addresses | `GET`, `POST /api/users/{userId}/addresses` |
| Reviews | `GET /api/products/{productId}/reviews`, `POST /api/products/{productId}/reviews/users/{userId}` |
| Payments | `GET`, `POST /api/users/{userId}/orders/{orderId}/payment` |

## Important note

This is a local development MVP. Passwords are hashed and API input is validated, but the current routes use `userId` in URLs and are open for development. Before deploying publicly, add JWT authentication and role-based authorization, use a real payment gateway, and add automated tests.
