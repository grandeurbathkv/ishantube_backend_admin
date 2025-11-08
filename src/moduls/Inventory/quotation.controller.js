import Quotation from './quotation.model.js';
import mongoose from 'mongoose';

// Create a new quotation
export const createQuotation = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id;
        const userName = req.user?.User_Name || 'Unknown User';

        // Validate required fields
        if (!req.body.company_id) {
            return res.status(400).json({
                success: false,
                message: 'Company ID is required'
            });
        }

        if (!req.body.party_id) {
            return res.status(400).json({
                success: false,
                message: 'Party ID is required'
            });
        }

        if (!req.body.groups || !Array.isArray(req.body.groups) || req.body.groups.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'At least one group with items is required'
            });
        }

        // Create quotation data
        const quotationData = {
            ...req.body,
            created_by: userId,
            created_by_name: userName,
            status: req.body.status || 'draft'
        };

        // Create new quotation
        const quotation = new Quotation(quotationData);
        await quotation.save();

        res.status(201).json({
            success: true,
            message: 'Quotation created successfully',
            data: quotation
        });

    } catch (error) {
        console.error('Error creating quotation:', error);
        
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Quotation number already exists',
                error: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to create quotation',
            error: error.message
        });
    }
};

// Get all quotations with filtering, pagination and sorting
export const getAllQuotations = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            status,
            party_id,
            company_id,
            from_date,
            to_date,
            search,
            sort_by = 'quotation_date',
            sort_order = 'desc'
        } = req.query;

        // Build filter query
        const filter = {};

        if (status) {
            filter.status = status;
        }

        if (party_id) {
            filter.party_id = party_id;
        }

        if (company_id) {
            filter.company_id = company_id;
        }

        // Date range filter
        if (from_date || to_date) {
            filter.quotation_date = {};
            if (from_date) {
                filter.quotation_date.$gte = new Date(from_date);
            }
            if (to_date) {
                filter.quotation_date.$lte = new Date(to_date);
            }
        }

        // Search filter
        if (search) {
            filter.$or = [
                { quotation_no: { $regex: search, $options: 'i' } },
                { party_name: { $regex: search, $options: 'i' } },
                { party_billing_name: { $regex: search, $options: 'i' } },
                { order_id: { $regex: search, $options: 'i' } }
            ];
        }

        // Pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const sortOrder = sort_order === 'asc' ? 1 : -1;
        const sortObj = { [sort_by]: sortOrder };

        // Execute query
        const quotations = await Quotation.find(filter)
            .populate('company_id', 'Company_Name Company_Short_Code')
            .populate('party_id', 'Party_Billing_Name Party_id')
            .populate('site_id', 'Site_Billing_Name Site_id')
            .populate('created_by', 'User_Name User_Email')
            .sort(sortObj)
            .skip(skip)
            .limit(parseInt(limit));

        // Get total count
        const total = await Quotation.countDocuments(filter);

        res.status(200).json({
            success: true,
            message: 'Quotations retrieved successfully',
            data: quotations,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: total,
                totalPages: Math.ceil(total / parseInt(limit))
            },
            filters: {
                status,
                party_id,
                company_id,
                from_date,
                to_date,
                search
            }
        });

    } catch (error) {
        console.error('Error fetching quotations:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch quotations',
            error: error.message
        });
    }
};

// Get quotation by ID
export const getQuotationById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid quotation ID'
            });
        }

        const quotation = await Quotation.findById(id)
            .populate('company_id')
            .populate('party_id')
            .populate('site_id')
            .populate('created_by', 'User_Name User_Email')
            .populate('updated_by', 'User_Name User_Email');

        if (!quotation) {
            return res.status(404).json({
                success: false,
                message: 'Quotation not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Quotation retrieved successfully',
            data: quotation
        });

    } catch (error) {
        console.error('Error fetching quotation:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch quotation',
            error: error.message
        });
    }
};

// Update quotation
export const updateQuotation = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?._id || req.user?.id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid quotation ID'
            });
        }

        // Add updated_by to the update data
        const updateData = {
            ...req.body,
            updated_by: userId
        };

        const quotation = await Quotation.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!quotation) {
            return res.status(404).json({
                success: false,
                message: 'Quotation not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Quotation updated successfully',
            data: quotation
        });

    } catch (error) {
        console.error('Error updating quotation:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update quotation',
            error: error.message
        });
    }
};

