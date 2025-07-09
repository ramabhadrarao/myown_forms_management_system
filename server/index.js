import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Import routes
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import formsRoutes from './routes/forms.js';
import responsesRoutes from './routes/responses.js';
import usersRoutes from './routes/users.js';
import quizzesRoutes from './routes/quizzes.js';

// Import utilities
import { createDefaultAdmin } from './utils/createAdmin.js';

dotenv.config();

// Ensure JWT_SECRET is available
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'development_jwt_secret_key_12345_make_this_random_in_production';
  console.log('Using fallback JWT_SECRET for development');
}

const app = express();
const PORT = process.env.PORT || 3001;

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/forms', formsRoutes);
app.use('/api/responses', responsesRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/quizzes', quizzesRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!', 
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error' 
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/forms-app')
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Create default admin user
    await createDefaultAdmin();
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  });

export default app;