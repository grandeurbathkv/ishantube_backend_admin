import express from 'express';
import userRouter from '../moduls/users/user.router.js';
import channelPartnerRouter from '../moduls/customer/channelPartner.router.js';
import channelPartnerIncentiveRouter from '../moduls/customer/channelPartnerIncentive.router.js';
import architectRouter from '../moduls/customer/architect.router.js';
import partyRouter from '../moduls/customer/party.router.js';
import siteRouter from '../moduls/customer/site.router.js';

import productRouter from '../moduls/Inventory/product.router.js';
import brandRouter from '../moduls/brand/brand.router.js';
import categoryRouter from '../moduls/Inventory/category.router.js';
import colorRouter from '../moduls/Inventory/color.router.js';
import seriesRouter from '../moduls/Inventory/series.router.js';
import companyRouter from '../moduls/company/company.router.js';

const router = express.Router();

router.use('/user', userRouter);
router.use('/channelpartner', channelPartnerRouter);
router.use('/incentives', channelPartnerIncentiveRouter);
router.use('/architect', architectRouter);
router.use('/party', partyRouter);
router.use('/site', siteRouter);
router.use('/product', productRouter);

router.use('/brand', brandRouter);
router.use('/category', categoryRouter);
router.use('/', colorRouter);
router.use('/', seriesRouter);
router.use('/company', companyRouter);


export default router;