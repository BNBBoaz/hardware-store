import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes     from './routes/auth.js';
import categoryRoutes from './routes/categories.js';
import productRoutes  from './routes/products.js';
import saleRoutes     from './routes/sales.js';
import customerRoutes from './routes/customers.js';
import supplierRoutes from './routes/suppliers.js';
import reportRoutes   from './routes/reports.js';
import userRoutes     from './routes/users.js';

const app  = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(cors({
  origin:      process.env.VITE_API_URL || 'http://localhost:3000',
  credentials: true,
}));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Hardware Store API is running', timestamp: new Date().toISOString() });
});

app.use('/api/auth',       authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products',   productRoutes);
app.use('/api/sales',      saleRoutes);
app.use('/api/customers',  customerRoutes);
app.use('/api/suppliers',  supplierRoutes);
app.use('/api/reports',    reportRoutes);
app.use('/api/users',      userRoutes);

app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.url} not found` });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong', message: err.message });
});

app.listen(PORT, () => {
  console.log(`✅ Backend running on http://localhost:${PORT}`);
  console.log(`📋 Environment: ${process.env.NODE_ENV}`);
});