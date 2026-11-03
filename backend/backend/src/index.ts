import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { errorHandler } from './middleware/error-handler';
import incidentRoutes from './routes/incident.routes';
import departmentRoutes from './routes/department.routes';
import aiRoutes from './routes/ai.routes';
import dashboardRoutes from './routes/dashboard.routes';
import assignmentRoutes from './routes/assignment.routes';
import coordinationRoutes from './routes/coordination.routes';
import resourceRoutes from './routes/resource.routes';
import emergencyRoutes from './routes/emergency.routes';
import analyticsRoutes from './routes/analytics.routes';
import predictiveRoutes from './routes/predictive.routes';
import geocodingRoutes from './routes/geocoding.routes';
import { prisma } from './utils/prisma';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];
if (process.env.FRONTEND_ORIGIN) {
  process.env.FRONTEND_ORIGIN.split(',').forEach(o => {
    const trimmed = o.trim();
    if (trimmed && !allowedOrigins.includes(trimmed)) allowedOrigins.push(trimmed);
  });
}

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Static file serving for persistent evidence uploads
const uploadsDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
const evidenceUploadsDir = path.resolve(uploadsDir, 'evidence');
if (!fs.existsSync(evidenceUploadsDir)) {
  fs.mkdirSync(evidenceUploadsDir, { recursive: true });
}

app.use('/uploads', express.static(uploadsDir));
app.use('/api/v1/uploads', express.static(uploadsDir));

// Health Check
app.get('/api/v1/health', async (req: Request, res: Response) => {
  let isConnected = false;
  let incidentCount = 0;
  let departmentCount = 0;
  let dbError: string | null = null;

  try {
    await prisma.$queryRaw`SELECT 1`;
    isConnected = true;
    incidentCount = await prisma.incident.count();
    departmentCount = await prisma.department.count();
  } catch (err: any) {
    isConnected = false;
    dbError = err.message || 'connection failed';
  }

  res.json({
    status: 'OK',
    service: 'CivicOS Node/Express Backend',
    database: {
      status: isConnected ? 'connected' : 'fallback_resilience_store',
      engine: isConnected ? 'PostgreSQL 18.6 (Embedded)' : 'In-Memory Store',
      host: 'localhost:5432',
      database: 'civicos',
      liveIncidentsInDB: incidentCount,
      liveDepartmentsInDB: departmentCount,
      fallbackActive: !isConnected,
      ...(dbError ? { error: dbError } : {})
    },
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0'
  });
});

// Person 4 API Routes
app.use('/api/v1/incidents', incidentRoutes);
app.use('/api/v1/departments', departmentRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/assignment', assignmentRoutes);
app.use('/api/v1/coordination', coordinationRoutes);
app.use('/api/v1/resources', resourceRoutes);
app.use('/api/v1/emergency', emergencyRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/predictive', predictiveRoutes);
app.use('/api/v1/geocoding', geocodingRoutes);

// Centralized Error Handler
app.use(errorHandler);

const server = app.listen(PORT, () => {
  console.log(`🚀 CivicOS Backend running on port ${PORT}`);
});

// Keep process active on Node 25
setInterval(() => {}, 1000 * 60 * 60);

export default app;
