// Customer Routes
import { Router } from 'express';
import {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  recordCreditPayment,
  getOutstandingBalances,
} from '../controllers/customerController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// Outstanding balances — owner, manager, accountant
router.get('/outstanding',
  authenticate,
  authorize('OWNER', 'MANAGER', 'ACCOUNTANT'),
  getOutstandingBalances
);

// All customers — everyone except storekeeper
router.get('/',     authenticate, authorize('OWNER', 'MANAGER', 'CASHIER', 'ACCOUNTANT'), getCustomers);
router.get('/:id',  authenticate, authorize('OWNER', 'MANAGER', 'CASHIER', 'ACCOUNTANT'), getCustomer);

// Create and update — owner and manager
router.post('/',    authenticate, authorize('OWNER', 'MANAGER', 'CASHIER'), createCustomer);
router.put('/:id',  authenticate, authorize('OWNER', 'MANAGER'), updateCustomer);

// Credit payment — cashier, manager, owner
router.post('/:id/payments',
  authenticate,
  authorize('OWNER', 'MANAGER', 'CASHIER'),
  recordCreditPayment
);

export default router;