import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import cors from 'cors';
import connectDB from './config/db.js';
import routes from './routers/index.js';
import errorHandler from './middleware/errorhanddling.js';
import { initializeSocketIO } from './socket.js';

// Catch unhandled errors to prevent crashes
process.on('uncaughtException', (error) => {
  console.error('💥 UNCAUGHT EXCEPTION:', error);
  // Don't exit - keep the server running
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 UNHANDLED REJECTION at:', promise, 'reason:', reason);
  // Don't exit - keep the server running
});

// Only load .env in development (not in production/Cloud Run)
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
  console.log('📝 Loaded environment from .env file (development mode)');
} else {
  console.log('🚀 Running in production mode - using Cloud environment variables');
}

// ===== DEBUG: Print all important environment variables =====
console.log('========== ENVIRONMENT VARIABLES CHECK ==========');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('MONGO_URI:', process.env.MONGO_URI ? '✅ SET' : '❌ NOT SET');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✅ SET' : '❌ NOT SET');
console.log('GCS_BUCKET_NAME:', process.env.GCS_BUCKET_NAME || '❌ NOT SET');
console.log('GCS_PROJECT_ID:', process.env.GCS_PROJECT_ID || '❌ NOT SET');
console.log('GOOGLE_APPLICATION_CREDENTIALS:', process.env.GOOGLE_APPLICATION_CREDENTIALS || '✅ NOT SET (using default Cloud auth)');
console.log('==============================================');

const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO with CORS
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Initialize Socket.IO handlers (wrap in try-catch for safety)
try {
  initializeSocketIO(io);
  console.log('✅ Socket.IO initialized successfully');
} catch (error) {
  console.error('⚠️ Socket.IO initialization error:', error.message);
  // Continue without Socket.IO if it fails
}

// Make io accessible in routes
app.set('io', io);

app.use(cors({
  origin: "*",
  credentials: true
}));

// Swagger setup
const swaggerOptions = {
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      title: 'IshanTube Admin API',
      version: '1.0.0',
      description: 'API documentation for the IshanTube Admin backend',
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 5000}`,
        description: 'Local Development server',
      },
      {
        url: "https://ishantube-backend-admin-352857787507.asia-south1.run.app",
        description: "Production server (Render)",
      },
    ],

    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: [
    './src/moduls/users/user.router.js',
    './src/moduls/customer/channelPartner.router.js',
    './src/moduls/customer/channelPartnerIncentive.router.js',
    './src/moduls/customer/architect.router.js',
    './src/moduls/customer/party.router.js',
    './src/moduls/customer/site.router.js',
    './src/moduls/Inventory/product.router.js',
    './src/moduls/brand/brand.router.js',
    './src/moduls/Inventory/category.router.js',
    './src/moduls/Inventory/color.router.js',
    './src/moduls/Inventory/series.router.js',
    './src/moduls/company/company.router.js',
  ], // Path to the API docs
};

const swaggerDocs = swaggerJSDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

app.use(express.json()); // Allows parsing of JSON request bodies

// Serve static files from uploads directory
// Commented out - now using Google Cloud Storage
// app.use('/uploads', express.static('uploads'));

// ✅ Root route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🚀 Backend server is running successfully!',
  });
});

app.use('/api', routes);

// Use custom error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

console.log(`🔄 Attempting to start server on port ${PORT}...`);

// Start server first (required for Cloud Run health checks)
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server is LISTENING on 0.0.0.0:${PORT}`);
  console.log(`📄 API docs available at http://localhost:${PORT}/api-docs`);
  console.log(`🔌 Socket.IO server is running and ready for connections`);
  
  // Connect to database after server is listening
  connectDB().catch(err => {
    console.error('⚠️ Failed to connect to MongoDB:', err.message);
    // Don't exit - let the server run even if DB connection fails initially
    // This allows Cloud Run health checks to pass
  });
});

// Add error handler for server startup failures
httpServer.on('error', (error) => {
  console.error('💥 SERVER ERROR:', error);
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use`);
  }
});
