require('dotenv').config();
const express = require('express');
const http = require('http');
const proxy = require('express-http-proxy');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Service URLs
const services = {
  user:    process.env.USER_SERVICE_URL    || 'http://localhost:3001',
  parking: process.env.PARKING_SERVICE_URL || 'http://localhost:3002',
  booking: process.env.BOOKING_SERVICE_URL || 'http://localhost:3003',
  pricing: process.env.PRICING_SERVICE_URL || 'http://localhost:3004',
  payment: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3005',
};

// Security
app.use(helmet());
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    // and any localhost port for local development
    try {
      if (!origin || /^http:\/\/localhost:\d+$/.test(origin)) {
        return callback(null, true);
      }

      const allowed = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()) : [];
      // Support wildcard entry
      if (allowed.includes('*')) {
        console.debug('[CORS] Allowing origin (wildcard):', origin);
        return callback(null, true);
      }

      if (allowed.includes(origin)) {
        console.debug('[CORS] Allowing origin:', origin);
        return callback(null, true);
      }

      // Don't throw here - return false so CORS middleware responds gracefully
      console.warn('[CORS] Rejecting origin:', origin, 'Allowed:', allowed);
      return callback(null, false);
    } catch (err) {
      console.error('[CORS] Origin check error:', err);
      return callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id', 'x-user-role'],
}));

// Logging
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      // Allow localhost on any port + configured origins
      if (!origin || /^https?:\/\/localhost(:\d+)?$/.test(origin)) {
        callback(null, true);
      } else {
        const allowed = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [];
        if (allowed.indexOf(origin) !== -1) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      }
    },
    credentials: true,
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'],
  pingInterval: 25000,
  pingTimeout: 60000,
});

io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);
  socket.emit('connected', {
    message: 'ParkIQ real-time channel connected',
    timestamp: new Date().toISOString(),
  });

  socket.on('support:join', ({ ticketId }) => {
    if (ticketId) {
      socket.join(`support:${ticketId}`);
      socket.emit('support:joined', { ticketId, connected: true });
    }
  });

  socket.on('support:leave', ({ ticketId }) => {
    if (ticketId) {
      socket.leave(`support:${ticketId}`);
    }
  });

  socket.on('support:typing', ({ ticketId, senderName, isTyping }) => {
    if (ticketId) {
      socket.to(`support:${ticketId}`).emit('support:typing', {
        ticketId,
        senderName,
        isTyping: !!isTyping,
      });
    }
  });

  socket.on('support:read', ({ ticketId, userId, role }) => {
    if (ticketId) {
      socket.to(`support:${ticketId}`).emit('support:read', {
        ticketId,
        userId,
        role,
      });
    }
  });

  socket.on('disconnect', (reason) => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id} (reason: ${reason})`);
  });

  socket.on('error', (error) => {
    console.error(`[Socket.IO] Error on socket ${socket.id}:`, error);
  });
});

// Global rate limiter
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { success: false, message: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

// Auth route rate limiter (stricter)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many auth attempts. Try again in 15 minutes.' },
});

// ─── Health ───────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'api-gateway',
    status: 'healthy',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    services,
  });
});

// ─── Service Registry ─────────────────────────────────────
app.get('/api/services', (req, res) => {
  res.json({ success: true, data: services });
});

app.post('/api/realtime/broadcast', express.json(), (req, res) => {
  const internalSecret = req.headers['x-internal-secret'];
  if (internalSecret !== (process.env.INTERNAL_API_SECRET || 'parkiq-internal-secret')) {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }

  const { event, payload = {} } = req.body || {};
  if (!event) {
    return res.status(400).json({ success: false, message: 'event is required.' });
  }

  if (payload.ticketId && event !== 'support:ticket-created') {
    io.to(`support:${payload.ticketId}`).emit(event, payload);
  } else {
    io.emit(event, payload);
  }
  res.json({ success: true, message: 'Broadcast sent.', event });
});

// ─── Proxy Options ────────────────────────────────────────
const proxyOptions = (targetPath) => ({
  proxyReqPathResolver: (req) => {
    const resolvedPath = targetPath + req.url;
    console.log(`[Gateway] → ${req.method} ${req.originalUrl} → ${resolvedPath}`);
    return resolvedPath;
  },
  proxyErrorHandler: (err, res, next) => {
    console.error(`[Gateway] Proxy error: ${err.message}`);
    res.status(503).json({
      success: false,
      message: 'Service temporarily unavailable. Please try again.',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  },
  parseReqBody: true,
  limit: '10mb',
});

// ─── Route Proxies ────────────────────────────────────────

// User Service
app.use('/api/auth', authLimiter, proxy(services.user, proxyOptions('/api/auth')));
app.use('/api/loyalty', proxy(services.user, proxyOptions('/api/loyalty')));
  app.use('/api/support', proxy(services.user, proxyOptions('/api/support')));

// Parking Service
app.use('/api/parking', proxy(services.parking, proxyOptions('/api/parking')));

// Booking Service
app.use('/api/bookings', proxy(services.booking, proxyOptions('/api/bookings')));

// Pricing Service
app.use('/api/pricing', proxy(services.pricing, proxyOptions('/api/pricing')));

// Payment Service
app.use('/api/payments', proxy(services.payment, proxyOptions('/api/payments')));

// ─── Admin aggregation endpoint ───────────────────────────
const axios = require('axios');

app.get('/api/admin/dashboard', async (req, res) => {
  try {
    const [parkingStats, bookingStats, revenueStats] = await Promise.allSettled([
      axios.get(`${services.parking}/api/parking/stats`, { timeout: 4000 }),
      axios.get(`${services.booking}/api/bookings/admin/stats`, { timeout: 4000 }),
      axios.get(`${services.payment}/api/payments/admin/revenue`, { timeout: 4000 }),
    ]);

    res.json({
      success: true,
      data: {
        parking: parkingStats.status === 'fulfilled' ? parkingStats.value.data.data : null,
        bookings: bookingStats.status === 'fulfilled' ? bookingStats.value.data.data : null,
        revenue: revenueStats.status === 'fulfilled' ? revenueStats.value.data.data : null,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to aggregate dashboard data.' });
  }
});

// ─── 404 ──────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found.`,
    availableRoutes: [
      'GET  /health',
      'GET  /api/services',
      'GET  /api/admin/dashboard',
      'ALL  /api/auth/*',
      'ALL  /api/loyalty/*',
      'ALL  /api/support/*',
      'ALL  /api/parking/*',
      'ALL  /api/bookings/*',
      'ALL  /api/pricing/*',
      'ALL  /api/payments/*',
    ],
  });
});

// ─── Error Handler ────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Gateway]', err.stack);
  res.status(500).json({ success: false, message: 'Gateway error.' });
});

const srv = server.listen(PORT, () => {
  console.log(`\n🌐 ParkIQ API Gateway running on port ${PORT}`);
  console.log(`   http://localhost:${PORT}/health`);
  console.log('\n📡 Routing to:');
  Object.entries(services).forEach(([name, url]) => console.log(`   /api/${name === 'user' ? 'auth' : name}/* → ${url}`));
  console.log(`   /api/loyalty/* → ${services.user}`);
  console.log(`   /api/support/* → ${services.user}`);
  console.log('   Socket.IO real-time broadcasts enabled');
  console.log();
});

srv.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error(`[Gateway] Port ${PORT} is already in use. Is another instance running?`);
    process.exit(1);
  }
  console.error('[Gateway] Server error', err);
  process.exit(1);
});

module.exports = app;
 
