# ParkIQ Testing Strategy

## Test Setup

### Unit Tests (Jest)
```bash
npm install --save-dev jest @testing-library/react @testing-library/jest-dom
```

### Integration Tests
```bash
npm install --save-dev supertest
```

### E2E Tests (Playwright)
```bash
npm install --save-dev @playwright/test
```

## Running Tests

```bash
npm run test                # Unit tests
npm run test:integration    # Integration tests
npm run test:e2e           # E2E tests
npm run test:coverage      # Coverage report
```

## Test Files Structure

```
/services/*/tests/
  ├── unit/
  │   ├── controllers.test.js
  │   ├── models.test.js
  │   └── services.test.js
  ├── integration/
  │   ├── auth.test.js
  │   ├── bookings.test.js
  │   └── payments.test.js
  └── fixtures/
      └── testData.js

/frontend/src/__tests__/
  ├── components/
  ├── pages/
  └── utils/
```

## Example Unit Test

```javascript
// services/user-service/tests/unit/authController.test.js
const request = require('supertest');
const app = require('../../server');
const User = require('../../src/models/User');

describe('Auth Controller', () => {
  describe('POST /api/auth/register', () => {
    it('should create a new user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
    });

    it('should prevent duplicate emails', async () => {
      await User.create({
        name: 'Existing User',
        email: 'test@example.com',
        password: 'password123',
      });

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123',
        });

      expect(res.statusCode).toBe(409);
      expect(res.body.success).toBe(false);
    });
  });
});
```
