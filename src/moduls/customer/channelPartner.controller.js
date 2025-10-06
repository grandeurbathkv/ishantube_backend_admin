import { ChannelPartner } from './channelPartner.model.js';
import XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';

// @desc    Get all Channel Partner IDs and Names for dropdown
// @route   GET /api/channelpartner/dropdown
// @access  Protected
export const getChannelPartnerDropdown = async (req, res, next) => {
  try {
    const dropdown = await ChannelPartner.getIdNameDropdown();
    return res.status(200).json({
      message: 'Channel Partner dropdown data',
      data: dropdown,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Channel Partner CRUD Operations (Create, Read, Update, Delete)
// @route   POST /api/channelpartner (Create)
// @route   GET /api/channelpartner (Get All with filters)
// @route   GET /api/channelpartner/:id (Get by ID)
// @route   PUT /api/channelpartner/:id (Update)
// @route   DELETE /api/channelpartner/:id (Delete)
// @access  Protected
export const manageChannelPartners = async (req, res, next) => {
  try {
    const { method } = req;
    const { id } = req.params;

    switch (method) {
      case 'POST':
        // CREATE CHANNEL PARTNER
        const { 
          CP_Name, 'Mobile Number': mobileNumber, 'Email id': email, 
          Image, CP_Address, status 
        } = req.body;

        const newChannelPartner = await ChannelPartner.create({
          CP_Name, 'Mobile Number': mobileNumber, 'Email id': email,
          Image, CP_Address, status: status !== undefined ? status : true,
        });

        return res.status(201).json({
          message: 'Channel Partner created successfully',
          data: newChannelPartner,
        });

      case 'GET':
        if (id) {
          // GET CHANNEL PARTNER BY ID
          const channelPartner = await ChannelPartner.findOne({ CP_id: id });
          if (!channelPartner) {
            return res.status(404).json({ message: 'Channel Partner not found' });
          }

          // Get incentives for this channel partner
          const { ChannelPartnerIncentive } = await import('./channelPartnerIncentive.model.js');
          const incentives = await ChannelPartnerIncentive.find({ CP_id: id });

          return res.status(200).json({
            message: 'Channel Partner retrieved successfully',
            data: {
              partner: {
                ...channelPartner.toObject(),
                incentives: incentives || []
              },
            },
          });
        } else {
          // GET ALL CHANNEL PARTNERS WITH FILTERS
          const { search } = req.query;
          let filter = {};

          // Apply search filter
          if (search) {
            filter.$or = [
              { CP_Name: new RegExp(search, 'i') },
              { CP_id: new RegExp(search, 'i') },
              { 'Email id': new RegExp(search, 'i') },
              { CP_Address: new RegExp(search, 'i') },
              { 'Mobile Number': new RegExp(search, 'i') }
            ];
          }

          const channelPartners = await ChannelPartner.find(filter).sort({ CP_Name: 1 });

          // Get incentives for all channel partners
          const { ChannelPartnerIncentive } = await import('./channelPartnerIncentive.model.js');
          
          // Create a response with incentive data
          const partnersWithIncentives = await Promise.all(
            channelPartners.map(async (partner) => {
              const incentives = await ChannelPartnerIncentive.find({ CP_id: partner.CP_id });
              return {
                ...partner.toObject(),
                incentives: incentives || []
              };
            })
          );

          return res.status(200).json({
            message: `Channel Partners retrieved successfully${Object.keys(filter).length ? ' with filters' : ''}`,
            count: partnersWithIncentives.length,
            filters: filter,
            data: partnersWithIncentives,
          });
        }

      case 'PUT':
        // UPDATE CHANNEL PARTNER
        if (!id) {
          return res.status(400).json({ message: 'Channel Partner ID is required for update' });
        }

        const updatedPartner = await ChannelPartner.findOneAndUpdate(
          { CP_id: id },
          req.body,
          { new: true, runValidators: true }
        );

        if (!updatedPartner) {
          return res.status(404).json({ message: 'Channel Partner not found' });
        }

        return res.status(200).json({
          message: 'Channel Partner updated successfully',
          data: updatedPartner,
        });

      case 'DELETE':
        // DELETE CHANNEL PARTNER
        if (!id) {
          return res.status(400).json({ message: 'Channel Partner ID is required for deletion' });
        }

        const deletedPartner = await ChannelPartner.findOneAndDelete({ CP_id: id });
        if (!deletedPartner) {
          return res.status(404).json({ message: 'Channel Partner not found' });
        }

        return res.status(200).json({
          message: 'Channel Partner deleted successfully',
          data: deletedPartner,
        });

      default:
        return res.status(405).json({ message: 'Method not allowed' });
    }
    } catch (error) {
      next(error);
    }
  };

// @desc    Upload Channel Partners from Excel file
// @route   POST /api/channelpartner/upload-excel
// @access  Protected
export const uploadChannelPartnersFromExcel = async (req, res, next) => {
  try {
    console.log('Excel upload initiated...');
    
    // Check if file is uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Excel file is required'
      });
    }

    // Validate file type
    const allowedExtensions = ['.xlsx', '.xls'];
    const fileExtension = path.extname(req.file.originalname).toLowerCase();
    
    if (!allowedExtensions.includes(fileExtension)) {
      return res.status(400).json({
        success: false,
        message: 'Only .xlsx and .xls files are allowed'
      });
    }

    console.log('Reading Excel file...');
    
    // Read Excel file
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0]; // Get first sheet
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    
    if (!jsonData || jsonData.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Excel file is empty or has no valid data'
      });
    }

    console.log(`Found ${jsonData.length} rows in Excel file`);

    // Validate and process data
    const results = {
      successful: [],
      failed: [],
      duplicates: [],
      totalRows: jsonData.length
    };

    // Expected columns (flexible mapping)
    const columnMapping = {
      'CP_Name': ['CP_Name', 'Channel Partner Name', 'Name', 'Partner Name'],
      'Mobile Number': ['Mobile Number', 'Mobile', 'Phone', 'Contact Number'],
      'Email id': ['Email id', 'Email', 'Email ID', 'Email Address'],
      'CP_Address': ['CP_Address', 'Address', 'Channel Partner Address'],
      'status': ['status', 'Status', 'Active', 'Is Active']
    };

    // Helper function to find column value
    const findColumnValue = (row, fieldName) => {
      const possibleColumns = columnMapping[fieldName] || [fieldName];
      for (const col of possibleColumns) {
        if (row[col] !== undefined && row[col] !== null && row[col] !== '') {
          return row[col];
        }
      }
      return null;
    };

    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      const rowNumber = i + 2; // Excel row number (considering header)

      try {
        // Extract data from row
        const CP_Name = findColumnValue(row, 'CP_Name');
        const mobileNumber = findColumnValue(row, 'Mobile Number');
        const email = findColumnValue(row, 'Email id');
        const address = findColumnValue(row, 'CP_Address');
        const status = findColumnValue(row, 'status');

        // Validate required fields
        if (!CP_Name || !CP_Name.toString().trim()) {
          results.failed.push({
            row: rowNumber,
            data: row,
            error: 'CP_Name is required'
          });
          continue;
        }

        if (!mobileNumber || !mobileNumber.toString().trim()) {
          results.failed.push({
            row: rowNumber,
            data: row,
            error: 'Mobile Number is required'
          });
          continue;
        }

        if (!address || !address.toString().trim()) {
          results.failed.push({
            row: rowNumber,
            data: row,
            error: 'CP_Address is required'
          });
          continue;
        }

        // Validate mobile number format
        const cleanMobile = mobileNumber.toString().trim();
        if (!/^\d{10}$/.test(cleanMobile)) {
          results.failed.push({
            row: rowNumber,
            data: row,
            error: 'Mobile Number must be 10 digits'
          });
          continue;
        }

        // Check for duplicates by mobile number and name combination
        const existingPartner = await ChannelPartner.findOne({
          $or: [
            { 'Mobile Number': cleanMobile },
            { CP_Name: CP_Name.toString().trim() }
          ]
        });

        if (existingPartner) {
          results.duplicates.push({
            row: rowNumber,
            data: row,
            existing: existingPartner,
            error: 'Channel Partner with this name or mobile number already exists'
          });
          continue;
        }

        // Prepare data for creation
        const partnerData = {
          CP_Name: CP_Name.toString().trim(),
          'Mobile Number': cleanMobile,
          CP_Address: address.toString().trim(),
          status: status !== undefined ? (status === true || status === 'true' || status === 1 || status === '1') : true
        };

        // Add email if provided and valid
        if (email && email.toString().trim()) {
          const emailStr = email.toString().trim().toLowerCase();
          if (/.+@.+\..+/.test(emailStr)) {
            partnerData['Email id'] = emailStr;
          }
        }

        // Create Channel Partner
        const newPartner = await ChannelPartner.create(partnerData);
        
        results.successful.push({
          row: rowNumber,
          data: newPartner
        });

        console.log(`Row ${rowNumber}: Successfully created Channel Partner ${newPartner.CP_id}`);

      } catch (error) {
        console.error(`Row ${rowNumber} error:`, error.message);
        results.failed.push({
          row: rowNumber,
          data: row,
          error: error.message
        });
      }
    }

    // Clean up uploaded file
    try {
      fs.unlinkSync(req.file.path);
    } catch (cleanupError) {
      console.warn('Could not delete uploaded file:', cleanupError.message);
    }

    console.log('Excel upload completed:', {
      total: results.totalRows,
      successful: results.successful.length,
      failed: results.failed.length,
      duplicates: results.duplicates.length
    });

    return res.status(200).json({
      success: true,
      message: `Excel upload completed. ${results.successful.length}/${results.totalRows} records processed successfully`,
      data: {
        summary: {
          totalRows: results.totalRows,
          successful: results.successful.length,
          failed: results.failed.length,
          duplicates: results.duplicates.length
        },
        successful: results.successful,
        failed: results.failed,
        duplicates: results.duplicates
      }
    });

  } catch (error) {
    console.error('Excel upload error:', error);
    
    // Clean up uploaded file in case of error
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.warn('Could not delete uploaded file after error:', cleanupError.message);
      }
    }
    
    next(error);
  }
};

