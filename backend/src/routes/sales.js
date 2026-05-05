// Sale Routes
import { Router } from 'express';
import {
  createSale,
  getSales,
  getSale,
  getDailySummary,
} from '../controllers/saleController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// Daily summary — owner, manager, accountant
router.get('/summary',
  authenticate,
  authorize('OWNER', 'MANAGER', 'ACCOUNTANT'),
  getDailySummary
);

// All sales — owner, manager, accountant can see all
// Cashier can only see their own (filtered in query)
router.get('/',    authenticate, authorize('OWNER', 'MANAGER', 'ACCOUNTANT', 'CASHIER'), getSales);
router.get('/:id', authenticate, authorize('OWNER', 'MANAGER', 'ACCOUNTANT', 'CASHIER'), getSale);

// Create sale — cashier, manager, owner
router.post('/', authenticate, authorize('OWNER', 'MANAGER', 'CASHIER'), createSale);

export default router;