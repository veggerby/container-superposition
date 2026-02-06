# Playwright Overlay

Browser automation and end-to-end testing framework with support for Chromium, Firefox, and WebKit.

## Features

- **Multi-browser support** - Chromium, Firefox, and WebKit (Safari)
- **Headless and headed modes** - Run with or without visible browser
- **Auto-wait** - Automatically waits for elements to be ready
- **Network interception** - Mock API responses and intercept requests
- **Screenshots and videos** - Capture test execution
- **Mobile emulation** - Test responsive designs
- **Parallel execution** - Run tests concurrently
- **Codegen** - Generate tests by recording browser interactions
- **VS Code Extension:** Playwright Test for VS Code (ms-playwright.playwright)

## Getting Started

Playwright is typically used with a programming language. Select appropriate overlay:
- **nodejs** - For JavaScript/TypeScript (most common)
- **python** - For Python
- **dotnet** - For C#

### Installation

#### JavaScript/TypeScript (requires nodejs overlay)

```bash
# Install Playwright
npm init playwright@latest

# Or add to existing project
npm install -D @playwright/test
npx playwright install --with-deps
```

#### Python (requires python overlay)

```bash
# Install Playwright
pip install playwright

# Install browsers
playwright install --with-deps
```

#### .NET (requires dotnet overlay)

```bash
# Create test project
dotnet new nunit -n PlaywrightTests
cd PlaywrightTests

# Install Playwright
dotnet add package Microsoft.Playwright.NUnit
dotnet build

# Install browsers
pwsh bin/Debug/net8.0/playwright.ps1 install --with-deps
```

## Common Commands

### Running Tests (JavaScript/TypeScript)

```bash
# Run all tests
npx playwright test

# Run tests in headed mode
npx playwright test --headed

# Run specific test file
npx playwright test tests/login.spec.ts

# Run tests in specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit

# Run tests in debug mode
npx playwright test --debug

# Run with UI mode (interactive)
npx playwright test --ui

# Run specific test by name
npx playwright test -g "should login"
```

### Code Generation (Codegen)

```bash
# Generate test by recording interactions
npx playwright codegen

# Generate test for specific URL
npx playwright codegen https://example.com

# Generate with specific browser
npx playwright codegen --browser=firefox https://example.com

# Generate with mobile emulation
npx playwright codegen --device="iPhone 13" https://example.com

# Generate with authentication
npx playwright codegen --save-storage=auth.json https://example.com
```

### Debugging

```bash
# Debug tests with Playwright Inspector
npx playwright test --debug

# Debug specific test
npx playwright test tests/login.spec.ts --debug

# Show browser while running
npx playwright test --headed --slow-mo=1000

# Pause test execution
# Add await page.pause() in your test code
```

### Reports

```bash
# Show last test report
npx playwright show-report

# Generate HTML report
npx playwright test --reporter=html

# Generate JUnit XML report
npx playwright test --reporter=junit

# Multiple reporters
npx playwright test --reporter=list,html,json
```

### Browser Management

```bash
# Install all browsers
npx playwright install

# Install with system dependencies
npx playwright install --with-deps

# Install specific browser
npx playwright install chromium
npx playwright install firefox
npx playwright install webkit

# Update browsers
npx playwright install
```

## Writing Tests

### Basic Test (JavaScript/TypeScript)

**tests/example.spec.ts:**
```typescript
import { test, expect } from '@playwright/test';

test('homepage has title', async ({ page }) => {
  // Navigate to URL
  await page.goto('https://playwright.dev/');

  // Assert title contains text
  await expect(page).toHaveTitle(/Playwright/);
});

test('get started link works', async ({ page }) => {
  await page.goto('https://playwright.dev/');

  // Click the get started link
  await page.getByRole('link', { name: 'Get started' }).click();

  // Verify URL
  await expect(page).toHaveURL(/.*intro/);
});
```

### Interacting with Elements

```typescript
import { test, expect } from '@playwright/test';

test('form submission', async ({ page }) => {
  await page.goto('https://example.com/form');

  // Fill input fields
  await page.fill('#username', 'john.doe');
  await page.fill('#password', 'secret123');

  // Click button
  await page.click('button[type="submit"]');

  // Wait for navigation
  await page.waitForURL('**/dashboard');

  // Assert success message
  await expect(page.locator('.success-message')).toBeVisible();
});
```

### API Testing

```typescript
import { test, expect } from '@playwright/test';

test('API test', async ({ request }) => {
  // GET request
  const response = await request.get('https://api.example.com/users');
  expect(response.ok()).toBeTruthy();
  expect(response.status()).toBe(200);

  const users = await response.json();
  expect(users).toHaveLength(10);

  // POST request
  const newUser = await request.post('https://api.example.com/users', {
    data: {
      name: 'John Doe',
      email: 'john@example.com'
    }
  });
  expect(newUser.status()).toBe(201);
});
```

### Screenshots and Videos

```typescript
test('take screenshot', async ({ page }) => {
  await page.goto('https://example.com');
  
  // Screenshot full page
  await page.screenshot({ path: 'screenshot.png', fullPage: true });

  // Screenshot element
  const element = page.locator('.hero');
  await element.screenshot({ path: 'element.png' });
});
```

**Enable video recording in playwright.config.ts:**
```typescript
export default defineConfig({
  use: {
    video: 'on',  // 'on' | 'off' | 'retain-on-failure' | 'on-first-retry'
    screenshot: 'only-on-failure',
  },
});
```

### Network Interception

