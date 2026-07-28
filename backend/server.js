const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const db = require('./config/db');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');
const orderRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');
const paymentRoutes = require('./routes/payments');

const app = express();
const PORT = process.env.PORT || 5000;

// Security Middlewares
app.use(helmet({
  crossOriginResourcePolicy: false // Allows loading images from external URLs in local testing
}));

// CORS Configuration
app.use(cors({
  origin: '*', // For local development, allow any origin. In production, specify frontend domain.
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Routes Registration
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentRoutes);

// Simple Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'UP',
    database: db.getDbType(),
    timestamp: new Date()
  });
});

// Serve Static Uploads/Assets if needed (e.g., product images)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Centralized Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Ocurrió un error interno en el servidor.',
    error: process.env.NODE_ENV === 'development' ? err.stack : {}
  });
});

// Initialize database, then start listening
async function startServer() {
  try {
    await db.initDb();
    
    // Auto-create SQLite directory or DB initialize check
    if (db.getDbType() === 'sqlite') {
      const sqliteInstance = db.getSqliteInstance();
      // Validate tables exist
      sqliteInstance.get("SELECT name FROM sqlite_master WHERE type='table' AND name='users'", async (err, row) => {
        if (err) {
          console.error('SQLite tables check failed:', err.message);
        } else if (!row) {
          console.log('No user table found. Initializing tables and seeding database...');
          const initDbScript = require('./db-init');
          try {
            await initDbScript();
          } catch (initErr) {
            console.error('Autoseed database failed:', initErr);
          }
        }
      });
    }

    app.listen(PORT, () => {
      console.log(`caVani Backend API Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Failed to initialize database and server:', error);
    process.exit(1);
  }
}

startServer();
