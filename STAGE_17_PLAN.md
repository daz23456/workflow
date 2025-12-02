# Stage 17: Test API Server

## Overview

**Scope:** Standalone HTTP test server for orchestration service capability testing
**Deliverables:** 3 substages
**Tests:** ~100 tests
**Dependencies:** Stage 7 (API Gateway), Stage 5 (Workflow Execution)
**Priority:** After Stage 16
**Location:** `tests/TestApiServer`
**Value:** Comprehensive testing infrastructure with 100 endpoints for auto-transform validation

**Philosophy:** A dedicated test server that returns content in various shapes and forms, enabling thorough testing of orchestration capabilities including auto-transforms, error handling, and retry logic.

---

## Stage Execution Framework Compliance

> **MANDATORY:** Follow `.claude/STAGE_CHECKLIST.md` - 3 commands per substage, no exceptions.

### Substage Profiles & Gates

| Substage | Profile | Gates | Rationale |
|----------|---------|-------|-----------|
| 17.1 | `BACKEND_DOTNET` | 1-8 | Core infrastructure, primitive endpoints |
| 17.2 | `BACKEND_DOTNET` | 1-8 | Business domain endpoints |
| 17.3 | `BACKEND_DOTNET` | 1-8 | Failure modes, retry testing, workflows |

### Stage 17.1 Execution Protocol

**BEFORE:**
```bash
./scripts/init-stage.sh --stage 17.1 --name "Test API Primitives" --profile BACKEND_DOTNET
```
Creates:
- `stage-proofs/stage-17.1/STAGE_17.1_PROOF.md`
- `stage-proofs/stage-17.1/.stage-state.yaml`
- `stage-proofs/stage-17.1/reports/` directories

**DURING:** TDD Implementation (see Stage 17.1 section below)
- Update `.stage-state.yaml` as you work
- RED → GREEN → REFACTOR cycle

**AFTER:**
```bash
./scripts/run-quality-gates.sh --stage 17.1 1 2 3 4 5 6 7 8
# Fix any failures, re-run until all pass
# Fill in STAGE_17.1_PROOF.md with actual values
./scripts/complete-stage.sh --stage 17.1 --name "Test API Primitives"
```

### Stage 17.2 Execution Protocol

**BEFORE:**
```bash
./scripts/init-stage.sh --stage 17.2 --name "Test API Business Domain" --profile BACKEND_DOTNET
```

**DURING:** TDD Implementation (see Stage 17.2 section below)

**AFTER:**
```bash
./scripts/run-quality-gates.sh --stage 17.2 1 2 3 4 5 6 7 8
./scripts/complete-stage.sh --stage 17.2 --name "Test API Business Domain"
```

### Stage 17.3 Execution Protocol

**BEFORE:**
```bash
./scripts/init-stage.sh --stage 17.3 --name "Test API Failures & Workflows" --profile BACKEND_DOTNET
```

**DURING:** TDD Implementation (see Stage 17.3 section below)

**AFTER:**
```bash
./scripts/run-quality-gates.sh --stage 17.3 1 2 3 4 5 6 7 8
./scripts/complete-stage.sh --stage 17.3 --name "Test API Failures & Workflows"
```

### Context Recovery

Lost your place? Read the state file:
```bash
cat stage-proofs/stage-17.X/.stage-state.yaml
./scripts/stage-status.sh --stage 17.X
```

### Dependencies & Integration

**Dependencies Satisfied (from prior stages):**
- Stage 5: WorkflowOrchestrator, RetryPolicy, HttpTaskExecutor
- Stage 7: WorkflowGateway API patterns

**Enables Future Stages:**
- Stage 16: OpenAPI spec generation from test server
- Integration testing for auto-transform features

---

## Design Decisions

| Decision | Choice |
|----------|--------|
| Location | `tests/TestApiServer` |
| Tech Stack | .NET Minimal API |
| Namespace | `test` for all WorkflowTasks and Workflows |
| Endpoint Count | 100 endpoints across 9 categories |
| Failure Modes | Configurable HTTP status, timeouts, intermittent failures |
| Artifacts | Server + WorkflowTask CRDs + Sample Workflows |

---

## Project Structure

