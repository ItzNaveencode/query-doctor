const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const apiRoutes = require('./api/routes');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, error: 'Too many requests, please try again later.' }
});

app.use(cors());
app.use(express.json());

// Mount the API routes
app.use('/api', limiter, apiRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'QueryDoctor API' });
});

// Global Error Handler for clean JSON responses
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err.message);
  res.status(500).json({
    success: false,
    error: 'An internal server error occurred.'
  });
});

app.listen(PORT, () => {
  console.log("🩺 QueryDoctor API running on http://localhost:" + PORT);
});
