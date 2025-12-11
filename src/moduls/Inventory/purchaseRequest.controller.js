import PurchaseRequest from './purchaseRequest.model.js';
import mongoose from 'mongoose';

// Create a new Purchase Request
export const createPurchaseRequest = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id;
        const userName = req.user?.User_Name || 'Unknown User';

        console.log('\n🔷 ==================== CREATE PR REQUEST START ====================');
        console.log('🔷 User ID:', userId);
        console.log('🔷 User Name:', userName);
        console.log('🔷 Request body:', JSON.stringify(req.body, null, 2));

        // Validate user authentication
        if (!userId) {
            console.error('❌ User not authenticated');
            return res.status(401).json({
                success: false,
                message: 'User authentication required'
            });
        }

        // Validate required fields
        if (!req.body.PR_Vendor || req.body.PR_Vendor.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'PR Vendor is required'
            });
        }

        if (!req.body.items || !Array.isArray(req.body.items) || req.body.items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'At least one item is required'
            });
        }

        // Create PR data
        const prData = {
            PR_Date: req.body.PR_Date || new Date(),
            PR_Vendor: req.body.PR_Vendor,
            PI_Received: req.body.PI_Received || false,
            items: req.body.items,
            status: req.body.status || 'pending',
            remarks: req.body.remarks || '',
            created_by: userId,
            created_by_name: userName
        };

        console.log('🔷 Creating PR with data:', {
            ...prData,
            items: `${prData.items.length} items`,
            created_by: userId
        });

        // Create new Purchase Request
        const purchaseRequest = new PurchaseRequest(prData);
        await purchaseRequest.save();

        console.log('✅ Purchase Request created successfully:', purchaseRequest.PR_Number);
        console.log('📋 PR Items count:', purchaseRequest.items.length);
        console.log('🏢 PR Vendor:', purchaseRequest.PR_Vendor);
        console.log('📅 PR Date:', purchaseRequest.PR_Date);
        console.log('🔷 ==================== CREATE PR REQUEST END ====================\n');

        res.status(201).json({
            success: true,
            message: 'Purchase Request created successfully',
            data: purchaseRequest
        });

    } catch (error) {
        console.error('Error creating Purchase Request:', error);
        console.error('Error details:', error.message);
        console.error('Error stack:', error.stack);
        
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Purchase Request with this PR Number already exists',
                error: error.message
            });
        }
        
        if (error.name === 'ValidationError') {
            console.error('Validation errors:', error.errors);
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                error: error.message,
                details: error.errors
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Failed to create Purchase Request',
            error: error.message
        });
    }
};

// Get all Purchase Requests with filters and pagination
export const getAllPurchaseRequests = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            status,
            PR_Vendor,
            PI_Received,
            from_date,
            to_date,
            search,
            sort_by = 'PR_Date',
            sort_order = 'desc'
        } = req.query;

        console.log('Fetching Purchase Requests with filters:', req.query);

        // Build filter query
        const filter = {};

        if (status) {
            filter.status = status;
        }

        if (PR_Vendor) {
            filter.PR_Vendor = { $regex: PR_Vendor, $options: 'i' };
        }

        if (PI_Received !== undefined && PI_Received !== '') {
            filter.PI_Received = PI_Received === 'true' || PI_Received === true;
        }

        // Date range filter
        if (from_date || to_date) {
            filter.PR_Date = {};
            if (from_date) {
                filter.PR_Date.$gte = new Date(from_date);
            }
            if (to_date) {
                const toDate = new Date(to_date);
                toDate.setHours(23, 59, 59, 999);
                filter.PR_Date.$lte = toDate;
            }
        }

        // Search filter
        if (search) {
            filter.$or = [
                { PR_Number: { $regex: search, $options: 'i' } },
                { PR_Vendor: { $regex: search, $options: 'i' } },
                { 'items.product_name': { $regex: search, $options: 'i' } },
                { 'items.product_code': { $regex: search, $options: 'i' } }
            ];
        }

        // Pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const sortOrder = sort_order === 'asc' ? 1 : -1;
        const sortObj = { [sort_by]: sortOrder };

        // Get total count
        const total = await PurchaseRequest.countDocuments(filter);

        // Get Purchase Requests
        const purchaseRequests = await PurchaseRequest.find(filter)
            .populate('created_by', 'User_Name User_Email')
            .populate('approved_by', 'User_Name User_Email')
            .sort(sortObj)
            .skip(skip)
            .limit(parseInt(limit));

        console.log(`Found ${purchaseRequests.length} Purchase Requests`);

        res.status(200).json({
            success: true,
            message: 'Purchase Requests retrieved successfully',
            data: purchaseRequests,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });

    } catch (error) {
        console.error('Error fetching Purchase Requests:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch Purchase Requests',
            error: error.message
        });
    }
};

