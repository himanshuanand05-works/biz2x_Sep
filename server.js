const express = require('express');
const path = require('path');

// Initialize Express application
const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// 1. GLOBAL MIDDLEWARE SETUP
// ==========================================
// Body parsers
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static UI assets from /public
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// 2. MIDDLEWARE PLACEHOLDERS (Imported from /src)
// ==========================================
const authGuard = (req, res, next) => {
  // TODO: Step 1 - Add user-level tenant isolation logic in /src/middleware/auth.js
  next();
};

const uploadGuard = (req, res, next) => {
  // TODO: Step 2 - Add Multer file size & MIME type validation in /src/middleware/upload.js
  next();
};

const securityGuard = (req, res, next) => {
  // TODO: Step 3 - Add prompt injection & input sanitization in /src/middleware/security.js
  next();
};

// ==========================================
// 3. API ROUTES PLACEHOLDERS (Imported from /src)
// ==========================================

// Health Check Route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', timestamp: new Date() });
});

// Document Upload Route Placeholder
app.post('/api/v1/payslip/upload', authGuard, uploadGuard, (req, res) => {
  // TODO: Step 4 - Implement document upload & OCR processing in /src/controllers/uploadController.js
  res.status(501).json({ message: 'Upload endpoint placeholder' });
});

// Grounded Query & Simulation Route Placeholder
app.post('/api/v1/assistant/query', authGuard, securityGuard, (req, res) => {
  // TODO: Step 5 - Implement tax engine & AI prompt orchestrator in /src/controllers/assistantController.js
  res.status(501).json({ message: 'Assistant query endpoint placeholder' });
});

// ==========================================
// 4. GLOBAL ERROR HANDLER
// ==========================================
app.use((err, req, res, next) => {
  // TODO: Step 6 - Implement centralized error handling in /src/middleware/errorHandler.js
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

// ==========================================
// 5. SERVER BOOTSTRAPPER
// ==========================================
function startServer() {
  // TODO: Step 0 - Add database or cache connection logic here if needed
  
  app.listen(PORT, () => {
    console.log(`===================================================`);
    console.log(`🚀 Financial Wellness Server booting...`);
    console.log(`📡 Listening on http://localhost:${PORT}`);
    console.log(`===================================================`);
  });
}

// Boot application
startServer();