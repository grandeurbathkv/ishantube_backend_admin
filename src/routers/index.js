import express from 'express';
import userRouter from '../moduls/users/user.router.js';
import channelPartnerRouter from '../moduls/customer/channelPartner.router.js';
import channelPartnerIncentiveRouter from '../moduls/customer/channelPartnerIncentive.router.js';
import architectRouter from '../moduls/customer/architect.router.js';
import partyRouter from '../moduls/customer/party.router.js';
import siteRouter from '../moduls/customer/site.router.js';
import productRouter from '../moduls/Inventory/product.router.js';

const router = express.Router();

router.use('/user', userRouter);
router.use('/channelpartner', channelPartnerRouter);
router.use('/incentives', channelPartnerIncentiveRouter);
router.use('/architect', architectRouter);
router.use('/party', partyRouter);
router.use('/site', siteRouter);
router.use('/product', productRouter);


export default router;