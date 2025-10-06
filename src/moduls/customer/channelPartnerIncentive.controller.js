import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';

// @desc    Upload Channel Partner Incentives from Excel file
// @route   POST /api/incentives/upload-excel
// @access  Protected
export const uploadIncentivesFromExcel = async (req, res, next) => {
  let filePath = null;
  
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No Excel file uploaded' });
    }

    filePath = req.file.path;
    
    // Read Excel file
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    if (data.length === 0) {
      return res.status(400).json({ message: 'Excel file is empty or has no valid data' });
    }

    const results = {
      summary: {
        totalRows: data.length,
        successful: 0,
        failed: 0,
        duplicates: 0
      },
      successful: [],
      failed: [],
      duplicates: []
    };

    // Process each row
    for (let i = 0; i < data.length; i++) {
      try {
        const row = data[i];
        
        // Flexible column mapping
        const incentiveData = {
          CP_id: row['CP_id'] || row['Channel Partner ID'] || row['CP ID'] || row['cp_id'],
          Brand: row['Brand'] || row['brand'] || row['BRAND'],
          Incentive_type: row['Incentive_type'] || row['Incentive Type'] || row['incentive_type'] || row['Type'],
          Incentive_factor: parseFloat(row['Incentive_factor'] || row['Incentive Factor'] || row['incentive_factor'] || row['Factor'] || 0),
          status: row['status'] !== undefined ? Boolean(row['status']) : (row['Status'] !== undefined ? Boolean(row['Status']) : true)
        };

        // Validate required fields
        if (!incentiveData.CP_id || !incentiveData.Brand || !incentiveData.Incentive_type) {
          results.failed.push({
            row: i + 1,
            data: row,
            error: 'Missing required fields: CP_id, Brand, or Incentive_type'
          });
          results.summary.failed++;
          continue;
        }

        // Validate incentive type
        if (!['Percentage', 'Amount'].includes(incentiveData.Incentive_type)) {
          results.failed.push({
            row: i + 1,
            data: row,
            error: 'Incentive_type must be either "Percentage" or "Amount"'
          });
          results.summary.failed++;
          continue;
        }

        // Validate Channel Partner exists
        const { ChannelPartner } = await import('./channelPartner.model.js');
        const channelPartnerExists = await ChannelPartner.findOne({ CP_id: incentiveData.CP_id });
        if (!channelPartnerExists) {
          results.failed.push({
            row: i + 1,
            data: row,
            error: `Channel Partner with CP_id "${incentiveData.CP_id}" not found`
          });
          results.summary.failed++;
          continue;
        }

        // Check for duplicates
        const { ChannelPartnerIncentive } = await import('./channelPartnerIncentive.model.js');
        const existingIncentive = await ChannelPartnerIncentive.findOne({ 
          CP_id: incentiveData.CP_id, 
          Brand: incentiveData.Brand 
        });

        if (existingIncentive) {
          results.duplicates.push({
            row: i + 1,
            data: row,
            existing: existingIncentive,
            error: 'Incentive for this CP_id and Brand combination already exists'
          });
          results.summary.duplicates++;
          continue;
        }

        // Create incentive
        const newIncentive = await ChannelPartnerIncentive.create(incentiveData);
        const populatedIncentive = await ChannelPartnerIncentive.findById(newIncentive._id).populate('channelPartner');
        
        results.successful.push({
          row: i + 1,
          data: populatedIncentive
        });
        results.summary.successful++;

      } catch (error) {
        results.failed.push({
          row: i + 1,
          data: data[i],
          error: error.message
        });
        results.summary.failed++;
      }
    }

    return res.status(200).json({
      success: true,
      message: `Excel upload completed. ${results.summary.successful}/${results.summary.totalRows} Channel Partner Incentives processed successfully`,
      data: results
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error processing Excel file',
      error: error.message
    });
  } finally {
    // Clean up uploaded file
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (cleanupError) {
        console.error('Error cleaning up uploaded file:', cleanupError);
      }
    }
  }
};

