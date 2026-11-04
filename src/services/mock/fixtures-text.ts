/** Text banks for the deterministic fixture generator (see docs/design/mock-data.md). */

export type Family = 'login' | 'form' | 'checkout' | 'search' | 'api' | 'webhook' | 'mobile';

export interface SectionDef {
  id: string;
  suite: 'web' | 'api' | 'mobile';
  parent?: string;
  name: string;
  family: Family;
  titles: string[];
}

export const SECTION_DEFS: SectionDef[] = [
  {
    id: 'sec_login', suite: 'web', name: 'Login', family: 'login',
    titles: [
      'Login succeeds with valid credentials', 'Login rejects an incorrect password',
      'Login locks the account after 5 failed attempts', 'Login rejects an unknown email address',
      'Remember me keeps the session after a browser restart', 'Session expires after 30 minutes of inactivity',
      'Password reset email is sent for a registered address', 'Password reset link expires after 24 hours',
      'Login form is fully keyboard accessible', 'Login redirects to the originally requested page',
      'Two-factor prompt appears for accounts with 2FA enabled', '登录失败后锁定账户',
    ],
  },
  {
    id: 'sec_registration', suite: 'web', name: 'Registration', family: 'form',
    titles: [
      'Registration succeeds with a valid email and password', 'Registration rejects an email that is already in use',
      'Registration enforces the password strength rules', 'Registration sends a confirmation email',
      'Confirmation link activates the account', 'Registration form shows inline validation errors',
      'Registration accepts names with accents and apostrophes', 'Terms of service must be accepted before submitting',
    ],
  },
  {
    id: 'sec_checkout', suite: 'web', name: 'Checkout', family: 'checkout',
    titles: [
      'Checkout applies a discount code once', 'Checkout rejects an expired discount code',
      'Checkout recalculates tax when the shipping country changes', 'Checkout keeps the cart after a page reload',
      'Checkout blocks submission when the cart is empty', 'Checkout shows free shipping above the threshold',
      'Guest checkout does not require an account', 'Checkout saves a new shipping address to the address book',
      'Order confirmation page shows the order number', 'Order confirmation email lists every purchased item',
      'Checkout handles an item going out of stock mid-purchase', 'Checkout totals stay correct with 50 line items in the cart',
    ],
  },
  {
    id: 'sec_payments', suite: 'web', parent: 'sec_checkout', name: 'Payments', family: 'checkout',
    titles: [
      'Card payment succeeds with a valid test card', 'Card payment shows a clear message when the card is declined',
      '3-D Secure challenge completes the payment', 'Payment is not charged twice when the button is double-clicked',
      'Refund is reflected in the order history within a minute', 'Saved card is masked to the last four digits',
    ],
  },
  {
    id: 'sec_profile', suite: 'web', name: 'Profile', family: 'form',
    titles: [
      'Profile name can be updated', 'Profile email change requires confirmation',
      'Profile avatar upload accepts PNG and JPEG', 'Profile avatar upload rejects files over 5 MB',
      'Password can be changed from the profile page', 'Profile shows the last sign-in time',
      'Notification preferences are saved', 'Account deletion requires typing the account email',
      'Language preference changes the interface language', 'Profile page is readable at 200% zoom',
    ],
  },
  {
    id: 'sec_search', suite: 'web', name: 'Search', family: 'search',
    titles: [
      'Search returns results ranked by relevance', 'Search handles an empty query gracefully',
      'Search suggestions appear after two characters', 'Search filters combine with AND logic',
      'Search results paginate at 24 items per page', 'Search is case-insensitive',
      'Search handles special characters without errors', 'Search highlights the matched terms',
      'Search shows a helpful message when nothing matches', 'Search sort order persists in the URL',
      'Recent searches are shown on focus', 'Search responds within 800 ms for 10,000 products',
    ],
  },
  {
    id: 'sec_auth', suite: 'api', name: 'Auth', family: 'api',
    titles: [
      'POST /auth/token returns a token for valid credentials', 'POST /auth/token returns 401 for a wrong password',
      'POST /auth/token rate-limits after 10 attempts per minute', 'Expired tokens are rejected with 401',
      'Refresh token rotates on every use', 'Revoked tokens are rejected immediately',
      'Token scope limits access to read-only endpoints', 'Auth endpoints reject non-JSON bodies with 415',
      'CORS preflight allows only configured origins', 'Auth errors never reveal whether an email exists',
    ],
  },
  {
    id: 'sec_orders', suite: 'api', name: 'Orders', family: 'api',
    titles: [
      'GET /orders returns only the caller’s orders', 'GET /orders paginates with offset and limit',
      'POST /orders creates an order and returns 201', 'POST /orders rejects an empty line item list',
      'POST /orders is idempotent with the same Idempotency-Key', 'PATCH /orders/{id} cannot change a shipped order',
      'DELETE /orders/{id} cancels an unpaid order', 'GET /orders/{id} returns 404 for another user’s order',
      'Order total matches the sum of line items and tax', 'Order status transitions follow the allowed graph',
      'Orders can be filtered by date range', 'Orders export returns valid CSV',
      'Concurrent updates to one order return 409', 'Order list responds under 300 ms for 1,000 orders',
    ],
  },
  {
    id: 'sec_products', suite: 'api', name: 'Products', family: 'api',
    titles: [
      'GET /products returns the first page sorted by name', 'GET /products/{id} returns 404 for an unknown id',
      'POST /products requires the admin role', 'Product price must be a positive number',
      'Product SKU must be unique', 'Product images are returned as absolute URLs',
      'Archived products are hidden from the public listing', 'Bulk price update applies to all selected products',
      'Product search supports prefix matching', 'Product stock never goes below zero',
    ],
  },
  {
    id: 'sec_webhooks', suite: 'api', name: 'Webhooks', family: 'webhook',
    titles: [
      'Webhook is signed with HMAC-SHA256', 'Webhook payload matches the published schema',
      'Webhook delivery log shows status and latency', 'Webhook endpoint can be disabled without deleting it',
    ],
  },
  {
    id: 'sec_retries', suite: 'api', parent: 'sec_webhooks', name: 'Retries', family: 'webhook',
    titles: ['Failed webhook is retried with exponential backoff', 'Webhook stops retrying after 8 attempts'],
  },
  {
    id: 'sec_navigation', suite: 'mobile', name: 'Navigation', family: 'mobile',
    titles: [
      'Main menu opens and closes on tap', 'Bottom navigation highlights the current page',
      'Back button returns to the previous screen', 'Deep links open the correct page',
      'Tab order is logical on mobile', 'Pull to refresh reloads the list',
      'Menu is usable in landscape orientation', 'Breadcrumbs collapse on narrow screens',
    ],
  },
  {
    id: 'sec_forms', suite: 'mobile', name: 'Forms', family: 'mobile',
    titles: [
      'Keyboard type matches the field type on mobile', 'Form keeps entered values after rotating the device',
      'Date picker uses the native control', 'Autofill populates address fields',
      'Validation messages are readable at 320 px width', 'Submit button stays reachable above the keyboard',
      'File upload works from the camera roll', 'Long text in a field wraps instead of overflowing',
    ],
  },
  {
    id: 'sec_offline', suite: 'mobile', name: 'Offline', family: 'mobile',
    titles: [
      'App shows an offline banner when the connection drops', 'Queued changes sync when the connection returns',
      'Cached pages open without a network', 'Sync conflict is reported to the user',
    ],
  },
  { id: 'sec_a11y', suite: 'mobile', name: 'Accessibility', family: 'mobile', titles: [] },
];