```
tests/
└── TestApiServer/
    ├── TestApiServer.csproj
    ├── Program.cs                          # Minimal API setup
    ├── Endpoints/
    │   ├── PrimitiveEndpoints.cs           # 10 structural endpoints
    │   ├── ArrayEndpoints.cs               # 10 structural endpoints
    │   ├── OrderEndpoints.cs               # 15 e-commerce endpoints
    │   ├── InventoryEndpoints.cs           # 10 inventory endpoints
    │   ├── PaymentEndpoints.cs             # 15 payment endpoints
    │   ├── UserEndpoints.cs                # 15 user/auth endpoints
    │   ├── NotificationEndpoints.cs        # 10 notification endpoints
    │   ├── ErrorEndpoints.cs               # 10 error simulation
    │   └── RetryEndpoints.cs               # 5 retry testing
    ├── Middleware/
    │   ├── DelayMiddleware.cs              # Simulated latency
    │   └── FailureSimulationMiddleware.cs  # Configurable failures
    ├── Models/
    │   ├── OrderModels.cs                  # Order, LineItem, Shipping
    │   ├── PaymentModels.cs                # Transaction, Refund, Receipt
    │   ├── UserModels.cs                   # User, Preferences, Address
    │   ├── InventoryModels.cs              # Product, Reservation, Stock
    │   └── NotificationModels.cs           # Message, Template, Queue
    ├── Services/
    │   ├── FailureStateService.cs          # Track failure state
    │   └── RetryCounterService.cs          # Track retry attempts
    ├── crds/
    │   └── tasks/
    │       ├── test-primitives.yaml        # 10 WorkflowTask CRDs
    │       ├── test-arrays.yaml            # 10 WorkflowTask CRDs
    │       ├── test-orders.yaml            # 15 WorkflowTask CRDs
    │       ├── test-inventory.yaml         # 10 WorkflowTask CRDs
    │       ├── test-payments.yaml          # 15 WorkflowTask CRDs
    │       ├── test-users.yaml             # 15 WorkflowTask CRDs
    │       ├── test-notifications.yaml     # 10 WorkflowTask CRDs
    │       ├── test-errors.yaml            # 10 WorkflowTask CRDs
    │       └── test-retry.yaml             # 5 WorkflowTask CRDs
    ├── workflows/
    │   ├── order-processing.yaml           # Create → Inventory → Payment → Notify
    │   ├── user-onboarding.yaml            # Register → Verify → Preferences → Welcome
    │   ├── payment-retry.yaml              # Authorize → Capture with retry
    │   ├── bulk-notifications.yaml         # Parallel notification sends
    │   └── inventory-check.yaml            # Multi-product availability
    └── Tests/
        ├── PrimitiveEndpointTests.cs
        ├── ArrayEndpointTests.cs
        ├── OrderEndpointTests.cs
        ├── InventoryEndpointTests.cs
        ├── PaymentEndpointTests.cs
        ├── UserEndpointTests.cs
        ├── NotificationEndpointTests.cs
        ├── ErrorEndpointTests.cs
        ├── RetryEndpointTests.cs
        └── IntegrationTests/
            ├── OrderWorkflowTests.cs
            ├── PaymentWorkflowTests.cs
            └── NotificationWorkflowTests.cs
```

---

## Endpoint Categories (100 Total)

### SECTION A: Structural Endpoints (Schema Testing)

#### Category 1: Primitives (10 endpoints)

| # | Endpoint | Method | Response Type | Purpose |
|---|----------|--------|---------------|---------|
| 1 | `/test/primitives/string` | GET | `string` | Plain text response |
| 2 | `/test/primitives/integer` | GET | `int` | Integer value |
| 3 | `/test/primitives/decimal` | GET | `decimal` | Decimal precision |
| 4 | `/test/primitives/boolean` | GET | `bool` | Boolean value |
| 5 | `/test/primitives/guid` | GET | `Guid` | UUID format |
| 6 | `/test/primitives/datetime` | GET | `DateTime` | Full datetime |
| 7 | `/test/primitives/null` | GET | `null` | Null response |
| 8 | `/test/primitives/echo/{value}` | GET | `string` | Echo path param |
| 9 | `/test/primitives/echo` | POST | `string` | Echo body |
| 10 | `/test/primitives/large-string` | GET | `string` | 10KB string |

#### Category 2: Arrays & Collections (10 endpoints)

| # | Endpoint | Method | Response | Purpose |
|---|----------|--------|----------|---------|
| 11 | `/test/arrays/strings` | GET | `["a", "b", "c"]` | String array |
| 12 | `/test/arrays/numbers` | GET | `[1, 2, 3, 4, 5]` | Number array |
| 13 | `/test/arrays/empty` | GET | `[]` | Empty array |
| 14 | `/test/arrays/nested` | GET | `[[1,2], [3,4]]` | 2D array |
| 15 | `/test/arrays/large` | GET | 1000 items | Large array |
| 16 | `/test/arrays/huge` | GET | 10000 items | Very large array |
| 17 | `/test/arrays/with-nulls` | GET | `[1, null, 3]` | Array with nulls |
| 18 | `/test/arrays/mixed-types` | GET | `[1, "two", true]` | Mixed types |
| 19 | `/test/arrays/objects` | GET | `[{...}, {...}]` | Array of objects |
| 20 | `/test/arrays/deeply-nested` | GET | `[{items: [{sub: [...]}]}]` | Deep nesting |

