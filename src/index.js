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

// Only load .env in development
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
  console.log('📝 Loaded environment from .env file (development mode)');
} else {
  console.log('🚀 Running in production mode - using environment variables');
}

// ===== DEBUG: Print all important environment variables =====
console.log('========== ENVIRONMENT VARIABLES CHECK ==========');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('MONGO_URI:', process.env.MONGO_URI ? '✅ SET' : '❌ NOT SET');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✅ SET' : '❌ NOT SET');
console.log('AWS_S3_BUCKET_NAME:', process.env.AWS_S3_BUCKET_NAME || '❌ NOT SET');
console.log('AWS_REGION:', process.env.AWS_REGION || '❌ NOT SET');
console.log('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? '✅ SET' : '❌ NOT SET');
console.log('AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? '✅ SET' : '❌ NOT SET');
console.log('==============================================');

connectDB();

const app = express();
const httpServer = createServer(app);

// Allowed origins for CORS
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:5174",
  "https://grandeurbath.in",
  "https://www.grandeurbath.in",
  "https://admin.grandeurbath.in",
  "https://api.backendgrandeurbath.in"
];

// Initialize Socket.IO with CORS
const io = new Server(httpServer, {
  cors: {
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true
  }
});

// Initialize Socket.IO handlers
initializeSocketIO(io);

// Make io accessible in routes
app.set('io', io);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, server-to-server)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS policy: Origin ${origin} not allowed`));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  credentials: true,
  optionsSuccessStatus: 200
}));

// Handle preflight OPTIONS requests explicitly
app.options('*', cors());

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
// Commented out - now using AWS S3 Storage
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
httpServer.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
  console.log(`📄 API docs available at http://localhost:${PORT}/api-docs`);
  console.log(`🔌 Socket.IO server is running and ready for connections`);
});
