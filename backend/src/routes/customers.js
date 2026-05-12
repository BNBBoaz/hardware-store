import { Router } from 'express';
import {
  getCustomers, getCustomer, createCustomer,
  updateCustomer, recordCreditPayment,
  getOutstandingBalances, deleteCustomer,
} from '../controllers/customerController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.get('/outstanding', authenticate, authorize('OWNER','MANAGER','ACCOUNTANT'), getOutstandingBalances);
router.get('/',    authenticate, authorize('OWNER','MANAGER','CASHIER','ACCOUNTANT'), getCustomers);
router.get('/:id', authenticate, authorize('OWNER','MANAGER','CASHIER','ACCOUNTANT'), getCustomer);
router.post('/',   authenticate, authorize('OWNER','MANAGER','CASHIER'), createCustomer);
router.put('/:id', authenticate, authorize('OWNER','MANAGER'), updateCustomer);
router.delete('/:id', authenticate, authorize('OWNER','MANAGER'), deleteCustomer);
router.post('/:id/payments', authenticate, authorize('OWNER','MANAGER','CASHIER'), recordCreditPayment);

export default router;