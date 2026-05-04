// ─────────────────────────────────────────────
//  Hardware Store — Backend Entry Point
//  This is where the Express server starts.
// ─────────────────────────────────────────────
import authRoutes from './routes/auth.js';
import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ────────────────────────────────
// Parse incoming JSON request bodies
app.use(express.json());

// Allow requests from the frontend (CORS)
app.use(cors({
  origin: process.env.VITE_API_URL || 'http://localhost:3000',
  credentials: true,
}));

// ── Health check ──────────────────────────────
// Hit this URL to confirm the backend is running:
// GET http://localhost:5000/api/health
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Hardware Store API is running',
    timestamp: new Date().toISOString(),
  });
});

// ── Routes ────────────────────────────────────
app.use('/api/auth', authRoutes);
// app.use('/api/products',  productRoutes);
// app.use('/api/inventory', inventoryRoutes);
// app.use('/api/sales',     saleRoutes);
// app.use('/api/customers', customerRoutes);
// app.use('/api/suppliers', supplierRoutes);
// app.use('/api/reports',   reportRoutes);

// ── 404 handler ───────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.url} not found` });
});

// ── Error handler ─────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong', message: err.message });
});

// ── Start server ──────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ Backend running on http://localhost:${PORT}`);
  console.log(`📋 Environment: ${process.env.NODE_ENV}`);
});