### SECTION B: Business Domain Endpoints (Real-World Scenarios)

#### Category 3: E-Commerce - Orders (15 endpoints)

| # | Endpoint | Method | Response | Purpose |
|---|----------|--------|----------|---------|
| 21 | `/test/orders` | GET | Order list | List all orders |
| 22 | `/test/orders/{id}` | GET | Order details | Get order by ID |
| 23 | `/test/orders` | POST | Created order | Create new order |
| 24 | `/test/orders/{id}/status` | GET | `{status, updatedAt}` | Order status check |
| 25 | `/test/orders/{id}/items` | GET | Line items array | Order line items |
| 26 | `/test/orders/{id}/calculate-total` | POST | `{subtotal, tax, shipping, total}` | Calculate totals |
| 27 | `/test/orders/{id}/apply-discount` | POST | `{discount, newTotal}` | Apply discount code |
| 28 | `/test/orders/{id}/shipping-options` | GET | `[{method, cost, eta}]` | Available shipping |
| 29 | `/test/orders/{id}/track` | GET | `{status, location, history[]}` | Shipment tracking |
| 30 | `/test/orders/{id}/cancel` | POST | `{cancelled, refundAmount}` | Cancel order |
| 31 | `/test/orders/{id}/invoice` | GET | Full invoice with tax breakdown | Generate invoice |
| 32 | `/test/orders/search` | GET | `?status=&dateFrom=&dateTo=` | Search orders |
| 33 | `/test/orders/summary` | GET | `{total, pending, shipped, delivered}` | Order summary stats |
| 34 | `/test/orders/{id}/notes` | POST | `{noteId, content, createdAt}` | Add order note |
| 35 | `/test/orders/bulk-status` | POST | `[{orderId, status}]` | Bulk status update |

#### Category 4: E-Commerce - Inventory (10 endpoints)

| # | Endpoint | Method | Response | Purpose |
|---|----------|--------|----------|---------|
| 36 | `/test/inventory/products` | GET | Product catalog | List products |
| 37 | `/test/inventory/products/{sku}` | GET | Product details | Get by SKU |
| 38 | `/test/inventory/check-availability` | POST | `{sku, available, quantity}` | Stock check |
| 39 | `/test/inventory/reserve` | POST | `{reservationId, expiresAt}` | Reserve stock |
| 40 | `/test/inventory/release/{reservationId}` | POST | `{released: true}` | Release reservation |
| 41 | `/test/inventory/low-stock` | GET | Products below threshold | Low stock alert |
| 42 | `/test/inventory/restock` | POST | `{sku, newQuantity}` | Restock product |
| 43 | `/test/inventory/price/{sku}` | GET | `{price, currency, discount}` | Get pricing |
| 44 | `/test/inventory/bulk-check` | POST | `[{sku, available, qty}]` | Bulk availability |
| 45 | `/test/inventory/categories` | GET | Category tree | Product categories |

#### Category 5: Payments (15 endpoints)

| # | Endpoint | Method | Response | Purpose |
|---|----------|--------|----------|---------|
| 46 | `/test/payments/process` | POST | `{transactionId, status, amount}` | Process payment |
| 47 | `/test/payments/{id}` | GET | Transaction details | Get payment |
| 48 | `/test/payments/{id}/refund` | POST | `{refundId, amount, status}` | Issue refund |
| 49 | `/test/payments/{id}/status` | GET | `{status, lastUpdated}` | Payment status |
| 50 | `/test/payments/validate-card` | POST | `{valid, cardType, last4}` | Card validation |
| 51 | `/test/payments/methods` | GET | `[{type, last4, default}]` | Saved payment methods |
| 52 | `/test/payments/methods` | POST | `{methodId, type}` | Add payment method |
| 53 | `/test/payments/methods/{id}` | DELETE | `{deleted: true}` | Remove method |
| 54 | `/test/payments/calculate-fees` | POST | `{amount, fee, total}` | Calculate fees |
| 55 | `/test/payments/currencies` | GET | `[{code, rate, symbol}]` | Exchange rates |
| 56 | `/test/payments/convert` | POST | `{from, to, amount, converted}` | Currency convert |
| 57 | `/test/payments/{id}/receipt` | GET | Full receipt | Generate receipt |
| 58 | `/test/payments/history` | GET | `?from=&to=&status=` | Payment history |
| 59 | `/test/payments/authorize` | POST | `{authCode, expiresAt}` | Pre-authorize |
| 60 | `/test/payments/capture/{authCode}` | POST | `{captured, amount}` | Capture auth |