export const STEP_BANK: Record<Family, Array<[string, string]>> = {
  login: [
    ['Open the login page', 'The login form is shown'],
    ['Enter the account email address', 'The field accepts the value'],
    ['Enter the account password', 'The password is masked'],
    ['Click Sign in', 'The request is submitted and a loading state appears'],
    ['Wait for the page to load', 'The expected page or message is displayed'],
    ['Open the account menu', 'The signed-in user name is shown'],
    ['Reload the browser tab', 'The session state is unchanged'],
    ['Sign out from the account menu', 'The login page is shown again'],
  ],
  form: [
    ['Open the page that contains the form', 'The form is displayed with empty fields'],
    ['Fill in every required field with valid data', 'No validation errors are shown'],
    ['Leave one required field empty and move focus away', 'An inline error names the missing field'],
    ['Submit the form', 'A success message is displayed'],
    ['Reload the page', 'The saved values are shown'],
    ['Open the confirmation email', 'The email contains the expected details'],
    ['Click the link in the email', 'The browser opens the confirmation page'],
    ['Return to the form', 'The status reflects the change'],
  ],
  checkout: [
    ['Add two products to the cart', 'The cart badge shows 2 items'],
    ['Open the cart and click Checkout', 'The checkout form is displayed'],
    ['Enter a valid shipping address', 'Shipping options are listed'],
    ['Choose a shipping option', 'The order total is updated'],
    ['Enter the payment details', 'The payment form accepts the input'],
    ['Click Place order', 'The order confirmation page is displayed'],
    ['Open the confirmation email', 'The email lists the purchased items and total'],
    ['Open the order in the order history', 'The order status is Processing'],
  ],
  search: [
    ['Open the home page', 'The search box is visible'],
    ['Type the search term into the search box', 'Suggestions appear below the box'],
    ['Press Enter', 'The results page is displayed'],
    ['Check the result count and first result', 'The count matches and the first result is relevant'],
    ['Apply a filter from the sidebar', 'The results update without a full reload'],
    ['Change the sort order', 'The results are reordered and the URL is updated'],
    ['Go to the next page of results', 'The next set of results is displayed'],
    ['Click the browser back button', 'The previous results page is restored'],
  ],
  api: [
    ['Prepare a valid access token', 'The token is accepted by the gateway'],
    ['Send the request with a valid body', 'The response status matches the specification'],
    ['Inspect the response headers', 'Content-Type is application/json'],
    ['Inspect the response body', 'Required fields are present with the correct types'],
    ['Repeat the request with an invalid parameter', 'The API returns 400 with an error message'],
    ['Repeat the request without a token', 'The API returns 401'],
    ['Check the audit log for the request', 'An entry exists for the caller'],
    ['Measure the response time over 20 calls', 'The 95th percentile is within the target'],
  ],
  webhook: [
    ['Register a webhook endpoint', 'The endpoint is listed as active'],
    ['Trigger the event that fires the webhook', 'A delivery attempt is recorded'],
    ['Inspect the request received by the endpoint', 'The signature header and payload are present'],
    ['Make the endpoint return 500', 'The delivery is marked failed'],
    ['Wait for the next attempt', 'A new attempt is recorded after the backoff delay'],
    ['Make the endpoint return 200', 'The delivery is marked successful'],
    ['Open the delivery log', 'All attempts are listed with status and latency'],
    ['Disable the endpoint', 'No further deliveries are attempted'],
  ],
  mobile: [
    ['Open the site in a mobile browser at 375 px width', 'The mobile layout is displayed'],
    ['Tap the main control for this feature', 'The control responds within 300 ms'],
    ['Rotate the device to landscape', 'The layout adapts without losing state'],
    ['Rotate the device back to portrait', 'The original layout is restored'],
    ['Switch to airplane mode', 'The app reacts to the lost connection'],
    ['Turn the connection back on', 'The app recovers without a reload'],
    ['Zoom the page to 200%', 'Content reflows without horizontal scrolling'],
    ['Navigate using only the on-screen keyboard', 'Every control can be reached'],
  ],
};

