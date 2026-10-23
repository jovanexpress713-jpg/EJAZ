import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Database } from './database';
import { authRouter } from './routes/authRoutes';
import { usersRouter } from './routes/usersRoutes';
import { tripsRouter } from './routes/tripsRoutes';
import { customersRouter } from './routes/customersRoutes';
import { driversRouter } from './routes/driversRoutes';
import { trucksRouter } from './routes/trucksRoutes';
import { financeRouter } from './routes/financeRoutes';
import { syncRouter } from './routes/syncRoutes';
import { auditRouter } from './routes/auditRoutes';
import { backupRouter } from './routes/backupRoutes';
import { settingsRouter } from './routes/settingsRoutes';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

export async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);
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
      database: 'LOCAL_JSON_PERSISTENT',
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
  const distPath = path.resolve(rootDir, 'dist');
  if (isProduction && fs.existsSync(path.join(distPath, 'index.html'))) {
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
    app.use('*', async (req: Request, res: Response, next: NextFunction) => {
      if (req.method !== 'GET') return next();
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve(rootDir, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        if (e instanceof Error) vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  }

  const host = process.env.HOST || '0.0.0.0';
  app.listen(PORT, host, () => {
    console.log(`🚀 EJAZ central server listening on http://${host}:${PORT}`);
    console.log(`📁 Persistent database: ${path.resolve(process.cwd(), 'data', 'ejaz_database.json')}`);
    console.log('🔒 Keep this server on the trusted local network. Do not expose port 3000 directly to the internet.');
  });
}

startServer().catch((err) => {
  console.error('Fatal Server Boot Error:', err);
  process.exit(1);
});