#### Category 6: Users & Auth (15 endpoints)

| # | Endpoint | Method | Response | Purpose |
|---|----------|--------|----------|---------|
| 61 | `/test/users/{id}` | GET | User profile | Get user |
| 62 | `/test/users/{id}` | PUT | Updated user | Update user |
| 63 | `/test/users/{id}/preferences` | GET | `{theme, notifications, locale}` | User preferences |
| 64 | `/test/users/{id}/preferences` | PUT | Updated preferences | Set preferences |
| 65 | `/test/users/{id}/addresses` | GET | `[{type, address}]` | User addresses |
| 66 | `/test/users/{id}/addresses` | POST | `{addressId, ...}` | Add address |
| 67 | `/test/users/{id}/subscription` | GET | `{plan, status, renewsAt}` | Subscription status |
| 68 | `/test/users/{id}/subscription/upgrade` | POST | `{newPlan, effectiveDate}` | Upgrade plan |
| 69 | `/test/users/{id}/activity` | GET | Recent activity log | Activity history |
| 70 | `/test/users/{id}/permissions` | GET | `{roles[], permissions[]}` | User permissions |
| 71 | `/test/auth/login` | POST | `{token, expiresAt, user}` | Authenticate |
| 72 | `/test/auth/refresh` | POST | `{token, expiresAt}` | Refresh token |
| 73 | `/test/auth/logout` | POST | `{success: true}` | End session |
| 74 | `/test/auth/verify-token` | POST | `{valid, userId, expiresAt}` | Verify JWT |
| 75 | `/test/auth/password-reset` | POST | `{sent: true, expiresAt}` | Reset password |

#### Category 7: Notifications (10 endpoints)

| # | Endpoint | Method | Response | Purpose |
|---|----------|--------|----------|---------|
| 76 | `/test/notifications/send-email` | POST | `{messageId, status}` | Send email |
| 77 | `/test/notifications/send-sms` | POST | `{messageId, status}` | Send SMS |
| 78 | `/test/notifications/send-push` | POST | `{messageId, delivered}` | Push notification |
| 79 | `/test/notifications/{id}/status` | GET | `{status, deliveredAt}` | Delivery status |
| 80 | `/test/notifications/templates` | GET | `[{id, name, type}]` | List templates |
| 81 | `/test/notifications/templates/{id}` | GET | Template details | Get template |
| 82 | `/test/notifications/queue` | POST | `{queuedId, scheduledFor}` | Queue for later |
| 83 | `/test/notifications/queue/{id}/cancel` | POST | `{cancelled: true}` | Cancel queued |
| 84 | `/test/notifications/preferences/{userId}` | GET | `{email, sms, push}` | User prefs |
| 85 | `/test/notifications/bulk-send` | POST | `{sent, failed, results[]}` | Bulk send |

### SECTION C: Infrastructure Endpoints (Testing Support)

#### Category 8: Error Simulation (10 endpoints)

| # | Endpoint | Method | Response | Purpose |
|---|----------|--------|----------|---------|
| 86 | `/test/errors/400` | GET | 400 Bad Request | Validation error |
| 87 | `/test/errors/401` | GET | 401 Unauthorized | Auth required |
| 88 | `/test/errors/403` | GET | 403 Forbidden | Permission denied |
| 89 | `/test/errors/404` | GET | 404 Not Found | Resource missing |
| 90 | `/test/errors/429` | GET | 429 Too Many Requests | Rate limited |
| 91 | `/test/errors/500` | GET | 500 Internal Error | Server error |
| 92 | `/test/errors/503` | GET | 503 Unavailable | Service down |
| 93 | `/test/errors/configurable` | GET | `?status=XXX` | Any status code |
| 94 | `/test/errors/with-details` | GET | Structured error body | Detailed error |
| 95 | `/test/errors/random` | GET | Random 4xx/5xx | Unpredictable |

#### Category 9: Retry & Failure Testing (5 endpoints)

| # | Endpoint | Method | Response | Purpose |
|---|----------|--------|----------|---------|
| 96 | `/test/retry/fail-once` | GET | Fail 1st, succeed 2nd | Single retry |
| 97 | `/test/retry/fail-n-times` | GET | `?failures=N` | Configurable failures |
| 98 | `/test/retry/intermittent` | GET | `?failRate=0.5` | Random failures |
| 99 | `/test/retry/slow` | GET | `?delay=5000` | Slow response |
| 100 | `/test/retry/reset` | POST | Reset failure counters | Test cleanup |

---

## Stage 17.1: Core Infrastructure & Structural Endpoints

**Goal:** Set up test server infrastructure, primitives, and array endpoints

### TDD Implementation Order

