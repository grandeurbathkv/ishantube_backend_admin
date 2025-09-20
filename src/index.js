import express from 'express';
import dotenv from 'dotenv';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import cors from 'cors';
import connectDB from './config/db.js';
import routes from './routers/index.js';
import errorHandler from './middleware/errorhanddling.js';

dotenv.config();
connectDB();

const app = express();

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
        url: "https://ishantube-backend-admin.onrender.com",
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
  apis: ['./src/moduls/users/user.router.js', './src/moduls/customer/channelPartner.router.js', './src/moduls/customer/architect.router.js', './src/moduls/customer/party.router.js', './src/moduls/customer/site.router.js'], // Path to the API docs
};

const swaggerDocs = swaggerJSDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

app.use(express.json()); // Allows parsing of JSON request bodies

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'));

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
app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
  console.log(`📄 API docs available at http://localhost:${PORT}/api-docs`);
});
