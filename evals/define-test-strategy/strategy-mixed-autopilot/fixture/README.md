# Purchase Approval App

The React PurchaseForm displays totals, warns when the budget is exceeded and
submits requests to a Deno approval function. The function checks the caller's
role, validates amounts, and writes a payment through an external platform API.
Incorrect UI wiring, authorization, duplicate submissions and failed external
writes matter as well as arithmetic. The deployed UI and function must agree on
the accepted request and response shapes.

Existing tests cover only src/lib/lineTotal.js. No component, backend, contract
or browser tests exist. Run the configured unit suite with npm test. The
platform service routes /api/approve to functions/approvePurchase.ts.

Functions use Deno with PLATFORM_BASE_URL and PLATFORM_API_KEY set by deployment.
Local Deno, a test sandbox and CI are not provisioned. The deployment packaging
for shared frontend/backend code has not been established. Do not assume that
Node-importable copies would exercise the deployed functions.