#### Step 1: Project Setup (No tests - scaffolding)
- Create `tests/TestApiServer` project
- Create `tests/TestApiServer.Tests` test project
- Configure .NET Minimal API with WebApplicationFactory
- Add to solution file
- Configure test dependencies (xUnit, FluentAssertions, Microsoft.AspNetCore.Mvc.Testing)

#### Step 2: Primitive Endpoints (RED → GREEN → REFACTOR)

**RED - Write failing tests first:**
```csharp
// PrimitiveEndpointTests.cs
[Fact]
public async Task GetString_ReturnsPlainTextResponse()
{
    var response = await _client.GetAsync("/test/primitives/string");
    response.StatusCode.Should().Be(HttpStatusCode.OK);
    var content = await response.Content.ReadAsStringAsync();
    content.Should().NotBeNullOrEmpty();
}
```

**Test cases to write BEFORE implementation:**
1. `GetString_ReturnsPlainTextResponse`
2. `GetInteger_ReturnsIntegerValue`
3. `GetDecimal_ReturnsDecimalWithPrecision`
4. `GetBoolean_ReturnsBooleanValue`
5. `GetGuid_ReturnsValidUuidFormat`
6. `GetDateTime_ReturnsIso8601Format`
7. `GetNull_ReturnsNullResponse`
8. `EchoPathParam_ReturnsEchoedValue`
9. `EchoBody_ReturnsPostedContent`
10. `GetLargeString_Returns10KBString`

**GREEN - Implement endpoints to pass tests**

**REFACTOR - Clean up while tests stay green**

#### Step 3: Array Endpoints (RED → GREEN → REFACTOR)

**Test cases to write BEFORE implementation:**
1. `GetStrings_ReturnsStringArray`
2. `GetNumbers_ReturnsNumberArray`
3. `GetEmpty_ReturnsEmptyArray`
4. `GetNested_Returns2DArray`
5. `GetLarge_Returns1000Items`
6. `GetHuge_Returns10000Items`
7. `GetWithNulls_ReturnsArrayWithNullElements`
8. `GetMixedTypes_ReturnsMixedTypeArray`
9. `GetObjects_ReturnsArrayOfObjects`
10. `GetDeeplyNested_ReturnsDeepStructure`

#### Step 4: Middleware (RED → GREEN → REFACTOR)

**Test cases to write BEFORE implementation:**
1. `DelayMiddleware_AddsConfiguredLatency`
2. `DelayMiddleware_SkipsWhenNoDelayHeader`
3. `FailureMiddleware_ReturnsConfiguredStatusCode`
4. `FailureMiddleware_PassesThroughWhenNoFailureHeader`

#### Step 5: WorkflowTask CRDs (No tests - YAML artifacts)
- 20 WorkflowTask YAML files in `test` namespace
- Validate against existing CRD schema

### Critical Files
- `tests/TestApiServer/TestApiServer.csproj` (new)
- `tests/TestApiServer/Program.cs` (new)
- `tests/TestApiServer.Tests/TestApiServer.Tests.csproj` (new)
- `tests/TestApiServer.Tests/PrimitiveEndpointTests.cs` (new - WRITE FIRST)
- `tests/TestApiServer.Tests/ArrayEndpointTests.cs` (new - WRITE FIRST)
- `tests/TestApiServer.Tests/MiddlewareTests.cs` (new - WRITE FIRST)
- `tests/TestApiServer/Endpoints/PrimitiveEndpoints.cs` (new - WRITE AFTER TESTS)
- `tests/TestApiServer/Endpoints/ArrayEndpoints.cs` (new - WRITE AFTER TESTS)
- `tests/TestApiServer/Middleware/DelayMiddleware.cs` (new - WRITE AFTER TESTS)
- `tests/TestApiServer/crds/tasks/test-primitives.yaml` (new)
- `tests/TestApiServer/crds/tasks/test-arrays.yaml` (new)

### TDD Targets
- 24+ tests written BEFORE implementation
- All tests fail initially (RED)
- Implementation makes tests pass (GREEN)
- Refactor while maintaining green tests

---

## Stage 17.2: Business Domain Endpoints

**Goal:** Implement e-commerce, payments, users, and notifications endpoints

### TDD Implementation Order

#### Step 1: Orders Endpoints (RED → GREEN → REFACTOR)

