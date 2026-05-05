// Report Routes
import { Router } from 'express';
import {
  getDashboard,
  getSalesReport,
  getStockReport,
  getBestSellers,
} from '../controllers/reportController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// All report routes — owner, manager, accountant only
const reportAccess = [authenticate, authorize('OWNER', 'MANAGER', 'ACCOUNTANT')];

router.get('/dashboard',    ...reportAccess, getDashboard);
router.get('/sales',        ...reportAccess, getSalesReport);
router.get('/stock',        ...reportAccess, getStockReport);
router.get('/best-sellers', ...reportAccess, getBestSellers);

export default router;