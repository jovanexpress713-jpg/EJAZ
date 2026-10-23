import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Database } from './src/server/database';
import { authRouter } from './src/server/routes/authRoutes';
import { usersRouter } from './src/server/routes/usersRoutes';
import { tripsRouter } from './src/server/routes/tripsRoutes';
import { customersRouter } from './src/server/routes/customersRoutes';
import { driversRouter } from './src/server/routes/driversRoutes';
import { trucksRouter } from './src/server/routes/trucksRoutes';
import { financeRouter } from './src/server/routes/financeRoutes';
import { syncRouter } from './src/server/routes/syncRoutes';
import { auditRouter } from './src/server/routes/auditRoutes';
import { backupRouter } from './src/server/routes/backupRoutes';
import { settingsRouter } from './src/server/routes/settingsRoutes';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const isProduction = process.env.NODE_ENV === 'production';

  // Initialize central database
  Database.initialize();

  // Middleware
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // CORS headers
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // Health API
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({
      status: 'UP',
      system: 'EJAZ Logistics ERP Central Server',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      databaseSequence: Database.get().sequence,
    });
  });

  // Mount API Routes
  app.use('/api/auth', authRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/trips', tripsRouter);
  app.use('/api/customers', customersRouter);
  app.use('/api/drivers', driversRouter);
  app.use('/api/trucks', trucksRouter);
  app.use('/api/finance', financeRouter);
  app.use('/api/sync', syncRouter);
  app.use('/api/audit-logs', auditRouter);
  app.use('/api/backup', backupRouter);
  app.use('/api/settings', settingsRouter);

  // Error handling for API routes
  app.use('/api', (err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('API Error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'خطأ غير متوقع في خادم النظام',
    });
  });

  // Client Application Serving
  if (isProduction || fs.existsSync(path.resolve(__dirname, 'dist/index.html'))) {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    // Mount Vite dev server in middleware mode
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 EJAZ Logistics ERP Full-Stack Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal Server Boot Error:', err);
  process.exit(1);
});