// Get Purchase Request by ID
export const getPurchaseRequestById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Purchase Request ID'
            });
        }

        const purchaseRequest = await PurchaseRequest.findById(id)
            .populate('created_by', 'User_Name User_Email')
            .populate('approved_by', 'User_Name User_Email')
            .populate('items.order_id')
            .populate('items.product_id');

        if (!purchaseRequest) {
            return res.status(404).json({
                success: false,
                message: 'Purchase Request not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Purchase Request retrieved successfully',
            data: purchaseRequest
        });

    } catch (error) {
        console.error('Error fetching Purchase Request:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch Purchase Request',
            error: error.message
        });
    }
};

// Update Purchase Request
export const updatePurchaseRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?._id || req.user?.id;

        console.log('\n🔷 ==================== UPDATE PR REQUEST START ====================');
        console.log('🔷 PR ID:', id);
        console.log('🔷 User ID:', userId);
        console.log('🔷 Update data:', JSON.stringify(req.body, null, 2));

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Purchase Request ID'
            });
        }

        const purchaseRequest = await PurchaseRequest.findById(id);

        if (!purchaseRequest) {
            return res.status(404).json({
                success: false,
                message: 'Purchase Request not found'
            });
        }

        // Update fields
        const allowedUpdates = ['PR_Vendor', 'PI_Received', 'status', 'remarks', 'pi_number', 'pi_date', 'pi_amount', 'items', 
            'payment_done', 'payment_amount', 'payment_utr', 'payment_mode', 'payment_reference', 'payment_bank', 'payment_date', 'payment_remarks'];
        const updates = {};

        allowedUpdates.forEach(field => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });

        // If PI is received, ensure PI details are provided and set status to awaiting_payment
        if (req.body.PI_Received === true) {
            if (!req.body.pi_number || !req.body.pi_date) {
                return res.status(400).json({
                    success: false,
                    message: 'PI Number and PI Date are required when marking PR as received'
                });
            }
            // Auto set status to awaiting_payment when PI is received
            if (!req.body.status) {
                updates.status = 'awaiting_payment';
            }
            console.log('✅ PI Details:', {
                pi_number: req.body.pi_number,
                pi_date: req.body.pi_date,
                pi_amount: req.body.pi_amount,
                status: updates.status
            });
        }

        // If payment is done, ensure payment details are provided and change status to awaiting_dispatch
        if (req.body.payment_done === true) {
            if (!req.body.payment_amount || req.body.payment_amount <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Payment Amount is required when recording payment'
                });
            }
            if (!req.body.payment_utr || !req.body.payment_mode) {
                return res.status(400).json({
                    success: false,
                    message: 'UTR Code and Payment Mode are required when recording payment'
                });
            }
            // Auto set status to awaiting_dispatch when payment is done
            updates.status = 'awaiting_dispatch';
            updates.payment_date = req.body.payment_date || new Date();
            console.log('✅ Payment Details:', {
                payment_amount: req.body.payment_amount,
                payment_utr: req.body.payment_utr,
                payment_mode: req.body.payment_mode,
                payment_reference: req.body.payment_reference,
                payment_bank: req.body.payment_bank,
                status: updates.status
            });
        }

        // If status is being approved, add approval details
        if (req.body.status === 'approved' && purchaseRequest.status !== 'approved') {
            updates.approved_by = userId;
            updates.approved_date = new Date();
            console.log('✅ PR approved by user:', userId);
        }

        Object.assign(purchaseRequest, updates);
        await purchaseRequest.save();

        console.log('✅ Purchase Request updated successfully:', purchaseRequest.PR_Number);
        console.log('📋 Status:', purchaseRequest.status);
        console.log('📦 PI Received:', purchaseRequest.PI_Received);
        if (purchaseRequest.pi_number) {
            console.log('📄 PI Number:', purchaseRequest.pi_number);
        }
        console.log('🔷 ==================== UPDATE PR REQUEST END ====================\n');

        res.status(200).json({
            success: true,
            message: 'Purchase Request updated successfully',
            data: purchaseRequest
        });

    } catch (error) {
        console.error('❌ Error updating Purchase Request:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update Purchase Request',
            error: error.message
        });
    }
};

// Delete Purchase Request
export const deletePurchaseRequest = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Purchase Request ID'
            });
        }

        const purchaseRequest = await PurchaseRequest.findByIdAndDelete(id);

        if (!purchaseRequest) {
            return res.status(404).json({
                success: false,
                message: 'Purchase Request not found'
            });
        }

        console.log('✅ Purchase Request deleted successfully:', purchaseRequest.PR_Number);

        res.status(200).json({
            success: true,
            message: 'Purchase Request deleted successfully',
            data: purchaseRequest
        });

    } catch (error) {
        console.error('Error deleting Purchase Request:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete Purchase Request',
            error: error.message
        });
    }
};
