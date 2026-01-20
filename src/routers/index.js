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
import quotationRouter from '../moduls/Inventory/quotation.router.js';
import orderRouter from '../moduls/Inventory/order.router.js';
import dispatchRouter from '../moduls/Inventory/dispatch.router.js';
import paymentReceiptRouter from '../moduls/Inventory/paymentReceipt.router.js';
import purchaseRequestRouter from '../moduls/Inventory/purchaseRequest.router.js';

// Import chat router
import chatRouter from '../moduls/chat/chat.router.js';

// Import dashboard router
import dashboardRouter from '../moduls/dashboard/dashboard.router.js';

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
router.use('/quotation', quotationRouter);
router.use('/order', orderRouter);
router.use('/dispatch', dispatchRouter);
router.use('/payment-receipt', paymentReceiptRouter);
router.use('/purchase-request', purchaseRequestRouter);
router.use('/chat', chatRouter);
router.use('/dashboard', dashboardRouter);


export default router;