// @desc    Generate and download Channel Partner Incentives PDF
// @route   GET /api/incentives/export-pdf
// @access  Protected
export const generateIncentivesPDF = async (req, res, next) => {
  try {
    const { search, cp_id, brand, incentive_type, status } = req.query;
    
    // Build filter
    let filter = {};
    if (cp_id) filter.CP_id = cp_id;
    if (brand) filter.Brand = new RegExp(brand, 'i');
    if (incentive_type) filter.Incentive_type = incentive_type;
    if (status !== undefined) filter.status = status === 'true';
    if (search) {
      filter.$or = [
        { Brand: new RegExp(search, 'i') },
        { CP_id: new RegExp(search, 'i') }
      ];
    }

    // Get incentives from database
    const { ChannelPartnerIncentive } = await import('./channelPartnerIncentive.model.js');
    const incentives = await ChannelPartnerIncentive.find(filter)
      .populate('channelPartner')
      .sort({ CP_id: 1, Brand: 1 });

    if (incentives.length === 0) {
      return res.status(404).json({ message: 'No incentives found to export' });
    }

    // Dynamic import for jsPDF to handle ES modules
    const jsPDFModule = await import('jspdf');
    const jsPDF = jsPDFModule.jsPDF || jsPDFModule.default;
    
    // Import autoTable
    await import('jspdf-autotable');

    // Create PDF
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'pt',
      format: 'a4'
    });

    // Add title
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text('Channel Partner Incentives Report', 40, 40);

    // Add generation date
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 40, 60);
    doc.text(`Total Records: ${incentives.length}`, 40, 75);

    // Prepare table data
    const tableColumns = [
      'CP ID',
      'CP Name', 
      'Brand',
      'Incentive Type',
      'Incentive Factor',
      'Status',
      'Created Date'
    ];

    const tableRows = incentives.map(incentive => [
      incentive.CP_id,
      incentive.channelPartner?.CP_Name || 'N/A',
      incentive.Brand,
      incentive.Incentive_type,
      incentive.Incentive_type === 'Percentage' ? `${incentive.Incentive_factor}%` : `₹${incentive.Incentive_factor}`,
      incentive.status ? 'Active' : 'Inactive',
      new Date(incentive.createdAt).toLocaleDateString()
    ]);

    // Add table
    doc.autoTable({
      head: [tableColumns],
      body: tableRows,
      startY: 90,
      styles: {
        fontSize: 8,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      margin: { top: 90, left: 40, right: 40 },
      columnStyles: {
        0: { cellWidth: 60 },  // CP ID
        1: { cellWidth: 100 }, // CP Name
        2: { cellWidth: 80 },  // Brand  
        3: { cellWidth: 80 },  // Incentive Type
        4: { cellWidth: 70 },  // Incentive Factor
        5: { cellWidth: 50 },  // Status
        6: { cellWidth: 70 }   // Created Date
      }
    });

    // Set response headers
    const filename = `channel_partner_incentives_${new Date().toISOString().split('T')[0]}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Send PDF
    const pdfBuffer = doc.output('arraybuffer');
    res.send(Buffer.from(pdfBuffer));

  } catch (error) {
    console.error('PDF generation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error generating PDF',
      error: error.message
    });
  }
};

// @desc    Change status (active/inactive) of a Channel Partner Incentive
// @route   PATCH /api/incentives/:id/status
// @access  Protected
export const changeIncentiveStatus = async (req, res, next) => {
  try {
    // Import models
    const { ChannelPartnerIncentive } = await import('./channelPartnerIncentive.model.js');

    const { id } = req.params;
    const { status } = req.body;
    if (typeof status !== 'boolean') {
      return res.status(400).json({ message: 'Status must be a boolean (true or false)' });
    }
    const updated = await ChannelPartnerIncentive.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    ).populate('channelPartner');
    if (!updated) {
      return res.status(404).json({ message: 'Channel Partner Incentive not found' });
    }
    return res.status(200).json({
      message: `Channel Partner Incentive status updated to ${status ? 'active' : 'inactive'}`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create Channel Partner with Incentive (Combined)
// @route   POST /api/incentives/create-with-partner
// @access  Protected
export const createChannelPartnerWithIncentive = async (req, res, next) => {
  try {
    // Import models
    const { ChannelPartner } = await import('./channelPartner.model.js');
    const { ChannelPartnerIncentive } = await import('./channelPartnerIncentive.model.js');

    const { 
      // Channel Partner fields
      cp_name,
      mobile,
      email,
      cp_address,
      // Incentive fields
      brand,
      incentive_type,
      incentive_factor,
      status = true
    } = req.body;

    // Validate required fields
    if (!cp_name || !mobile || !cp_address || !brand || !incentive_type || !incentive_factor) {
      return res.status(400).json({ 
        message: 'Missing required fields: cp_name, mobile, cp_address, brand, incentive_type, incentive_factor' 
      });
    }

    // Check if Channel Partner with same name or mobile already exists
    const existingPartner = await ChannelPartner.findOne({
      $or: [
        { CP_Name: cp_name },
        { 'Mobile Number': mobile }
      ]
    });

    if (existingPartner) {
      return res.status(400).json({ 
        message: 'Channel Partner with this name or mobile number already exists' 
      });
    }

    // Create Channel Partner
    const channelPartnerData = {
      CP_Name: cp_name,
      'Mobile Number': mobile,
      'Email id': email || undefined,
      CP_Address: cp_address,
      Image: req.body.Image, // This will be set by upload middleware if image is uploaded
      status: status
    };

    const newChannelPartner = await ChannelPartner.create(channelPartnerData);

    // Create Incentive for the new Channel Partner
    const incentiveData = {
      CP_id: newChannelPartner.CP_id,
      Brand: brand,
      Image: req.body.Image, // Same image can be used for both or separate if needed
      Incentive_type: incentive_type === 'Fixed Amount' ? 'Amount' : incentive_type, // Convert frontend value
      Incentive_factor: parseFloat(incentive_factor),
      status: status
    };

    const newIncentive = await ChannelPartnerIncentive.create(incentiveData);

    // Populate the incentive with channel partner details
    const populatedIncentive = await ChannelPartnerIncentive.findById(newIncentive._id).populate('channelPartner');

    return res.status(201).json({
      message: 'Channel Partner and Incentive created successfully',
      data: {
        channelPartner: newChannelPartner,
        incentive: populatedIncentive
      }
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Channel Partner Incentive Management (Create, Read, Update, Delete)
// @route   POST /api/incentives (Create incentive)
// @route   GET /api/incentives (Get All incentives with filters)
// @route   GET /api/incentives/:id (Get incentive by ID)
// @route   PUT /api/incentives/:id (Update incentive)
// @route   DELETE /api/incentives/:id (Delete incentive)
// @access  Protected
export const manageIncentives = async (req, res, next) => {
  try {
    // Import models
    const { ChannelPartner } = await import('./channelPartner.model.js');
    const { ChannelPartnerIncentive } = await import('./channelPartnerIncentive.model.js');

    const { method } = req;
    const { id } = req.params;

    switch (method) {
      case 'POST':
        // CREATE CHANNEL PARTNER INCENTIVE
        const { CP_Name, Brand, Incentive_type, Incentive_factor, status = true } = req.body;

        // Find Channel Partner by name
        const channelPartner = await ChannelPartner.findOne({ CP_Name });
        if (!channelPartner) {
          return res.status(404).json({ message: 'Channel Partner not found with the provided name' });
        }

        // Check if Channel Partner is active
        if (!channelPartner.status) {
          return res.status(400).json({ message: 'Cannot create incentive for inactive Channel Partner' });
        }

        // Check if incentive for this brand already exists for this channel partner
        const existingIncentive = await ChannelPartnerIncentive.findOne({ CP_id: channelPartner.CP_id, Brand });
        if (existingIncentive) {
          return res.status(400).json({ message: 'Incentive for this brand already exists for this Channel Partner' });
        }

        const newIncentive = await ChannelPartnerIncentive.create({
          CP_id: channelPartner.CP_id, // Use the CP_id from found Channel Partner
          Brand, 
          Image: req.body.Image, // This will be set by upload middleware if image is uploaded
          Incentive_type, 
          Incentive_factor,
          status,
        });

        // Populate channel partner details
        const populatedIncentive = await ChannelPartnerIncentive.findById(newIncentive._id).populate('channelPartner');

        return res.status(201).json({
          message: 'Channel Partner Incentive created successfully',
          data: populatedIncentive,
        });

      case 'GET':
        if (id) {
          // GET INCENTIVE BY ID
          const incentive = await ChannelPartnerIncentive.findById(id).populate('channelPartner');
          if (!incentive) {
            return res.status(404).json({ message: 'Channel Partner Incentive not found' });
          }

          return res.status(200).json({
            message: 'Channel Partner Incentive retrieved successfully',
            data: incentive,
          });
        } else {
          // GET ALL INCENTIVES WITH FILTERS
          const { cp_id, brand, incentive_type, status, search } = req.query;
          let filter = {};

          // Apply filters based on query parameters
          if (cp_id) filter.CP_id = cp_id;
          if (brand) filter.Brand = new RegExp(brand, 'i');
          if (incentive_type) filter.Incentive_type = incentive_type;
          if (status !== undefined) filter.status = status === 'true';
          if (search) {
            filter.$or = [
              { Brand: new RegExp(search, 'i') },
              { CP_id: new RegExp(search, 'i') }
            ];
          }

          const incentives = await ChannelPartnerIncentive.find(filter)
            .populate('channelPartner')
            .sort({ Brand: 1 });

          return res.status(200).json({
            message: `Channel Partner Incentives retrieved successfully${Object.keys(filter).length ? ' with filters' : ''}`,
            count: incentives.length,
            filters: filter,
            data: incentives,
          });
        }

      case 'PUT':
        // UPDATE INCENTIVE
        if (!id) {
          return res.status(400).json({ message: 'Incentive ID is required for update' });
        }

        // Check if the incentive exists
        const existingIncentiveForUpdate = await ChannelPartnerIncentive.findById(id);
        if (!existingIncentiveForUpdate) {
          return res.status(404).json({ message: 'Channel Partner Incentive not found' });
        }

        // If CP_Name is being updated, check if the new Channel Partner exists and is active
        const { CP_Name: newCP_Name, Brand: newBrand } = req.body;
        let newCP_id = null;
        
        if (newCP_Name) {
          const newChannelPartner = await ChannelPartner.findOne({ CP_Name: newCP_Name });
          if (!newChannelPartner) {
            return res.status(404).json({ message: 'Channel Partner not found with the provided name' });
          }
          if (!newChannelPartner.status) {
            return res.status(400).json({ message: 'Cannot assign incentive to inactive Channel Partner' });
          }
          newCP_id = newChannelPartner.CP_id;
        }

        // If CP_Name or Brand is being updated, check for conflicts
        if (newCP_Name || newBrand) {
          const checkCP_id = newCP_id || existingIncentiveForUpdate.CP_id;
          const checkBrand = newBrand || existingIncentiveForUpdate.Brand;
          
          const conflictingIncentive = await ChannelPartnerIncentive.findOne({ 
            CP_id: checkCP_id, 
            Brand: checkBrand,
            _id: { $ne: id }
          });
          
          if (conflictingIncentive) {
            return res.status(400).json({ message: 'Incentive for this brand already exists for this Channel Partner' });
          }
        }

        // Prepare update data
        const updateData = { ...req.body };
        if (newCP_id) {
          updateData.CP_id = newCP_id;
          delete updateData.CP_Name; // Remove CP_Name from update data since we store CP_id
        }

        const updatedIncentive = await ChannelPartnerIncentive.findByIdAndUpdate(
          id,
          updateData,
          { new: true, runValidators: true }
        ).populate('channelPartner');

        return res.status(200).json({
          message: 'Channel Partner Incentive updated successfully',
          data: updatedIncentive,
        });

      case 'DELETE':
        // DELETE INCENTIVE
        if (!id) {
          return res.status(400).json({ message: 'Incentive ID is required for deletion' });
        }

        const deletedIncentive = await ChannelPartnerIncentive.findByIdAndDelete(id).populate('channelPartner');
        if (!deletedIncentive) {
          return res.status(404).json({ message: 'Channel Partner Incentive not found' });
        }

        return res.status(200).json({
          message: 'Channel Partner Incentive deleted successfully',
          data: deletedIncentive,
        });

      default:
        return res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get incentives by Channel Partner ID
// @route   GET /api/incentives/partner/:cpId
// @access  Protected
export const getIncentivesByPartnerId = async (req, res, next) => {
  try {
    // Import models
    const { ChannelPartner } = await import('./channelPartner.model.js');
    const { ChannelPartnerIncentive } = await import('./channelPartnerIncentive.model.js');

    const { cpId } = req.params;
    const { status } = req.query;

    // Check if Channel Partner exists
    const channelPartner = await ChannelPartner.findOne({ CP_id: cpId });
    if (!channelPartner) {
      return res.status(404).json({ message: 'Channel Partner not found' });
    }

    // Build filter
    let filter = { CP_id: cpId };
    if (status !== undefined) {
      filter.status = status === 'true';
    }

    // Get all incentives for this channel partner
    const incentives = await ChannelPartnerIncentive.find(filter)
      .populate('channelPartner')
      .sort({ Brand: 1 });

    return res.status(200).json({
      message: 'Channel Partner Incentives retrieved successfully',
      partner: channelPartner,
      count: incentives.length,
      data: incentives,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete all incentives for a Channel Partner
// @route   DELETE /api/incentives/partner/:cpId
// @access  Protected
export const deleteIncentivesByPartnerId = async (req, res, next) => {
  try {
    // Import models
    const { ChannelPartner } = await import('./channelPartner.model.js');
    const { ChannelPartnerIncentive } = await import('./channelPartnerIncentive.model.js');

    const { cpId } = req.params;

    // Check if Channel Partner exists
    const channelPartner = await ChannelPartner.findOne({ CP_id: cpId });
    if (!channelPartner) {
      return res.status(404).json({ message: 'Channel Partner not found' });
    }

    // Delete all incentives for this channel partner
    const deleteResult = await ChannelPartnerIncentive.deleteMany({ CP_id: cpId });

    return res.status(200).json({
      message: `All incentives for Channel Partner ${cpId} deleted successfully`,
      deletedCount: deleteResult.deletedCount,
      partner: channelPartner,
    });
  } catch (error) {
    next(error);
  }
};