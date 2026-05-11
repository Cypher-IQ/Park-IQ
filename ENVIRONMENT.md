# ParkIQ Environment Configuration

## Backend Services (.env template)

Create `.env` files in each service directory:

### User Service (services/user-service/.env)
```env
PORT=3001
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/parkiq
JWT_SECRET=your_jwt_secret_key_min_32_chars
JWT_EXPIRES_IN=7d

# Email Configuration
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=your_ethereal_email
SMTP_PASS=your_ethereal_password
SMTP_SECURE=false
FRONTEND_URL=http://localhost:5173

# Logging
LOG_LEVEL=info

# External Services
API_GATEWAY_URL=http://localhost:3000
```

### Parking Service (services/parking-service/.env)
```env
PORT=3002
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/parkiq
API_GATEWAY_URL=http://localhost:3000
LOG_LEVEL=info
```

### Booking Service (services/booking-service/.env)
```env
PORT=3003
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/parkiq
API_GATEWAY_URL=http://localhost:3000
PARKING_SERVICE_URL=http://localhost:3002
PRICING_SERVICE_URL=http://localhost:3004
USER_SERVICE_URL=http://localhost:3001
LOG_LEVEL=info

# Email
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=your_ethereal_email
SMTP_PASS=your_ethereal_password
SMTP_SECURE=false
```

### Payment Service (services/payment-service/.env)
```env
PORT=3005
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/parkiq
API_GATEWAY_URL=http://localhost:3000
BOOKING_SERVICE_URL=http://localhost:3003
USER_SERVICE_URL=http://localhost:3001

# Stripe (Optional - for production)
STRIPE_SECRET_KEY=sk_test_placeholder
STRIPE_PUBLIC_KEY=pk_test_placeholder

LOG_LEVEL=info
```

### Pricing Service (services/pricing-service/.env)
```env
PORT=3004
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/parkiq
PARKING_SERVICE_URL=http://localhost:3002
API_GATEWAY_URL=http://localhost:3000
LOG_LEVEL=info
```

### API Gateway (api-gateway/.env)
```env
PORT=3000
NODE_ENV=development

USER_SERVICE_URL=http://localhost:3001
PARKING_SERVICE_URL=http://localhost:3002
BOOKING_SERVICE_URL=http://localhost:3003
PRICING_SERVICE_URL=http://localhost:3004
PAYMENT_SERVICE_URL=http://localhost:3005

ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

## Frontend (.env.local)
```env
VITE_API_URL=http://localhost:3000
VITE_FRONTEND_URL=http://localhost:5173
```

## Production Environment Variables

### Key Security Considerations:
- Use strong JWT secrets (minimum 32 characters)
- Store all secrets in environment variables
- Use production MongoDB URI (Atlas recommended)
- Enable HTTPS only
- Set NODE_ENV=production
- Use real SMTP service (SendGrid, AWS SES, Gmail, etc.)
- Enable rate limiting
- Add CORS restrictions
- Use .env files for secrets (never commit to git)

### Production Email Setup
```env
# Gmail
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# SendGrid
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.xxx...

# AWS SES
SMTP_HOST=email-smtp.region.amazonaws.com
SMTP_PORT=587
SMTP_USER=aws-smtp-username
SMTP_PASS=aws-smtp-password
```

### Production Stripe Setup
```env
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_PUBLIC_KEY=pk_live_xxx
```

## Database Setup

### MongoDB Atlas (Cloud)
1. Create account at mongodb.com
2. Create cluster
3. Get connection string
4. Update MONGODB_URI with connection string

### Local MongoDB
```bash
# Install MongoDB Community Edition
# macOS
brew tap mongodb/brew
brew install mongodb-community

# Linux
sudo apt-get install mongodb

# Start MongoDB
mongod
```

## Docker Setup (Optional)

### docker-compose.yml
```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:latest
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db

  api-gateway:
    build: ./api-gateway
    ports:
      - "3000:3000"
    env_file: ./api-gateway/.env

  user-service:
    build: ./services/user-service
    ports:
      - "3001:3001"
    env_file: ./services/user-service/.env

  parking-service:
    build: ./services/parking-service
    ports:
      - "3002:3002"
    env_file: ./services/parking-service/.env

  booking-service:
    build: ./services/booking-service
    ports:
      - "3003:3003"
    env_file: ./services/booking-service/.env

  pricing-service:
    build: ./services/pricing-service
    ports:
      - "3004:3004"
    env_file: ./services/pricing-service/.env

  payment-service:
    build: ./services/payment-service
    ports:
      - "3005:3005"
    env_file: ./services/payment-service/.env

  frontend:
    build: ./frontend
    ports:
      - "5173:5173"
    env_file: ./frontend/.env.local

volumes:
  mongodb_data:
```

Run with: `docker-compose up`
