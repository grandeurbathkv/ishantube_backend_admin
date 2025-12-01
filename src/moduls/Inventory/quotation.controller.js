import Quotation from './quotation.model.js';
import mongoose from 'mongoose';
import XLSX from 'xlsx';

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
            .populate('party_id', 'Party_Billing_Name Party_id Party_Gstno Party_Address Party_city Party_State Contact_Person Mobile_Number Email_id')
            .populate('site_id')
            .populate('created_by', 'User_Name User_Email')
            .populate('updated_by', 'User_Name User_Email');

        if (!quotation) {
            return res.status(404).json({
                success: false,
                message: 'Quotation not found'
            });
        }

        // Ensure party_gst is included in response
        if (quotation.party_id && quotation.party_id.Party_Gstno && !quotation.party_gst) {
            quotation.party_gst = quotation.party_id.Party_Gstno;
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

// Download quotation as Excel
export const downloadQuotationExcel = async (req, res) => {
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

        // Create a new workbook
        const workbook = XLSX.utils.book_new();

        // Prepare header information
        const headerData = [
            ['QUOTATION'],
            [quotation.quotation_no],
            [`Date: ${new Date(quotation.quotation_date).toLocaleDateString('en-IN')}`],
            [],
            ['Company Details'],
            [quotation.company_name || ''],
            [quotation.company_address || ''],
            [`GSTIN: ${quotation.company_gstin || 'N/A'}`],
            [],
            ['Party Details'],
            [quotation.party_billing_name || quotation.party_name || ''],
            [quotation.party_billing_address || ''],
            [`GSTIN: ${quotation.party_gstin || 'N/A'}`],
            [`Phone: ${quotation.party_phone || 'N/A'}`],
            [],
            []
        ];

        // Prepare items data
        const itemsHeader = ['#', 'Product', 'Product Code', 'Qty', 'MRP', 'Discount', 'Net Rate', 'Total'];
        const itemsData = [itemsHeader];

        let itemCounter = 1;
        quotation.groups?.forEach((group, groupIndex) => {
            // Add group header
            itemsData.push([`${group.group_name || `Group ${groupIndex + 1}`} - ${group.group_category || ''}`]);
            
            // Add items in the group
            group.items?.forEach((item) => {
                const discount = item.discount > 0 
                    ? `-${item.discount}${item.discount_type === 'percentage' ? '%' : '₹'}` 
                    : '-';
                
                itemsData.push([
                    itemCounter++,
                    item.product_name || '',
                    item.product_code || '',
                    item.quantity || 0,
                    `₹${item.mrp?.toFixed(2) || '0.00'}`,
                    discount,
                    `₹${item.net_rate?.toFixed(2) || '0.00'}`,
                    `₹${item.total_amount?.toFixed(2) || '0.00'}`
                ]);
            });
            
            // Add empty row after each group
            itemsData.push([]);
        });

        // Prepare summary data
        const summaryData = [
            [],
            ['Summary', ''],
            ['Subtotal', `₹${quotation.subtotal?.toFixed(2) || '0.00'}`]
        ];

        if (quotation.total_discount > 0) {
            summaryData.push(['Total Discount', `-₹${quotation.total_discount?.toFixed(2)}`]);
        }

        if (quotation.gst_amount > 0) {
            summaryData.push(['GST Amount', `₹${quotation.gst_amount?.toFixed(2)}`]);
        }

        summaryData.push(['Grand Total', `₹${quotation.grand_total?.toFixed(2) || '0.00'}`]);

        if (quotation.round_off !== undefined && quotation.round_off !== 0) {
            summaryData.push(['Round Off', `${quotation.round_off > 0 ? '+' : ''}₹${quotation.round_off?.toFixed(2)}`]);
        }

        summaryData.push(['Net Payable', `₹${quotation.net_amount_payable?.toFixed(2) || '0.00'}`]);

        if (quotation.notes) {
            summaryData.push([], ['Notes'], [quotation.notes]);
        }

        // Combine all data
        const worksheetData = [...headerData, ...itemsData, ...summaryData];

        // Create worksheet
        const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

        // Set column widths
        worksheet['!cols'] = [
            { wch: 5 },   // #
            { wch: 30 },  // Product
            { wch: 15 },  // Product Code
            { wch: 8 },   // Qty
            { wch: 12 },  // MRP
            { wch: 12 },  // Discount
            { wch: 12 },  // Net Rate
            { wch: 15 }   // Total
        ];

        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Quotation');

        // Generate buffer
        const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        // Set response headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=Quotation_${quotation.quotation_no}.xlsx`);

        // Send the file
        res.send(excelBuffer);

    } catch (error) {
        console.error('Error generating Excel:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate Excel file',
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

// Get filtered quotations by company, party, and site
export const getFilteredQuotations = async (req, res) => {
    try {
        const { company_id, party_id, site_id } = req.query;

        console.log('Filter Request:', { company_id, party_id, site_id });

        // Build filter query
        const filter = {};

        // Validate and add company_id to filter
        if (!company_id) {
            return res.status(400).json({
                success: false,
                message: 'Company ID is required'
            });
        }
        
        // Check if company_id is valid ObjectId, otherwise search by name
        if (mongoose.Types.ObjectId.isValid(company_id)) {
            filter.company_id = company_id;
        } else {
            filter.company_name = { $regex: company_id, $options: 'i' };
        }

        // Add party_id to filter if provided
        if (party_id) {
            // Party_id might be string like "PTY001" or ObjectId
            // First try to find party by Party_id string field
            const Party = mongoose.model('Party');
            const party = await Party.findOne({ Party_id: party_id });
            
            if (party) {
                filter.party_id = party._id;
                console.log('Found party by Party_id:', party_id, '-> ObjectId:', party._id);
            } else if (mongoose.Types.ObjectId.isValid(party_id)) {
                filter.party_id = party_id;
                console.log('Using party ObjectId directly:', party_id);
            } else {
                console.log('Party not found for:', party_id);
            }
        }

        // Add site_id to filter if provided
        if (site_id) {
            // Site_id might be string like "SITE001" or ObjectId
            const Site = mongoose.model('Site');
            const site = await Site.findOne({ Site_id: site_id });
            
            if (site) {
                filter.site_id = site._id;
                console.log('Found site by Site_id:', site_id, '-> ObjectId:', site._id);
            } else if (mongoose.Types.ObjectId.isValid(site_id)) {
                filter.site_id = site_id;
                console.log('Using site ObjectId directly:', site_id);
            } else {
                console.log('Site not found for:', site_id);
            }
        }

        console.log('Final filter:', filter);

        // Only fetch non-expired and accepted/sent quotations
        filter.status = { $in: ['sent', 'accepted', 'draft'] }; // Added draft for testing
        filter.valid_until = { $gte: new Date() };

        // Execute query with population
        const quotations = await Quotation.find(filter)
            .populate('company_id', 'Company_Name Company_Short_Code Company_Address Company_Gst_No')
            .populate('party_id', 'Party_Billing_Name Party_id Contact_Person Mobile_Number Party_Address')
            .populate('site_id', 'Site_Billing_Name Site_id Contact_Person Mobile_Number Site_Address')
            .populate('created_by', 'User_Name User_Email')
            .sort({ quotation_date: -1 });

        console.log('Found quotations:', quotations.length);

        res.status(200).json({
            success: true,
            message: 'Filtered quotations retrieved successfully',
            data: quotations,
            count: quotations.length,
            filters: {
                company_id,
                party_id: party_id || 'all',
                site_id: site_id || 'all'
            }
        });

    } catch (error) {
        console.error('Error fetching filtered quotations:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch filtered quotations',
            error: error.message
        });
    }
};
