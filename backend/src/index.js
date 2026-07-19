import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { connectDB } from './db.js';

import requireAdmin from './middleware/auth.js';

import authRoutes from './routes/auth.js';
import athleteRoutes from './routes/athletes.js';
import newsRoutes from './routes/news.js';
import competitionRoutes from './routes/competitions.js';
import learnRoutes from './routes/learn.js';
import aboutRoutes from './routes/about.js';
import photoRoutes from './routes/photos.js';
import uploadRoutes from './routes/upload.js';
import mainPageRoutes from './routes/mainPage.js';
import rankingRoutes from './routes/rankings.js';
import teamRankingRoutes from './routes/teamRankings.js';
import teamRoutes from './routes/teams.js';
import contactRoutes from './routes/contact.js';
import pageViewRoutes from './routes/pageViews.js';
import rebuildRoutes from './routes/rebuild.js';

const app = express();
const PORT = process.env.PORT || 3001;

// ── Security Middleware ──
app.use(helmet());

// CORS — restrict to specific origins in production
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(s => s.trim())
  : [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:3001',
      // Custom domain & Vercel previews
      'https://climbpakistan.com',
      'https://www.climbpakistan.com',
      'https://climb-pakistan.vercel.app',
      'https://climb-pakistan-admin.vercel.app',
    ];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (server-to-server, curl, Postman, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(null, false);
  },
  credentials: true,
}));

// Rate limiters
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,                     // 5 attempts per window
  message: { error: 'Too many login attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: { error: 'Too many messages sent. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Public routes (no auth required) ──
app.use('/api/auth', loginLimiter, authRoutes);

// ── Admin-protected routes ──
// GET requests are always public; POST / PUT / DELETE require a valid JWT.
app.use('/api/athletes', requireAdmin, athleteRoutes);
app.use('/api/news', requireAdmin, newsRoutes);
app.use('/api/competitions', requireAdmin, competitionRoutes);
app.use('/api/learn', requireAdmin, learnRoutes);
app.use('/api/about', requireAdmin, aboutRoutes);
app.use('/api/photos', requireAdmin, photoRoutes);
app.use('/api/upload', requireAdmin, uploadRoutes);
app.use('/api/main-page', requireAdmin, mainPageRoutes);
app.use('/api/rankings', requireAdmin, rankingRoutes);
app.use('/api/team-rankings', requireAdmin, teamRankingRoutes);
app.use('/api/teams', requireAdmin, teamRoutes);
// Contact form POST must remain public (visitors submit it)
// Admin-only /settings endpoints use their own middleware inside the route
app.use('/api/contact', contactLimiter, contactRoutes);

// ── Page Views ──
// POST /api/page-views is public (tracking), GET /stats is protected inside the route
app.use('/api/page-views', pageViewRoutes);

// ── Vercel Rebuild Trigger ──
// POST /api/rebuild triggers a Vercel deploy hook to rebuild the static site
app.use('/api/rebuild', requireAdmin, rebuildRoutes);

// Start server
async function start() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`🚀 Backend running at http://localhost:${PORT}`);
    console.log(`   Health check: http://localhost:${PORT}/api/health`);
  });
}

start();
