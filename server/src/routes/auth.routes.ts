import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { authenticate } from '../middlewares/authenticate';
import { authLimiter } from '../middlewares/rate-limit';
import { asyncHandler } from '../utils/async-handler';

/** Routes /api/auth. */
export const authRouter = Router();

authRouter.post('/register', authLimiter, asyncHandler(authController.register));
authRouter.post('/login', authLimiter, asyncHandler(authController.login));
authRouter.get('/me', authenticate, asyncHandler(authController.me));
