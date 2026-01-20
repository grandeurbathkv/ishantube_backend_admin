import Order from "../Inventory/order.model.js";
import { Product } from "../Inventory/product.model.js";
import PurchaseRequest from "../Inventory/purchaseRequest.model.js";
import PaymentReceipt from "../Inventory/paymentReceipt.model.js";
import { ChannelPartner } from "../customer/channelPartner.model.js";
import { Architect } from "../customer/architect.model.js";
import Company from "../company/company.model.js";

// Get Dashboard Metrics
export const getDashboardMetrics = async (req, res) => {
    try {
        // Get current date and date ranges
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();

        // Start of current month
        const startOfMonth = new Date(currentYear, currentMonth, 1);

        // Start of last month
        const startOfLastMonth = new Date(currentYear, currentMonth - 1, 1);
        const endOfLastMonth = new Date(currentYear, currentMonth, 0);

        // Calculate Total Sales (from completed orders)
        const salesResult = await Order.aggregate([
            {
                $match: {
                    status: { $in: ["completed", "delivered"] }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$totalAmount" }
                }
            }
        ]);
        const totalSales = salesResult.length > 0 ? salesResult[0].total : 0;

        // Calculate Sales for current month
        const salesCurrentMonth = await Order.aggregate([
            {
                $match: {
                    status: { $in: ["completed", "delivered"] },
                    createdAt: { $gte: startOfMonth }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$totalAmount" }
                }
            }
        ]);
        const salesThisMonth = salesCurrentMonth.length > 0 ? salesCurrentMonth[0].total : 0;

        // Calculate Sales for last month
        const salesLastMonth = await Order.aggregate([
            {
                $match: {
                    status: { $in: ["completed", "delivered"] },
                    createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$totalAmount" }
                }
            }
        ]);
        const salesPreviousMonth = salesLastMonth.length > 0 ? salesLastMonth[0].total : 0;

        // Calculate Total Sales Return (cancelled/returned orders)
        const salesReturnResult = await Order.aggregate([
            {
                $match: {
                    status: { $in: ["cancelled", "returned"] }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$totalAmount" }
                }
            }
        ]);
        const totalSalesReturn = salesReturnResult.length > 0 ? salesReturnResult[0].total : 0;

        // Calculate Total Purchase (from purchase requests)
        const purchaseResult = await PurchaseRequest.aggregate([
            {
                $match: {
                    status: { $in: ["approved", "completed"] }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$totalAmount" }
                }
            }
        ]);
        const totalPurchase = purchaseResult.length > 0 ? purchaseResult[0].total : 0;

        // Calculate Purchase for current month
        const purchaseCurrentMonth = await PurchaseRequest.aggregate([
            {
                $match: {
                    status: { $in: ["approved", "completed"] },
                    createdAt: { $gte: startOfMonth }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$totalAmount" }
                }
            }
        ]);
        const purchaseThisMonth = purchaseCurrentMonth.length > 0 ? purchaseCurrentMonth[0].total : 0;

        // Calculate Purchase for last month
        const purchaseLastMonth = await PurchaseRequest.aggregate([
            {
                $match: {
                    status: { $in: ["approved", "completed"] },
                    createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$totalAmount" }
                }
            }
        ]);
        const purchasePreviousMonth = purchaseLastMonth.length > 0 ? purchaseLastMonth[0].total : 0;

        // Calculate Total Purchase Return
        const purchaseReturnResult = await PurchaseRequest.aggregate([
            {
                $match: {
                    status: "rejected"
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$totalAmount" }
                }
            }
        ]);
        const totalPurchaseReturn = purchaseReturnResult.length > 0 ? purchaseReturnResult[0].total : 0;

        // Calculate Profit (Sales - Purchase)
        const profit = totalSales - totalPurchase;
        const profitThisMonth = salesThisMonth - purchaseThisMonth;
        const profitLastMonth = salesPreviousMonth - purchasePreviousMonth;

        // Calculate Invoice Due (pending payment receipts)
        const invoiceDueResult = await PaymentReceipt.aggregate([
            {
                $match: {
                    status: "pending"
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$amount" }
                }
            }
        ]);
        const invoiceDue = invoiceDueResult.length > 0 ? invoiceDueResult[0].total : 0;

        // Calculate Total Expenses (you may need to adjust based on your expense model)
        // For now using purchase as expenses
        const totalExpenses = totalPurchase;

        // Calculate Total Payment Returns
        const paymentReturnResult = await PaymentReceipt.aggregate([
            {
                $match: {
                    status: "returned"
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$amount" }
                }
            }
        ]);
        const totalPaymentReturns = paymentReturnResult.length > 0 ? paymentReturnResult[0].total : 0;

        // Calculate percentage changes
        const salesChange = salesPreviousMonth > 0 ?
            ((salesThisMonth - salesPreviousMonth) / salesPreviousMonth * 100).toFixed(2) : 0;

        const purchaseChange = purchasePreviousMonth > 0 ?
            ((purchaseThisMonth - purchasePreviousMonth) / purchasePreviousMonth * 100).toFixed(2) : 0;

        const profitChange = profitLastMonth > 0 ?
            ((profitThisMonth - profitLastMonth) / profitLastMonth * 100).toFixed(2) : 0;

        // Get today's orders count
        const startOfToday = new Date(currentYear, currentMonth, currentDate.getDate());
        const ordersToday = await Order.countDocuments({
            createdAt: { $gte: startOfToday }
        });

        // Get counts for Overall Information
        const channelPartnersCount = await ChannelPartner.countDocuments();
        const architectsCount = await Architect.countDocuments();
        const productsCount = await Product.countDocuments();
        const ordersCount = await Order.countDocuments();
        const pendingQuotations = await Order.countDocuments({ status: "pending" });
        const companiesCount = await Company.countDocuments();
        const lowStockCount = await Product.countDocuments({ stock: { $lt: 10 } });

        res.status(200).json({
            success: true,
            ordersToday,
            metrics: {
                totalSales: Math.round(totalSales),
                totalSalesReturn: Math.round(totalSalesReturn),
                totalPurchase: Math.round(totalPurchase),
                totalPurchaseReturn: Math.round(totalPurchaseReturn),
                profit: Math.round(profit),
                invoiceDue: Math.round(invoiceDue * 100) / 100,
                totalExpenses: Math.round(totalExpenses),
                totalPaymentReturns: Math.round(totalPaymentReturns),
                salesChange: parseFloat(salesChange),
                salesReturnChange: -22, // You can calculate this based on your data
                purchaseChange: parseFloat(purchaseChange),
                purchaseReturnChange: 22, // You can calculate this based on your data
                profitChange: parseFloat(profitChange),
                invoiceDueChange: 35, // You can calculate this based on your data
                expensesChange: 41, // You can calculate this based on your data
                paymentReturnsChange: -20 // You can calculate this based on your data
            },
            overallInfo: {
                channelPartners: channelPartnersCount,
                architects: architectsCount,
                products: productsCount,
                orders: ordersCount,
                pendingQuotations,
                companies: companiesCount,
                lowStockItems: lowStockCount
            }
        });
    } catch (error) {
        console.error("Error fetching dashboard metrics:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch dashboard metrics",
            error: error.message
        });
    }
};
