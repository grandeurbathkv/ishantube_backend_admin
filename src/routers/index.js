import express from 'express';
import userRouter from '../moduls/users/user.router.js';
const router = express.Router();

router.use('/user', userRouter);

export default router;