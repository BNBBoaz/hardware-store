import { Router } from 'express';
import {
  getSuppliers, createSupplier, updateSupplier,
  createPurchaseOrder, receiveStock, paySupplier,
  getPurchaseOrders, deleteSupplier,
} from '../controllers/supplierController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.get('/orders',  authenticate, authorize('OWNER','MANAGER','STOREKEEPER','ACCOUNTANT'), getPurchaseOrders);
router.get('/',        authenticate, authorize('OWNER','MANAGER','STOREKEEPER','ACCOUNTANT'), getSuppliers);
router.post('/',       authenticate, authorize('OWNER','MANAGER'), createSupplier);
router.put('/:id',     authenticate, authorize('OWNER','MANAGER'), updateSupplier);
router.delete('/:id',  authenticate, authorize('OWNER','MANAGER'), deleteSupplier);
router.post('/:id/orders', authenticate, authorize('OWNER','MANAGER','STOREKEEPER'), createPurchaseOrder);
router.put('/orders/:orderId/receive', authenticate, authorize('OWNER','MANAGER','STOREKEEPER'), receiveStock);
router.post('/:id/payments', authenticate, authorize('OWNER','MANAGER','ACCOUNTANT'), paySupplier);

export default router;