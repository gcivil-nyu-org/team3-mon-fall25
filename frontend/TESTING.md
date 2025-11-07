# Frontend Testing Guide

This document provides comprehensive information about the testing setup and practices for the NYU Marketplace frontend application.

## Table of Contents

- [Overview](#overview)
- [Testing Stack](#testing-stack)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Test Structure](#test-structure)
- [Best Practices](#best-practices)
- [Common Patterns](#common-patterns)
- [Troubleshooting](#troubleshooting)

## Overview

The NYU Marketplace frontend uses **Vitest** and **React Testing Library** for unit and integration testing. This combination provides:

- **Fast test execution** through Vite's native integration
- **Modern testing practices** following React Testing Library's philosophy
- **User-centric tests** that focus on behavior rather than implementation
- **Excellent developer experience** with hot module reloading and UI mode

## Testing Stack

### Core Dependencies

- **Vitest**: Fast, Vite-native test framework with Jest-compatible API
- **React Testing Library**: Testing utilities that encourage good testing practices
- **@testing-library/jest-dom**: Custom matchers for DOM assertions
- **@testing-library/user-event**: Simulate user interactions
- **jsdom**: DOM implementation for Node.js environment

### Configuration

The testing configuration is defined in `vite.config.js`:

```javascript
test: {
  globals: true,           // Use global test functions (describe, it, expect)
  environment: 'jsdom',    // Simulate browser environment
  setupFiles: './src/setupTests.js',
  css: true,
  coverage: {
    provider: 'v8',
    reporter: ['text', 'json', 'html'],
  }
}
```

## Running Tests

### Available Commands

```bash
# Run tests in watch mode (default)
npm test

# Run tests with visual UI
npm run test:ui

# Run tests once (CI mode)
npm run test:run

# Run tests with coverage report
npm run test:coverage
```

### Watch Mode

In watch mode, Vitest will:
- Automatically re-run tests when files change
- Only run tests affected by your changes
- Provide instant feedback

### UI Mode

The UI mode provides a visual interface to:
- Browse and filter tests
- View test results and coverage
- Debug failing tests
- Inspect component renders

To use UI mode:
```bash
npm run test:ui
```
Then open your browser at the provided URL (usually http://localhost:51204/__vitest__/).

### Coverage Reports

Generate coverage reports with:
```bash
npm run test:coverage
```

Coverage reports will be generated in the `coverage/` directory:
- `coverage/index.html`: Interactive HTML report
- Console output: Summary statistics

## Writing Tests

### Basic Test Structure

```javascript
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

### Testing Components with User Interactions

```javascript
import userEvent from '@testing-library/user-event';

it('handles button click', async () => {
  const user = userEvent.setup();
  const handleClick = vi.fn();
  
  render(<Button onClick={handleClick}>Click me</Button>);
  
  await user.click(screen.getByRole('button', { name: /click me/i }));
  
  expect(handleClick).toHaveBeenCalledTimes(1);
});
```

### Testing Components with Context

```javascript
import { AuthProvider } from '../contexts/AuthContext';

const renderWithAuth = (component) => {
  return render(
    <AuthProvider>
      {component}
    </AuthProvider>
  );
};

it('shows user info when authenticated', () => {
  renderWithAuth(<UserProfile />);
  // ... assertions
});
```

### Testing Components with Router

```javascript
import { BrowserRouter } from 'react-router-dom';

const renderWithRouter = (component) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};
```

### Mocking Functions

```javascript
import { vi } from 'vitest';

// Mock a function
const mockFn = vi.fn();

// Mock a module
vi.mock('./api/client', () => ({
  fetchData: vi.fn(() => Promise.resolve({ data: [] }))
}));

// Mock a specific implementation
mockFn.mockImplementation(() => 'mocked value');
mockFn.mockResolvedValue({ data: 'async data' });
```

## Test Structure

### Organizing Tests

Tests are organized using `describe` blocks to group related test cases:

```javascript
describe('ComponentName', () => {
  describe('Rendering', () => {
    it('renders title correctly', () => { /* ... */ });
    it('renders description', () => { /* ... */ });
  });

  describe('User Interactions', () => {
    it('handles click events', async () => { /* ... */ });
    it('submits form data', async () => { /* ... */ });
  });

  describe('Edge Cases', () => {
    it('handles empty data', () => { /* ... */ });
    it('handles errors gracefully', () => { /* ... */ });
  });
});
```

### Test File Naming

Test files follow the naming convention: `ComponentName.test.jsx`

Place test files:
- **Next to the component** (recommended): `ComponentName.jsx` and `ComponentName.test.jsx` in same directory
- **In a `__tests__` directory**: For grouping multiple related tests

## Best Practices

### 1. Test User Behavior, Not Implementation

❌ **Bad**: Testing implementation details
```javascript
expect(component.state.count).toBe(1);
```

✅ **Good**: Testing user-visible behavior
```javascript
expect(screen.getByText('Count: 1')).toBeInTheDocument();
```

### 2. Use Semantic Queries

Priority order for queries (from React Testing Library):
1. `getByRole` - Most accessible and preferred
2. `getByLabelText` - Good for form elements
3. `getByPlaceholderText` - For inputs with placeholders
4. `getByText` - For non-interactive elements
5. `getByTestId` - Last resort

✅ **Good**:
```javascript
screen.getByRole('button', { name: /submit/i })
screen.getByLabelText(/email address/i)
```

❌ **Avoid**:
```javascript
container.querySelector('.submit-button')
```

### 3. Use `userEvent` over `fireEvent`

✅ **Good**: More realistic user interactions
```javascript
const user = userEvent.setup();
await user.click(button);
await user.type(input, 'Hello');
```

❌ **Avoid**: Less realistic
```javascript
fireEvent.click(button);
```

### 4. Wait for Async Operations

```javascript
import { waitFor } from '@testing-library/react';

await waitFor(() => {
  expect(screen.getByText('Data loaded')).toBeInTheDocument();
});
```

### 5. Clean Up Between Tests

This is handled automatically by `setupTests.js`, but be aware of:
- Clearing mocks: `vi.clearAllMocks()` in `beforeEach`
- Restoring mocks: `vi.restoreAllMocks()` in `afterEach`

### 6. Test Accessibility

```javascript
// Ensure elements are accessible
expect(screen.getByRole('button')).toBeInTheDocument();

// Check ARIA attributes
expect(button).toHaveAttribute('aria-label', 'Close dialog');
```

## Common Patterns

### Testing Forms

```javascript
it('submits form with valid data', async () => {
  const user = userEvent.setup();
  const onSubmit = vi.fn();
  
  render(<LoginForm onSubmit={onSubmit} />);
  
  await user.type(screen.getByLabelText(/email/i), 'test@nyu.edu');
  await user.type(screen.getByLabelText(/password/i), 'password123');
  await user.click(screen.getByRole('button', { name: /login/i }));
  
  expect(onSubmit).toHaveBeenCalledWith({
    email: 'test@nyu.edu',
    password: 'password123'
  });
});
```

### Testing API Calls

```javascript
import { vi } from 'vitest';
import * as api from '../api/client';

vi.mock('../api/client');

it('fetches and displays data', async () => {
  api.fetchListings.mockResolvedValue([
    { id: 1, title: 'Test Item' }
  ]);
  
  render(<ListingsPage />);
  
  await waitFor(() => {
    expect(screen.getByText('Test Item')).toBeInTheDocument();
  });
});
```

### Testing Error States

```javascript
it('displays error message on failure', async () => {
  api.fetchData.mockRejectedValue(new Error('Network error'));
  
  render(<DataComponent />);
  
  await waitFor(() => {
    expect(screen.getByText(/error/i)).toBeInTheDocument();
  });
});
```

### Testing Conditional Rendering

```javascript
it('shows different content based on props', () => {
  const { rerender } = render(<StatusBadge status="active" />);
  expect(screen.getByText('Active')).toBeInTheDocument();
  
  rerender(<StatusBadge status="inactive" />);
  expect(screen.getByText('Inactive')).toBeInTheDocument();
});
```

## Troubleshooting

### Common Issues

#### 1. "Not wrapped in act(...)" warnings

This usually means you're not properly awaiting async operations.

**Solution**: Use `waitFor` or `await user.click()`:
```javascript
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument();
});
```

#### 2. "Unable to find element" errors

The element might not be rendered yet or your query might be wrong.

**Solutions**:
- Use `findBy` queries for async elements: `await screen.findByText('Text')`
- Check if the element renders conditionally
- Use `screen.debug()` to see current DOM

#### 3. "Cannot read property of undefined"

Often happens when mocking incorrectly.

**Solution**: Ensure mocks return the expected structure:
```javascript
vi.mock('./api', () => ({
  default: {
    get: vi.fn(() => Promise.resolve({ data: [] }))
  }
}));
```

#### 4. Tests pass individually but fail together

State or mocks aren't being cleaned up between tests.

**Solution**: Clear mocks in `beforeEach`:
```javascript
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});
```

### Debugging Tests

```javascript
// Print current DOM
screen.debug();

// Print specific element
screen.debug(screen.getByRole('button'));

// Use logRoles to see available roles
import { logRoles } from '@testing-library/react';
logRoles(container);
```

## Additional Resources

- [React Testing Library Documentation](https://testing-library.com/docs/react-testing-library/intro/)
- [Vitest Documentation](https://vitest.dev/)
- [Testing Library Query Cheatsheet](https://testing-library.com/docs/queries/about/#priority)
- [Common Mistakes with RTL](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

## Contributing

When adding new tests:
1. Follow the existing test structure and patterns
2. Ensure tests are isolated and don't depend on each other
3. Mock external dependencies (API calls, context, etc.)
4. Test both happy paths and edge cases
5. Aim for high coverage but prioritize meaningful tests
6. Write clear, descriptive test names

## Code Coverage Goals

We aim for:
- **Overall coverage**: 80%+
- **Critical paths**: 90%+
- **Utility functions**: 95%+

Remember: **Coverage is a metric, not a goal**. Focus on testing behavior that matters to users.

