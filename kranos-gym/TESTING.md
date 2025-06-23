# Testing Guide - Kranos Gym Management System

This document provides comprehensive information about the testing infrastructure and best practices for the Kranos Gym Management System.

## Testing Stack

### Unit Testing
- **Framework**: [Vitest](https://vitest.dev/) - Fast unit test framework for Vite projects
- **Environment**: jsdom for DOM simulation
- **Coverage**: v8 provider with HTML, JSON, and text reports

### Component Testing
- **Framework**: [@testing-library/svelte](https://testing-library.com/docs/svelte-testing-library/intro) - Simple and complete testing utilities
- **User Events**: @testing-library/user-event for realistic user interactions
- **Assertions**: @testing-library/jest-dom for enhanced DOM assertions

### End-to-End Testing
- **Framework**: [Playwright](https://playwright.dev/) - Reliable E2E testing for modern web apps
- **Browsers**: Chromium, Firefox, WebKit, and Mobile Chrome/Safari
- **Features**: Screenshots, video recording, trace collection

## Test Scripts

```bash
# Run all unit and component tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage

# Run only component tests
npm run test:component

# Run only unit tests
npm run test:unit

# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Run E2E tests in headed mode
npm run test:e2e:headed

# Run all tests (unit + E2E)
npm run test:all
```

## Project Structure

```
├── src/
│   ├── test/
│   │   ├── setup.js              # Global test setup
│   │   ├── utils.js              # Test utilities and helpers
│   │   └── form-validation.test.js # Cross-component form tests
│   ├── lib/
│   │   └── db/
│   │       └── database.test.js  # Database operation tests
│   └── routes/
│       ├── +layout.test.js       # Layout component tests
│       ├── +page.test.js         # Dashboard tests
│       ├── members/
│       │   └── +page.test.js     # Members page tests
│       ├── plans/
│       │   └── +page.test.js     # Plans page tests
│       └── login/
│           └── +page.test.js     # Login page tests
├── tests/
│   └── e2e/
│       ├── login-workflow.spec.js
│       ├── member-management.spec.js
│       ├── dark-theme.spec.js
│       └── complete-user-journey.spec.js
├── vitest.config.js              # Vitest configuration
└── playwright.config.js          # Playwright configuration
```

## Test Categories

### 1. Unit Tests (`src/lib/db/database.test.js`)

Tests for core business logic and database operations:

- **Database Connection**: Connection establishment and error handling
- **CRUD Operations**: Create, Read, Update, Delete operations for all entities
- **Data Validation**: Input validation and constraint checking
- **Error Handling**: Database errors and network failures
- **Transaction Management**: Database transaction handling

Example:
```javascript
describe('Members Operations', () => {
  it('should create new member', async () => {
    const newMember = {
      name: 'Test User',
      phone: '555-0099',
      email: 'test@test.com'
    };
    
    const result = await database.createMember(newMember);
    expect(result).toBe(3); // New member ID
  });
});
```

### 2. Component Tests

Tests for individual Svelte components and their behavior:

#### Layout Tests (`src/routes/+layout.test.js`)
- Navigation rendering and functionality
- Mobile menu toggle
- Dark theme application
- Responsive behavior

#### Dashboard Tests (`src/routes/+page.test.js`)
- Stats card display
- Loading states
- Quick actions navigation
- Recent activity feed

#### Members Page Tests (`src/routes/members/+page.test.js`)
- Member list display and search
- Form validation and submission
- Member selection and editing
- CRUD operations
- Dark theme styling

#### Plans Page Tests (`src/routes/plans/+page.test.js`)
- Plan list and filtering
- Auto-generated display names
- Form validation
- Currency input handling

#### Login Page Tests (`src/routes/login/+page.test.js`)
- Form validation
- Authentication flow
- Password visibility toggle
- Error handling
- Feature showcase display

Example:
```javascript
describe('Members Page Component', () => {
  it('should filter members by search term', async () => {
    renderComponent(MembersPage);
    
    const searchInput = screen.getByPlaceholderText('Search members...');
    await user.type(searchInput, 'John');
    
    expect(screen.getByText('John Doe')).toBeVisible();
    expect(screen.queryByText('Jane Smith')).not.toBeVisible();
  });
});
```

### 3. Form Validation Tests (`src/test/form-validation.test.js`)

Comprehensive tests for form behavior across components:

- **Field Validation**: Required fields, email format, numeric constraints
- **Submission Handling**: Success and error scenarios
- **Loading States**: Form disabling during submission
- **Accessibility**: Labels, ARIA attributes, semantic HTML
- **State Management**: Form reset, data persistence

Example:
```javascript
describe('Form Validation and Submission Tests', () => {
  it('should validate email format', async () => {
    const emailInput = screen.getByPlaceholderText('Enter email address');
    await user.type(emailInput, 'invalid-email');
    
    expect(emailInput.validity.valid).toBe(false);
  });
});
```

### 4. End-to-End Tests

#### Login Workflow (`tests/e2e/login-workflow.spec.js`)
- Complete login process
- Form validation
- Error handling
- Password visibility
- Responsive behavior

#### Member Management (`tests/e2e/member-management.spec.js`)
- Full CRUD workflow
- Search and filtering
- Form submission
- Mobile responsiveness

#### Dark Theme (`tests/e2e/dark-theme.spec.js`)
- CSS variable application
- Theme consistency across pages
- Gradient and glow effects
- Responsive theme behavior

#### Complete User Journey (`tests/e2e/complete-user-journey.spec.js`)
- End-to-end workflow from login to data management
- Navigation between pages
- Data persistence
- Error recovery
- Accessibility testing

Example:
```javascript
test('complete gym management workflow', async ({ page }) => {
  // 1. Login
  await page.goto('/login');
  await page.getByLabel('Username').fill('admin');
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: /sign in/i }).click();
  
  // 2. Navigate to members
  await page.getByRole('link', { name: /members/i }).click();
  
  // 3. Add new member
  await page.getByPlaceholder('Enter member name').fill('Test User');
  // ... continue workflow
});
```

## Test Utilities

### Mock Functions (`src/test/utils.js`)

- **renderComponent**: Enhanced Svelte component rendering with SvelteKit store mocking
- **mockFetch**: Comprehensive fetch mocking with predefined responses
- **mockData**: Sample data for all entities (members, plans, memberships)
- **waitFor**: Promise-based waiting utilities
- **createMockStore**: Svelte store mocking
- **getThemeVariables**: CSS custom property testing
- **hasThemeClass**: Dark theme validation

Example usage:
```javascript
import { renderComponent, mockFetch, mockData } from '../test/utils.js';

beforeEach(() => {
  mockFetch({
    '/api/members': {
      json: async () => mockData.members,
      ok: true
    }
  });
});

test('should display members', () => {
  renderComponent(MembersPage);
  expect(screen.getByText('John Doe')).toBeInTheDocument();
});
```

## Configuration

### Vitest Configuration (`vitest.config.js`)

```javascript
export default defineConfig({
  plugins: [sveltekit()],
  test: {
    include: ['src/**/*.{test,spec}.{js,ts}'],
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70
        }
      }
    }
  }
});
```

### Playwright Configuration (`playwright.config.js`)

```javascript
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  reporter: [['html'], ['json'], ['junit']],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
    { name: 'Mobile Safari', use: { ...devices['iPhone 12'] } }
  ]
});
```

## Best Practices

### Writing Tests

1. **Descriptive Names**: Use clear, descriptive test names that explain what is being tested
2. **Arrange-Act-Assert**: Structure tests with clear setup, action, and assertion phases
3. **Single Responsibility**: Each test should verify one specific behavior
4. **Mock External Dependencies**: Mock API calls, navigation, and external services
5. **Test User Behavior**: Focus on testing what users do, not implementation details

### Mocking Guidelines

1. **API Calls**: Always mock fetch requests in component tests
2. **Navigation**: Mock SvelteKit navigation functions
3. **External Libraries**: Mock complex external dependencies
4. **File System**: Mock file operations and database access
5. **Time-Dependent Code**: Mock dates and timers for consistent results

### Accessibility Testing

1. **Semantic HTML**: Test for proper use of labels, roles, and ARIA attributes
2. **Keyboard Navigation**: Verify keyboard accessibility
3. **Screen Reader Support**: Test with assistive technology considerations
4. **Color Contrast**: Verify sufficient contrast ratios
5. **Focus Management**: Ensure proper focus handling

### Performance Testing

1. **Loading States**: Test loading indicators and skeleton screens
2. **Error Boundaries**: Verify graceful error handling
3. **Memory Leaks**: Watch for component cleanup
4. **Bundle Size**: Monitor for unnecessary imports
5. **Render Performance**: Test with large datasets

## Continuous Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm run test:coverage
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        with:
          name: coverage-report
          path: coverage/
```

## Coverage Reports

The testing setup generates comprehensive coverage reports:

- **HTML Report**: `coverage/index.html` - Interactive coverage browser
- **JSON Report**: `coverage/coverage-final.json` - Machine-readable coverage data
- **Text Report**: Console output during test runs

### Coverage Thresholds

- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%
- **Statements**: 70%

## Troubleshooting

### Common Issues

1. **Tests Timing Out**: Increase timeout values or fix async operations
2. **Mock Not Working**: Ensure mocks are set up before component rendering
3. **SvelteKit Store Errors**: Use proper store mocking in test utilities
4. **CSS Variables Not Available**: Ensure proper setup in test environment
5. **Playwright Browser Issues**: Install browsers with `npx playwright install`

### Debug Mode

```bash
# Run single test file
npm run test src/routes/members/+page.test.js

# Debug with browser tools
npm run test:ui

# Playwright debug mode
npm run test:e2e -- --debug

# Headed mode for visual debugging
npm run test:e2e:headed
```

## Contributing

When adding new features:

1. **Write Tests First**: Follow TDD principles
2. **Test Edge Cases**: Include error scenarios and edge cases
3. **Update Documentation**: Keep this guide updated
4. **Maintain Coverage**: Ensure coverage thresholds are met
5. **Review Test Quality**: Focus on test maintainability and clarity

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library Documentation](https://testing-library.com/)
- [Playwright Documentation](https://playwright.dev/)
- [Svelte Testing Handbook](https://testing-library.com/docs/svelte-testing-library/intro)
- [Jest DOM Matchers](https://github.com/testing-library/jest-dom)