// @desc    Generate and download Channel Partners PDF
// @route   GET /api/channelpartner/export-pdf
// @access  Protected
export const generateChannelPartnersPDF = async (req, res, next) => {
  try {
    console.log('PDF generation initiated...');
    
    // Dynamic import of jsPDF to handle ES module compatibility
    const jsPDFModule = await import('jspdf');
    const jsPDF = jsPDFModule.jsPDF || jsPDFModule.default;
    await import('jspdf-autotable');
    
    // Get query parameters for filtering
    const { search, includeIncentives = 'false' } = req.query;
    let filter = {};

    // Apply search filter if provided
    if (search) {
      filter.$or = [
        { CP_Name: new RegExp(search, 'i') },
        { CP_id: new RegExp(search, 'i') },
        { 'Email id': new RegExp(search, 'i') },
        { CP_Address: new RegExp(search, 'i') },
        { 'Mobile Number': new RegExp(search, 'i') }
      ];
    }

    // Fetch channel partners data
    const channelPartners = await ChannelPartner.find(filter).sort({ CP_Name: 1 });

    if (!channelPartners || channelPartners.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No Channel Partners found to export'
      });
    }

    console.log(`Generating PDF for ${channelPartners.length} Channel Partners`);

    // Create new PDF document
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    // Add title
    doc.setFontSize(20);
    doc.setTextColor(40, 116, 166);
    doc.text('Channel Partners Report', 14, 20);

    // Add generation date and filter info
    doc.setFontSize(10);
    doc.setTextColor(100);
    const currentDate = new Date().toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    doc.text(`Generated on: ${currentDate}`, 14, 28);
    
    if (search) {
      doc.text(`Filter applied: "${search}"`, 14, 33);
    }
    
    doc.text(`Total Records: ${channelPartners.length}`, 14, search ? 38 : 33);

    // Prepare table data
    const tableColumns = [
      'S.No.',
      'CP ID',
      'Partner Name',
      'Mobile Number',
      'Email ID',
      'Address',
      'Status'
    ];

    const tableRows = channelPartners.map((partner, index) => [
      (index + 1).toString(),
      partner.CP_id || '-',
      partner.CP_Name || '-',
      partner['Mobile Number'] || '-',
      partner['Email id'] || '-',
      partner.CP_Address || '-',
      partner.status ? 'Active' : 'Inactive'
    ]);

    // Add table to PDF
    doc.autoTable({
      head: [tableColumns],
      body: tableRows,
      startY: search ? 45 : 40,
      theme: 'striped',
      headStyles: {
        fillColor: [40, 116, 166],
        textColor: 255,
        fontStyle: 'bold'
      },
      bodyStyles: {
        textColor: 50
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      columnStyles: {
        0: { cellWidth: 15, halign: 'center' }, // S.No.
        1: { cellWidth: 25, halign: 'center' }, // CP ID
        2: { cellWidth: 45, halign: 'left' },   // Partner Name
        3: { cellWidth: 30, halign: 'center' }, // Mobile
        4: { cellWidth: 50, halign: 'left' },   // Email
        5: { cellWidth: 70, halign: 'left' },   // Address
        6: { cellWidth: 20, halign: 'center' }  // Status
      },
      styles: {
        fontSize: 8,
        cellPadding: 3
      },
      margin: { top: 10, left: 14, right: 14 }
    });

    // Add incentives data if requested
    if (includeIncentives === 'true') {
      try {
        const { ChannelPartnerIncentive } = await import('./channelPartnerIncentive.model.js');
        
        // Add new page for incentives
        doc.addPage();
        
        // Add incentives title
        doc.setFontSize(16);
        doc.setTextColor(40, 116, 166);
        doc.text('Channel Partner Incentives', 14, 20);

        // Get all incentives for the filtered partners
        const cpIds = channelPartners.map(partner => partner.CP_id);
        const incentives = await ChannelPartnerIncentive.find({ CP_id: { $in: cpIds } }).sort({ CP_id: 1 });

        if (incentives && incentives.length > 0) {
          const incentiveColumns = [
            'S.No.',
            'CP ID',
            'Partner Name',
            'Brand',
            'Incentive Type',
            'Incentive Factor',
            'Status'
          ];

          const incentiveRows = incentives.map((incentive, index) => {
            const partner = channelPartners.find(p => p.CP_id === incentive.CP_id);
            return [
              (index + 1).toString(),
              incentive.CP_id || '-',
              partner ? partner.CP_Name : '-',
              incentive.Brand || '-',
              incentive.Incentive_type || '-',
              incentive.Incentive_factor ? 
                (incentive.Incentive_type === 'Percentage' ? `${incentive.Incentive_factor}%` : `₹${incentive.Incentive_factor}`) 
                : '-',
              incentive.status ? 'Active' : 'Inactive'
            ];
          });

          doc.autoTable({
            head: [incentiveColumns],
            body: incentiveRows,
            startY: 30,
            theme: 'striped',
            headStyles: {
              fillColor: [76, 175, 80],
              textColor: 255,
              fontStyle: 'bold'
            },
            bodyStyles: {
              textColor: 50
            },
            alternateRowStyles: {
              fillColor: [245, 245, 245]
            },
            columnStyles: {
              0: { cellWidth: 15, halign: 'center' },
              1: { cellWidth: 25, halign: 'center' },
              2: { cellWidth: 50, halign: 'left' },
              3: { cellWidth: 40, halign: 'left' },
              4: { cellWidth: 35, halign: 'center' },
              5: { cellWidth: 35, halign: 'center' },
              6: { cellWidth: 25, halign: 'center' }
            },
            styles: {
              fontSize: 8,
              cellPadding: 3
            },
            margin: { top: 10, left: 14, right: 14 }
          });
        } else {
          doc.setFontSize(12);
          doc.setTextColor(100);
          doc.text('No incentives found for the selected Channel Partners.', 14, 40);
        }
      } catch (incentiveError) {
        console.warn('Could not load incentives data:', incentiveError.message);
      }
    }

    // Add footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(
        `Page ${i} of ${pageCount} | Generated by IshanthTube Admin System`,
        14,
        doc.internal.pageSize.height - 10
      );
    }

    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const filename = `channel-partners-${timestamp}.pdf`;

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Send PDF
    const pdfOutput = doc.output();
    res.send(Buffer.from(pdfOutput, 'binary'));

    console.log(`PDF generated successfully: ${filename}`);

  } catch (error) {
    console.error('PDF generation error:', error);
    next(error);
  }
};