// Delete quotation
export const deleteQuotation = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid quotation ID'
            });
        }

        const quotation = await Quotation.findByIdAndDelete(id);

        if (!quotation) {
            return res.status(404).json({
                success: false,
                message: 'Quotation not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Quotation deleted successfully',
            data: quotation
        });

    } catch (error) {
        console.error('Error deleting quotation:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete quotation',
            error: error.message
        });
    }
};

// Update quotation status
export const updateQuotationStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const userId = req.user?._id || req.user?.id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid quotation ID'
            });
        }

        if (!status || !['draft', 'sent', 'accepted', 'rejected', 'expired'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status value'
            });
        }

        const updateData = {
            status: status,
            updated_by: userId
        };

        // If status is 'sent', update sent_at timestamp
        if (status === 'sent') {
            updateData.sent_at = new Date();
        }

        // If status is 'accepted' or 'rejected', update responded_at timestamp
        if (status === 'accepted' || status === 'rejected') {
            updateData.responded_at = new Date();
        }

        const quotation = await Quotation.findByIdAndUpdate(
            id,
            updateData,
            { new: true }
        );

        if (!quotation) {
            return res.status(404).json({
                success: false,
                message: 'Quotation not found'
            });
        }

        res.status(200).json({
            success: true,
            message: `Quotation status updated to ${status}`,
            data: quotation
        });

    } catch (error) {
        console.error('Error updating quotation status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update quotation status',
            error: error.message
        });
    }
};

// Get quotation statistics
export const getQuotationStats = async (req, res) => {
    try {
        const { from_date, to_date, company_id } = req.query;

        const filter = {};

        if (from_date || to_date) {
            filter.quotation_date = {};
            if (from_date) {
                filter.quotation_date.$gte = new Date(from_date);
            }
            if (to_date) {
                filter.quotation_date.$lte = new Date(to_date);
            }
        }

        if (company_id) {
            filter.company_id = company_id;
        }

        const stats = await Quotation.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    total_amount: { $sum: '$net_amount_payable' }
                }
            }
        ]);

        const totalQuotations = await Quotation.countDocuments(filter);
        const totalValue = await Quotation.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$net_amount_payable' }
                }
            }
        ]);

        res.status(200).json({
            success: true,
            message: 'Quotation statistics retrieved successfully',
            data: {
                total_quotations: totalQuotations,
                total_value: totalValue[0]?.total || 0,
                by_status: stats
            }
        });

    } catch (error) {
        console.error('Error fetching quotation stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch quotation statistics',
            error: error.message
        });
    }
};

// Download quotation as PDF
export const downloadQuotationPDF = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid quotation ID'
            });
        }

        const quotation = await Quotation.findById(id)
            .populate('company_id')
            .populate('party_id')
            .populate('site_id')
            .populate('created_by', 'User_Name User_Email');

        if (!quotation) {
            return res.status(404).json({
                success: false,
                message: 'Quotation not found'
            });
        }

        // Return quotation data for PDF generation on frontend
        // Frontend will handle PDF generation using libraries like jsPDF or pdfmake
        res.status(200).json({
            success: true,
            message: 'Quotation data retrieved for PDF generation',
            data: quotation
        });

    } catch (error) {
        console.error('Error fetching quotation for PDF:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch quotation for PDF',
            error: error.message
        });
    }
};

// Send quotation via email
export const sendQuotation = async (req, res) => {
    try {
        const { id } = req.params;
        const { email, subject, message } = req.body;
        const userId = req.user?._id || req.user?.id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid quotation ID'
            });
        }

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email address is required'
            });
        }

        const quotation = await Quotation.findById(id)
            .populate('company_id')
            .populate('party_id')
            .populate('site_id');

        if (!quotation) {
            return res.status(404).json({
                success: false,
                message: 'Quotation not found'
            });
        }

        // TODO: Implement email sending logic using nodemailer or similar
        // For now, just update the status to 'sent'
        quotation.status = 'sent';
        quotation.sent_at = new Date();
        quotation.updated_by = userId;
        await quotation.save();

        res.status(200).json({
            success: true,
            message: 'Quotation sent successfully',
            data: {
                quotation_no: quotation.quotation_no,
                email: email,
                sent_at: quotation.sent_at
            }
        });

    } catch (error) {
        console.error('Error sending quotation:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send quotation',
            error: error.message
        });
    }
};