**Test cases to write BEFORE implementation:**
```csharp
// OrderEndpointTests.cs - Write ALL tests first, watch them FAIL
[Fact] public async Task GetOrders_ReturnsOrderList() { }
[Fact] public async Task GetOrderById_ReturnsOrderDetails() { }
[Fact] public async Task CreateOrder_ReturnsCreatedOrder() { }
[Fact] public async Task GetOrderStatus_ReturnsStatusAndTimestamp() { }
[Fact] public async Task GetOrderItems_ReturnsLineItemsArray() { }
[Fact] public async Task CalculateTotal_ReturnsSubtotalTaxShippingTotal() { }
[Fact] public async Task ApplyDiscount_ReturnsDiscountAndNewTotal() { }
[Fact] public async Task GetShippingOptions_ReturnsMethodCostEta() { }
[Fact] public async Task TrackOrder_ReturnsStatusLocationHistory() { }
[Fact] public async Task CancelOrder_ReturnsCancelledAndRefundAmount() { }
[Fact] public async Task GetInvoice_ReturnsFullInvoiceWithTaxBreakdown() { }
[Fact] public async Task SearchOrders_FiltersbyStatusAndDateRange() { }
[Fact] public async Task GetOrderSummary_ReturnsTotalPendingShippedDelivered() { }
[Fact] public async Task AddOrderNote_ReturnsNoteIdContentCreatedAt() { }
[Fact] public async Task BulkStatusUpdate_ReturnsOrderIdStatusArray() { }
```

**GREEN** - Implement `OrderEndpoints.cs` to pass all 15 tests
**REFACTOR** - Extract models, clean up while green

#### Step 2: Inventory Endpoints (RED → GREEN → REFACTOR)

**Test cases to write BEFORE implementation:**
1. `GetProducts_ReturnsProductCatalog`
2. `GetProductBySku_ReturnsProductDetails`
3. `CheckAvailability_ReturnsSkuAvailableQuantity`
4. `ReserveStock_ReturnsReservationIdExpiresAt`
5. `ReleaseReservation_ReturnsReleasedTrue`
6. `GetLowStock_ReturnsProductsBelowThreshold`
7. `Restock_ReturnsSkuNewQuantity`
8. `GetPrice_ReturnsPriceCurrencyDiscount`
9. `BulkCheck_ReturnsAvailabilityArray`
10. `GetCategories_ReturnsCategoryTree`

#### Step 3: Payments Endpoints (RED → GREEN → REFACTOR)

**Test cases to write BEFORE implementation:**
1. `ProcessPayment_ReturnsTransactionIdStatusAmount`
2. `GetPayment_ReturnsTransactionDetails`
3. `RefundPayment_ReturnsRefundIdAmountStatus`
4. `GetPaymentStatus_ReturnsStatusLastUpdated`
5. `ValidateCard_ReturnsValidCardTypeLast4`
6. `GetPaymentMethods_ReturnsMethodsArray`
7. `AddPaymentMethod_ReturnsMethodIdType`
8. `DeletePaymentMethod_ReturnsDeletedTrue`
9. `CalculateFees_ReturnsAmountFeeTotal`
10. `GetCurrencies_ReturnsExchangeRates`
11. `ConvertCurrency_ReturnsConvertedAmount`
12. `GetReceipt_ReturnsFullReceipt`
13. `GetPaymentHistory_FiltersbyDateAndStatus`
14. `AuthorizePayment_ReturnsAuthCodeExpiresAt`
15. `CapturePayment_ReturnsCapturedAmount`

#### Step 4: Users & Auth Endpoints (RED → GREEN → REFACTOR)

**Test cases to write BEFORE implementation:**
1. `GetUser_ReturnsUserProfile`
2. `UpdateUser_ReturnsUpdatedUser`
3. `GetPreferences_ReturnsThemeNotificationsLocale`
4. `SetPreferences_ReturnsUpdatedPreferences`
5. `GetAddresses_ReturnsAddressArray`
6. `AddAddress_ReturnsAddressIdAndDetails`
7. `GetSubscription_ReturnsPlanStatusRenewsAt`
8. `UpgradeSubscription_ReturnsNewPlanEffectiveDate`
9. `GetActivity_ReturnsActivityLog`
10. `GetPermissions_ReturnsRolesAndPermissions`
11. `Login_ReturnsTokenExpiresAtUser`
12. `RefreshToken_ReturnsNewTokenExpiresAt`
13. `Logout_ReturnsSuccessTrue`
14. `VerifyToken_ReturnsValidUserIdExpiresAt`
15. `PasswordReset_ReturnsSentTrueExpiresAt`

#### Step 5: Notifications Endpoints (RED → GREEN → REFACTOR)

**Test cases to write BEFORE implementation:**
1. `SendEmail_ReturnsMessageIdStatus`
2. `SendSms_ReturnsMessageIdStatus`
3. `SendPush_ReturnsMessageIdDelivered`
4. `GetNotificationStatus_ReturnsStatusDeliveredAt`
5. `GetTemplates_ReturnsTemplateList`
6. `GetTemplate_ReturnsTemplateDetails`
7. `QueueNotification_ReturnsQueuedIdScheduledFor`
8. `CancelQueued_ReturnsCancelledTrue`
9. `GetUserNotificationPrefs_ReturnsEmailSmsPush`
10. `BulkSend_ReturnsSentFailedResults`

