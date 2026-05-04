// Product Routes
import { Router } from 'express';
import {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  getLowStock,
} from '../controllers/productController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// Low stock alert — owner, manager, storekeeper
router.get('/low-stock',
  authenticate,
  authorize('OWNER', 'MANAGER', 'STOREKEEPER'),
  getLowStock
);

// All products — everyone logged in can view
router.get('/',    authenticate, getProducts);
router.get('/:id', authenticate, getProduct);

// Create and update — owner, manager, storekeeper
router.post('/',    authenticate, authorize('OWNER', 'MANAGER', 'STOREKEEPER'), createProduct);
router.put('/:id',  authenticate, authorize('OWNER', 'MANAGER', 'STOREKEEPER'), updateProduct);

export default router;