```typescript
test('mock API response', async ({ page }) => {
  // Intercept API call
  await page.route('**/api/users', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 1, name: 'Mocked User' }
      ])
    });
  });

  await page.goto('https://example.com');
  // Page will receive mocked data instead of real API
});

test('block images', async ({ page }) => {
  // Block all image requests
  await page.route('**/*.{png,jpg,jpeg,gif}', route => route.abort());
  
  await page.goto('https://example.com');
});
```

### Mobile Emulation

```typescript
import { test, devices } from '@playwright/test';

test.use({
  ...devices['iPhone 13'],
});

test('mobile test', async ({ page }) => {
  await page.goto('https://example.com');
  
  // Test is running in iPhone 13 viewport
  const isMobile = await page.evaluate(() => window.innerWidth < 768);
  expect(isMobile).toBeTruthy();
});
```

## Configuration

### playwright.config.ts

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // Test directory
  testDir: './tests',

  // Maximum time one test can run
  timeout: 30 * 1000,

  // Run tests in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Workers for parallel execution
  workers: process.env.CI ? 1 : undefined,

  // Reporter
  reporter: 'html',

  // Shared settings for all projects
  use: {
    // Base URL
    baseURL: 'http://localhost:3000',

    // Collect trace on failure
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'retain-on-failure',
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 13'] },
    },
  ],

  // Run local dev server before tests
  webServer: {
    command: 'npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

## Use Cases

### End-to-End Testing
- Test complete user workflows
- Verify critical paths work correctly
- Regression testing

### Cross-Browser Testing
- Test on Chromium, Firefox, and WebKit
- Ensure consistent behavior across browsers
- Mobile and desktop testing

### Visual Regression Testing
- Compare screenshots against baselines
- Detect unintended UI changes
- Pixel-perfect validation

### API Testing
- Test REST APIs without UI
- Validate response structures
- Mock external services

### Performance Testing
- Measure page load times
- Track network requests
- Monitor resource usage

## Authentication

### Reusing Authentication State

```typescript
// global-setup.ts
import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Login
  await page.goto('https://example.com/login');
  await page.fill('#username', 'admin');
  await page.fill('#password', 'password');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard');
  
  // Save storage state
  await page.context().storageState({ path: 'auth.json' });
  await browser.close();
}

export default globalSetup;
```

**Use in tests:**
```typescript
import { test } from '@playwright/test';

test.use({ storageState: 'auth.json' });

test('authenticated test', async ({ page }) => {
  // Already logged in
  await page.goto('https://example.com/dashboard');
});
```

## Visual Comparison

```bash
# Install visual comparison plugin
npm install -D @playwright/test

# Take baseline screenshots
npx playwright test --update-snapshots

# Run visual tests
npx playwright test
```

```typescript
test('visual regression', async ({ page }) => {
  await page.goto('https://example.com');
  
  // Compare screenshot with baseline
  await expect(page).toHaveScreenshot('homepage.png');
  
  // Compare element
  await expect(page.locator('.header')).toHaveScreenshot('header.png');
});
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Playwright Tests
on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright Browsers
        run: npx playwright install --with-deps
      
      - name: Run Playwright tests
        run: npx playwright test
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
```

## Troubleshooting

### Browser installation fails

```bash
# Install with system dependencies
npx playwright install --with-deps

# Install specific browser
npx playwright install chromium

# Clear cache and reinstall
rm -rf ~/.cache/ms-playwright
npx playwright install
```

### Tests timeout

```typescript
// Increase timeout in config
export default defineConfig({
  timeout: 60 * 1000, // 60 seconds
});

// Or per test
test('slow test', async ({ page }) => {
  test.setTimeout(60000);
  await page.goto('https://slow-site.com');
});
```

### Element not found

```typescript
// Wait for element
await page.waitForSelector('.my-element');

// Use auto-waiting locators
await page.locator('.my-element').click();

// Check if element exists
const exists = await page.locator('.my-element').count() > 0;
```

### Screenshots not working in headless mode

Headless mode is the default and supports screenshots. If issues occur:

```typescript
// Run in headed mode for debugging
npx playwright test --headed

// Ensure screenshot directory exists
await page.screenshot({ path: 'screenshots/test.png' });
```

## Best Practices

1. **Use auto-waiting locators** - Prefer `page.locator()` over `page.$`
2. **Avoid sleeps** - Use `waitForSelector` instead of fixed delays
3. **Use meaningful assertions** - Make tests easy to understand
4. **Keep tests independent** - Each test should run in isolation
5. **Use Page Object Model** - Organize selectors and actions
6. **Parallelize tests** - Speed up execution with workers
7. **Use test fixtures** - Share setup/teardown code
8. **Record failures** - Enable video/screenshots on failure
9. **Mock external services** - Keep tests fast and reliable
10. **Version control test data** - Use fixtures for consistent data

## Page Object Model Example

```typescript
// pages/login-page.ts
export class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/login');
  }

  async login(username: string, password: string) {
    await this.page.fill('#username', username);
    await this.page.fill('#password', password);
    await this.page.click('button[type="submit"]');
  }
}

// tests/login.spec.ts
import { test } from '@playwright/test';
import { LoginPage } from '../pages/login-page';

test('login', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login('admin', 'password');
});
```

## Related Overlays

- **nodejs** - Required for JavaScript/TypeScript Playwright
- **python** - Required for Python Playwright
- **dotnet** - Required for C# Playwright
- **docker-sock/docker-in-docker** - For testing containerized apps

## Additional Resources

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Playwright API Reference](https://playwright.dev/docs/api/class-playwright)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Playwright GitHub Repository](https://github.com/microsoft/playwright)
- [Example Projects](https://playwright.dev/docs/examples)