#### Step 6: WorkflowTask CRDs (No tests - YAML artifacts)
- 65 WorkflowTask YAML files in `test` namespace
- Validate against existing CRD schema

### Critical Files
- `tests/TestApiServer.Tests/OrderEndpointTests.cs` (new - WRITE FIRST)
- `tests/TestApiServer.Tests/InventoryEndpointTests.cs` (new - WRITE FIRST)
- `tests/TestApiServer.Tests/PaymentEndpointTests.cs` (new - WRITE FIRST)
- `tests/TestApiServer.Tests/UserEndpointTests.cs` (new - WRITE FIRST)
- `tests/TestApiServer.Tests/NotificationEndpointTests.cs` (new - WRITE FIRST)
- `tests/TestApiServer/Endpoints/OrderEndpoints.cs` (new - WRITE AFTER TESTS)
- `tests/TestApiServer/Endpoints/InventoryEndpoints.cs` (new - WRITE AFTER TESTS)
- `tests/TestApiServer/Endpoints/PaymentEndpoints.cs` (new - WRITE AFTER TESTS)
- `tests/TestApiServer/Endpoints/UserEndpoints.cs` (new - WRITE AFTER TESTS)
- `tests/TestApiServer/Endpoints/NotificationEndpoints.cs` (new - WRITE AFTER TESTS)
- `tests/TestApiServer/Models/BusinessModels.cs` (new - WRITE AFTER TESTS)
- `tests/TestApiServer/crds/tasks/test-orders.yaml` (new)
- `tests/TestApiServer/crds/tasks/test-payments.yaml` (new)
- `tests/TestApiServer/crds/tasks/test-users.yaml` (new)

### TDD Targets
- 65 tests written BEFORE implementation
- All tests fail initially (RED)
- Implementation makes tests pass (GREEN)
- Refactor while maintaining green tests

---

## Stage 17.3: Error Handling, Retry & Sample Workflows

**Goal:** Implement error simulation, retry testing, and sample workflows

### TDD Implementation Order

#### Step 1: Error Simulation Endpoints (RED → GREEN → REFACTOR)

**Test cases to write BEFORE implementation:**
```csharp
// ErrorEndpointTests.cs - Write ALL tests first, watch them FAIL
[Fact] public async Task Get400_ReturnsBadRequest() { }
[Fact] public async Task Get401_ReturnsUnauthorized() { }
[Fact] public async Task Get403_ReturnsForbidden() { }
[Fact] public async Task Get404_ReturnsNotFound() { }
[Fact] public async Task Get429_ReturnsTooManyRequests() { }
[Fact] public async Task Get500_ReturnsInternalServerError() { }
[Fact] public async Task Get503_ReturnsServiceUnavailable() { }
[Fact] public async Task GetConfigurable_ReturnsRequestedStatusCode() { }
[Fact] public async Task GetWithDetails_ReturnsStructuredErrorBody() { }
[Fact] public async Task GetRandom_ReturnsRandom4xxOr5xx() { }
```

**GREEN** - Implement `ErrorEndpoints.cs` to pass all 10 tests
**REFACTOR** - Clean up while green

#### Step 2: Failure Services (RED → GREEN → REFACTOR)

**Test cases to write BEFORE implementation:**
```csharp
// FailureStateServiceTests.cs
[Fact] public void IncrementCallCount_TracksPerEndpoint() { }
[Fact] public void GetCallCount_ReturnsZeroForNewEndpoint() { }
[Fact] public void Reset_ClearsAllCallCounts() { }

// RetryCounterServiceTests.cs
[Fact] public void IncrementRetry_TracksPerRequestId() { }
[Fact] public void ShouldFail_ReturnsTrueUntilThreshold() { }
[Fact] public void Reset_ClearsAllRetryState() { }
```

**GREEN** - Implement services to pass tests
**REFACTOR** - Clean up while green

#### Step 3: Retry Endpoints (RED → GREEN → REFACTOR)

**Test cases to write BEFORE implementation:**
```csharp
// RetryEndpointTests.cs
[Fact] public async Task FailOnce_Fails1stSucceeds2nd() { }
[Fact] public async Task FailNTimes_FailsConfiguredTimesThensucceeds() { }
[Fact] public async Task Intermittent_FailsAtConfiguredRate() { }
[Fact] public async Task Slow_DelaysResponseByConfiguredMs() { }
[Fact] public async Task Reset_ClearsAllFailureCounters() { }
```

