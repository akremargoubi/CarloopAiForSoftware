import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { authRateLimit } from '../middlewares/authRateLimit.js';
import { asyncHandler, validateBody } from '../middlewares/validate.js';
import { login, me, register } from './auth.controller.js';
import { loginSchema, registerSchema } from './auth.schema.js';

export const authRouter = Router();

authRouter.post('/register', authRateLimit, validateBody(registerSchema), asyncHandler(register));
authRouter.post('/login', authRateLimit, validateBody(loginSchema), asyncHandler(login));
authRouter.get('/me', authenticate, asyncHandler(me));
