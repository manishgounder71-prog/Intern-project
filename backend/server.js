import './polyfills.js';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRouter from './routes/api.js';
import { initSocketService } from './services/socket.io.js';
import { errorHandler } from './middleware/errorHandler.js';
import { MongoMemoryServer } from 'mongodb-memory-server';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: path.resolve(import.meta.dirname, '.env') });

process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('⚠️ Uncaught Exception:', error);
});

const app = express();
const server = http.createServer(app);

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';

const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }
});

// Configure Middlewares
app.use(cors({ origin: ALLOWED_ORIGIN }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploads
app.use('/uploads', express.static('uploads'));

// Bind API routes
app.use('/api', apiRouter);

// Root test route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to the StudyGen AI API Gateway.',
    status: 'online',
    timestamp: new Date()
  });
});

// Init Socket Services
initSocketService(io);

// Global Error Handler
app.use(errorHandler);

// Connect to MongoDB & Start Server
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/studygen_ai';

const startServer = () => {
  server.listen(PORT, () => {
    console.log(`🚀 StudyGen-AI Backend running on http://localhost:${PORT}`);
  });
};

mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 })
  .then(() => {
    console.log('✅ Connected to MongoDB Database.');
    startServer();
  })
  .catch(async (error) => {
    console.warn('⚠️ MongoDB connection failed:', error.message);
    console.warn('⚠️ Attempting persistent fallback database server...');
    try {
      const dbPath = path.resolve(import.meta.dirname, '../database/db_data');
      if (!fs.existsSync(dbPath)) {
        fs.mkdirSync(dbPath, { recursive: true });
      }
      const mongoServer = await MongoMemoryServer.create({
        instance: {
          dbPath: dbPath,
          storageEngine: 'wiredTiger'
        }
      });
      const persistentUri = mongoServer.getUri();
      console.log(`ℹ️ Persistent fallback MongoDB Server booted at: ${persistentUri}`);
      
      await mongoose.connect(persistentUri);
      console.log('✅ Connected to Persistent fallback MongoDB Database.');
      startServer();
    } catch (inMemoryError) {
      console.error('❌ Failed to establish database connection:', inMemoryError);
      process.exit(1);
    }
  });
