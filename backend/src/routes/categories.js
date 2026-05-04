// Category Routes
import { Router } from 'express';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../controllers/categoryController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// All category routes require login
// GET — cashiers and storekeepers can view categories
router.get('/',    authenticate, getCategories);

// POST, PUT, DELETE — only owner and manager can modify
router.post('/',   authenticate, authorize('OWNER', 'MANAGER'), createCategory);
router.put('/:id', authenticate, authorize('OWNER', 'MANAGER'), updateCategory);
router.delete('/:id', authenticate, authorize('OWNER', 'MANAGER'), deleteCategory);

export default router;