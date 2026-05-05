// Supplier Routes
import { Router } from 'express';
import {
  getSuppliers,
  createSupplier,
  updateSupplier,
  createPurchaseOrder,
  receiveStock,
  paySupplier,
  getPurchaseOrders,
} from '../controllers/supplierController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// Purchase orders
router.get('/orders',
  authenticate,
  authorize('OWNER', 'MANAGER', 'STOREKEEPER', 'ACCOUNTANT'),
  getPurchaseOrders
);

// Suppliers
router.get('/',    authenticate, authorize('OWNER', 'MANAGER', 'STOREKEEPER', 'ACCOUNTANT'), getSuppliers);
router.post('/',   authenticate, authorize('OWNER', 'MANAGER'), createSupplier);
router.put('/:id', authenticate, authorize('OWNER', 'MANAGER'), updateSupplier);

// Purchase orders per supplier
router.post('/:id/orders',
  authenticate,
  authorize('OWNER', 'MANAGER', 'STOREKEEPER'),
  createPurchaseOrder
);

// Receive stock
router.put('/orders/:orderId/receive',
  authenticate,
  authorize('OWNER', 'MANAGER', 'STOREKEEPER'),
  receiveStock
);

// Pay supplier
router.post('/:id/payments',
  authenticate,
  authorize('OWNER', 'MANAGER', 'ACCOUNTANT'),
  paySupplier
);

export default router;