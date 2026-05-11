require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const pricingRoutes = require('./src/routes/pricingRoutes');

const app = express();
const PORT = process.env.PORT || 3004;

app.use(helmet());
app.use(cors());
app.use(express.json());
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

app.get('/health', (req, res) =>
  res.json({ success: true, service: 'pricing-service', status: 'healthy', timestamp: new Date().toISOString() })
);

app.use('/api/pricing', pricingRoutes);

app.use((req, res) => res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` }));
app.use((err, req, res, next) => {
  console.error('[pricing-service]', err.stack);
  res.status(err.statusCode || 500).json({ success: false, message: err.message || 'Internal Server Error' });
});

const server = app.listen(PORT, () => {
  console.log(`\n💰 pricing-service running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   API: http://localhost:${PORT}/api/pricing\n`);
});

server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error(`[pricing-service] Port ${PORT} is already in use. Is another instance running?`);
    process.exit(1);
  }
  console.error('[pricing-service] Server error', err);
  process.exit(1);
});

module.exports = app;