**GREEN** - Implement `RetryEndpoints.cs` to pass all 5 tests
**REFACTOR** - Clean up while green

#### Step 4: Sample Workflows (No unit tests - Integration tests)

Create 5 workflow YAML files:
1. `order-processing.yaml` - Create → Inventory → Payment → Notify
2. `user-onboarding.yaml` - Register → Verify → Preferences → Welcome
3. `payment-retry.yaml` - Authorize → Capture with retry policy
4. `bulk-notifications.yaml` - Parallel notification sends
5. `inventory-check.yaml` - Multi-product availability check

#### Step 5: Integration Tests (RED → GREEN → REFACTOR)

**Test cases to write BEFORE running workflows:**
```csharp
// OrderWorkflowIntegrationTests.cs
[Fact] public async Task OrderProcessing_ExecutesAllTasksInOrder() { }
[Fact] public async Task OrderProcessing_PassesDataBetweenTasks() { }
[Fact] public async Task OrderProcessing_HandlesInventoryFailure() { }

// PaymentWorkflowIntegrationTests.cs
[Fact] public async Task PaymentRetry_RetriesOnFailure() { }
[Fact] public async Task PaymentRetry_SucceedsAfterTransientFailure() { }
[Fact] public async Task PaymentRetry_FailsAfterMaxRetries() { }

// NotificationWorkflowIntegrationTests.cs
[Fact] public async Task BulkNotifications_ExecutesInParallel() { }
[Fact] public async Task BulkNotifications_CollectsAllResults() { }
```

**GREEN** - Ensure workflows execute correctly against test server
**REFACTOR** - Clean up while green

#### Step 6: WorkflowTask CRDs (No tests - YAML artifacts)
- 15 WorkflowTask YAML files in `test` namespace for errors/retry
- Validate against existing CRD schema

### Critical Files
- `tests/TestApiServer.Tests/ErrorEndpointTests.cs` (new - WRITE FIRST)
- `tests/TestApiServer.Tests/RetryEndpointTests.cs` (new - WRITE FIRST)
- `tests/TestApiServer.Tests/FailureStateServiceTests.cs` (new - WRITE FIRST)
- `tests/TestApiServer.Tests/RetryCounterServiceTests.cs` (new - WRITE FIRST)
- `tests/TestApiServer.Tests/Integration/OrderWorkflowTests.cs` (new - WRITE FIRST)
- `tests/TestApiServer.Tests/Integration/PaymentWorkflowTests.cs` (new - WRITE FIRST)
- `tests/TestApiServer.Tests/Integration/NotificationWorkflowTests.cs` (new - WRITE FIRST)
- `tests/TestApiServer/Endpoints/ErrorEndpoints.cs` (new - WRITE AFTER TESTS)
- `tests/TestApiServer/Endpoints/RetryEndpoints.cs` (new - WRITE AFTER TESTS)
- `tests/TestApiServer/Services/FailureStateService.cs` (new - WRITE AFTER TESTS)
- `tests/TestApiServer/Services/RetryCounterService.cs` (new - WRITE AFTER TESTS)
- `tests/TestApiServer/workflows/order-processing.yaml` (new)
- `tests/TestApiServer/workflows/user-onboarding.yaml` (new)
- `tests/TestApiServer/workflows/payment-retry.yaml` (new)
- `tests/TestApiServer/workflows/bulk-notifications.yaml` (new)
- `tests/TestApiServer/workflows/inventory-check.yaml` (new)

### TDD Targets
- 26+ tests written BEFORE implementation
- All tests fail initially (RED)
- Implementation makes tests pass (GREEN)
- Refactor while maintaining green tests

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Total Endpoints | 100 |
| WorkflowTask CRDs | 100 |
| Sample Workflows | 5 |
| Unit Tests | ~60 |
| Integration Tests | ~40 |
| Test Coverage | ≥90% |
| Endpoint Response Time | <10ms (local) |

---

## TDD Targets Summary

| Substage | Tests |
|----------|-------|
| 17.1 Core Infrastructure & Structural Endpoints | 25+ |
| 17.2 Business Domain Endpoints | 50+ |
| 17.3 Error Handling, Retry & Workflows | 25+ |
| **Total** | **~100 tests** |

---

## Value Delivered

**To the Project:**
> Comprehensive testing infrastructure enabling validation of orchestration engine auto-transform capabilities with 100 endpoints returning various response shapes.

**To Users:**
> Local test server simulating real-world API behavior including failures, timeouts, and complex nested responses. Pre-built WorkflowTask CRDs and sample workflows included.

**Business Value:**
> - 100 endpoints covering all response shapes
> - Configurable errors and retry scenarios
> - Auto-transform validation across different structures
> - No external dependencies for testing
