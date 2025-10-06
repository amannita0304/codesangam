const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');

// Load env vars
dotenv.config();

const app = express();

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Enable CORS
app.use(cors());

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Test route to verify server is running
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'Municipal Complaint System API is running!',
    timestamp: new Date().toISOString()
  });
});

// Import routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/complaints', require('./routes/complaints'));
app.use('/api/users', require('./routes/users'));
app.use('/api/reports', require('./routes/reports'));

// Enhanced database connection with error handling
const connectDB = async () => {
  try {
    const mongoose = require('mongoose');
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/complaint_system');
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.log('❌ MongoDB connection failed:', error.message);
    console.log('⚠️  Server will start without database connection');
    console.log('💡 To fix: Install MongoDB or use MongoDB Atlas');
  }
};

// Connect to database
connectDB();

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  console.log(`📊 API Available at: http://localhost:${PORT}/api`);
  console.log(`🔑 Auth endpoints: http://localhost:${PORT}/api/auth`);
  console.log(`📝 Complaint endpoints: http://localhost:${PORT}/api/complaints`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log('❌ Unhandled Rejection at:', promise, 'reason:', err);
  // Close server & exit process
  server.close(() => {
    process.exit(1);
  });
});

module.exports = app;