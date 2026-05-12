import { Router } from 'express';
import { getUsers, createUser, updateUser, deactivateUser } from '../controllers/userController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.get('/',       authenticate, authorize('OWNER'), getUsers);
router.post('/',      authenticate, authorize('OWNER'), createUser);
router.put('/:id',    authenticate, authorize('OWNER'), updateUser);
router.delete('/:id', authenticate, authorize('OWNER'), deactivateUser);

export default router;