export const FILLER_STEP: [string, string] = [
  'Check the activity log for the previous action',
  'The entry is recorded with the correct user and time',
];

export const CONTENT_BANK: Record<Family, string> = {
  login: 'A verified user account exists and is not locked.',
  form: 'The user is signed in. Test data for a new account is available.',
  checkout: 'The store has at least three in-stock products and a test discount code.',
  search: 'The catalogue contains at least 200 indexed products.',
  api: 'A service account with a valid token exists. The API base URL is configured.',
  webhook: 'A test endpoint that records requests is available.',
  mobile: 'A phone or emulator with a current mobile browser is available.',
};

export const MOB_TITLES: string[] = (() => {
  const screens = ['Home feed', 'Settings', 'Notifications', 'Profile', 'Barcode scanner'];
  const checks = ['loads within 2 seconds on 4G', 'works in dark mode', 'keeps its state after backgrounding', 'is announced correctly by a screen reader'];
  return screens.flatMap((s) => checks.map((c) => `${s} ${c}`));
})();

export const FAIL_COMMENTS = [
  'Locked after 4 attempts instead of 5.',
  'Error banner is shown but the field keeps the invalid value.',
  'Response was 500 with a stack trace instead of the documented 400.',
  'Total is off by 0.01 when two discounts apply.',
  'Page stays on the spinner for more than 10 seconds.',
  'Expected message is missing; the form silently resets.',
  'Reproduced twice on Chrome 140 and once on Safari 18.',
  'Works on desktop, fails on a 375 px viewport: the button is cut off.',
  'The request succeeds but the confirmation email never arrives.',
  'Fails intermittently: 2 of 5 runs. Logs attached.',
  'Step 3 fails.\nThe lock message appears only after a second click.\nSee attached screenshot for the console error.',
  'Unexpected redirect to /error after submitting. Seen with a fresh session only. The network tab shows a 302 to /error?code=E-4402 right after the POST completes, which does not match the specification.',
];
export const BLOCK_COMMENTS = [
  'Blocked: test environment is down.',
  'Blocked by a missing test account for this region.',
  'Blocked: depends on the payment sandbox, which is rate-limited.',
  'Blocked until the feature flag is enabled in staging.',
];
export const RETEST_COMMENTS = ['Fixed in the latest build, needs another pass.', 'Please retest after the hotfix is deployed.'];
export const PASS_COMMENTS = ['Looks good.', 'Verified on Chrome and Firefox.', 'Matches the specification.', 'No issues found.'];

export const VERSION_NOTES = [
  'Clarified the expected result', 'Added a missing step', 'Updated for the new design', 'Fixed a typo in step 2',
  'Reordered steps to match the UI', 'Tightened the title', 'Raised priority after an escaped defect',
];
