import Company from './company.model.js';
import XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

/**
 * @desc    Get all companies with pagination, search, and sorting
 * @route   GET /api/company
 * @access  Private
 */
export const getAllCompanies = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      sortBy = 'createdAt',
      sortOrder = 'desc',
      status = '',
    } = req.query;

    // Build search query
    const query = {};

    // Search across multiple fields
    if (search) {
      query.$or = [
        { Company_Short_Code: { $regex: search, $options: 'i' } },
        { Company_Name: { $regex: search, $options: 'i' } },
        { Company_Phone_Number: { $regex: search, $options: 'i' } },
        { Company_Gstno: { $regex: search, $options: 'i' } },
        { Company_Bank: { $regex: search, $options: 'i' } },
      ];
    }

    // Filter by status
    if (status) {
      query.status = status;
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Execute query
    const companies = await Company.find(query)
      .populate('created_by', 'User_Name Email_id')
      .sort(sort)
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    // Get total count
    const total = await Company.countDocuments(query);

    res.status(200).json({
      success: true,
      data: companies,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching companies:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching companies',
      error: error.message,
    });
  }
};

/**
 * @desc    Get single company by ID
 * @route   GET /api/company/:id
 * @access  Private
 */
export const getCompanyById = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id)
      .populate('created_by', 'User_Name Email_id');

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found',
      });
    }

    res.status(200).json({
      success: true,
      data: company,
    });
  } catch (error) {
    console.error('Error fetching company:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching company',
      error: error.message,
    });
  }
};

/**
 * @desc    Create new company
 * @route   POST /api/company
 * @access  Private
 */
export const createCompany = async (req, res) => {
  try {
    const {
      Company_Short_Code,
      Company_Name,
      Company_Address1,
      Company_Address2,
      Company_Address3,
      Company_Phone_Number,
      Company_Gstno,
      Company_Bank,
      Company_Bank_Branch,
      Company_Bank_Ifsc,
      Company_Account_No,
      status,
    } = req.body;

    // Check if company with same code already exists
    const existingCompanyCode = await Company.findOne({ Company_Short_Code });
    if (existingCompanyCode) {
      return res.status(400).json({
        success: false,
        message: 'Company with this Short Code already exists',
      });
    }

    // Check if company with same name already exists
    const existingCompanyName = await Company.findOne({ Company_Name });
    if (existingCompanyName) {
      return res.status(400).json({
        success: false,
        message: 'Company with this Name already exists',
      });
    }

    // Check if company with same GST number already exists
    const existingCompanyGst = await Company.findOne({ Company_Gstno });
    if (existingCompanyGst) {
      return res.status(400).json({
        success: false,
        message: 'Company with this GST Number already exists',
      });
    }

    // Create new company
    const company = await Company.create({
      Company_Short_Code: Company_Short_Code.toUpperCase(),
      Company_Name,
      Company_Address1,
      Company_Address2,
      Company_Address3,
      Company_Phone_Number,
      Company_Gstno: Company_Gstno.toUpperCase(),
      Company_Bank,
      Company_Bank_Branch,
      Company_Bank_Ifsc: Company_Bank_Ifsc ? Company_Bank_Ifsc.toUpperCase() : '',
      Company_Account_No,
      status: status || 'Active',
      created_by: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: 'Company created successfully',
      data: company,
    });
  } catch (error) {
    console.error('Error creating company:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: messages[0],
        errors: messages,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error creating company',
      error: error.message,
    });
  }
};

/**
 * @desc    Update company
 * @route   PUT /api/company/:id
 * @access  Private
 */
export const updateCompany = async (req, res) => {
  try {
    const {
      Company_Short_Code,
      Company_Name,
      Company_Address1,
      Company_Address2,
      Company_Address3,
      Company_Phone_Number,
      Company_Gstno,
      Company_Bank,
      Company_Bank_Branch,
      Company_Bank_Ifsc,
      Company_Account_No,
      status,
    } = req.body;

    // Find company
    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found',
      });
    }

    // Check if Short Code is being changed and if it already exists
    if (Company_Short_Code && Company_Short_Code !== company.Company_Short_Code) {
      const existingCode = await Company.findOne({ 
        Company_Short_Code,
        _id: { $ne: req.params.id }
      });
      if (existingCode) {
        return res.status(400).json({
          success: false,
          message: 'Company with this Short Code already exists',
        });
      }
    }

    // Check if Name is being changed and if it already exists
    if (Company_Name && Company_Name !== company.Company_Name) {
      const existingName = await Company.findOne({ 
        Company_Name,
        _id: { $ne: req.params.id }
      });
      if (existingName) {
        return res.status(400).json({
          success: false,
          message: 'Company with this Name already exists',
        });
      }
    }

    // Check if GST Number is being changed and if it already exists
    if (Company_Gstno && Company_Gstno !== company.Company_Gstno) {
      const existingGst = await Company.findOne({ 
        Company_Gstno,
        _id: { $ne: req.params.id }
      });
      if (existingGst) {
        return res.status(400).json({
          success: false,
          message: 'Company with this GST Number already exists',
        });
      }
    }

    // Update company
    const updateData = {
      Company_Short_Code: Company_Short_Code ? Company_Short_Code.toUpperCase() : company.Company_Short_Code,
      Company_Name: Company_Name || company.Company_Name,
      Company_Address1: Company_Address1 || company.Company_Address1,
      Company_Address2: Company_Address2 !== undefined ? Company_Address2 : company.Company_Address2,
      Company_Address3: Company_Address3 !== undefined ? Company_Address3 : company.Company_Address3,
      Company_Phone_Number: Company_Phone_Number || company.Company_Phone_Number,
      Company_Gstno: Company_Gstno ? Company_Gstno.toUpperCase() : company.Company_Gstno,
      Company_Bank: Company_Bank !== undefined ? Company_Bank : company.Company_Bank,
      Company_Bank_Branch: Company_Bank_Branch !== undefined ? Company_Bank_Branch : company.Company_Bank_Branch,
      Company_Bank_Ifsc: Company_Bank_Ifsc ? Company_Bank_Ifsc.toUpperCase() : company.Company_Bank_Ifsc,
      Company_Account_No: Company_Account_No !== undefined ? Company_Account_No : company.Company_Account_No,
      status: status || company.status,
    };

    const updatedCompany = await Company.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('created_by', 'User_Name Email_id');

    res.status(200).json({
      success: true,
      message: 'Company updated successfully',
      data: updatedCompany,
    });
  } catch (error) {
    console.error('Error updating company:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: messages[0],
        errors: messages,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error updating company',
      error: error.message,
    });
  }
};

/**
 * @desc    Delete company
 * @route   DELETE /api/company/:id
 * @access  Private
 */
export const deleteCompany = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found',
      });
    }

    await Company.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Company deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting company:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting company',
      error: error.message,
    });
  }
};

/**
 * @desc    Export companies to Excel
 * @route   GET /api/company/export/excel
 * @access  Private
 */
export const exportCompaniesToExcel = async (req, res) => {
  try {
    const { search = '', status = '' } = req.query;

    // Build query
    const query = {};
    if (search) {
      query.$or = [
        { Company_Short_Code: { $regex: search, $options: 'i' } },
        { Company_Name: { $regex: search, $options: 'i' } },
        { Company_Phone_Number: { $regex: search, $options: 'i' } },
        { Company_Gstno: { $regex: search, $options: 'i' } },
      ];
    }
    if (status) {
      query.status = status;
    }

    // Get all companies (no pagination for export)
    const companies = await Company.find(query)
      .populate('created_by', 'User_Name')
      .sort({ createdAt: -1 })
      .lean();

    // Prepare data for Excel
    const excelData = companies.map((company, index) => ({
      'S.No': index + 1,
      'Company Code': company.Company_Short_Code,
      'Company Name': company.Company_Name,
      'Address Line 1': company.Company_Address1,
      'Address Line 2': company.Company_Address2 || '',
      'Address Line 3': company.Company_Address3 || '',
      'Phone Number': company.Company_Phone_Number,
      'GST Number': company.Company_Gstno,
      'Bank Name': company.Company_Bank || '',
      'Bank Branch': company.Company_Bank_Branch || '',
      'IFSC Code': company.Company_Bank_Ifsc || '',
      'Account Number': company.Company_Account_No || '',
      'Status': company.status,
      'Created By': company.created_by?.User_Name || '',
      'Created At': new Date(company.createdAt).toLocaleDateString('en-IN'),
    }));

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    worksheet['!cols'] = [
      { wch: 6 },  // S.No
      { wch: 15 }, // Company Code
      { wch: 30 }, // Company Name
      { wch: 35 }, // Address Line 1
      { wch: 35 }, // Address Line 2
      { wch: 35 }, // Address Line 3
      { wch: 15 }, // Phone Number
      { wch: 18 }, // GST Number
      { wch: 20 }, // Bank Name
      { wch: 20 }, // Bank Branch
      { wch: 15 }, // IFSC Code
      { wch: 20 }, // Account Number
      { wch: 10 }, // Status
      { wch: 20 }, // Created By
      { wch: 15 }, // Created At
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Companies');

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Set response headers
    res.setHeader('Content-Disposition', `attachment; filename=companies_${Date.now()}.xlsx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    res.send(buffer);
  } catch (error) {
    console.error('Error exporting companies to Excel:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting companies to Excel',
      error: error.message,
    });
  }
};

/**
 * @desc    Export companies to PDF
 * @route   GET /api/company/export/pdf
 * @access  Private
 */
export const exportCompaniesToPDF = async (req, res) => {
  try {
    const { search = '', status = '' } = req.query;

    // Build query
    const query = {};
    if (search) {
      query.$or = [
        { Company_Short_Code: { $regex: search, $options: 'i' } },
        { Company_Name: { $regex: search, $options: 'i' } },
        { Company_Phone_Number: { $regex: search, $options: 'i' } },
        { Company_Gstno: { $regex: search, $options: 'i' } },
      ];
    }
    if (status) {
      query.status = status;
    }

    // Get all companies (no pagination for export)
    const companies = await Company.find(query)
      .populate('created_by', 'User_Name')
      .sort({ createdAt: -1 })
      .lean();

    // Create PDF
    const doc = new jsPDF('l', 'mm', 'a4'); // Landscape orientation

    // Add title
    doc.setFontSize(18);
    doc.text('Company List', 14, 15);

    // Add date
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, 14, 22);

    // Prepare table data
    const tableData = companies.map((company, index) => [
      index + 1,
      company.Company_Short_Code,
      company.Company_Name,
      company.Company_Phone_Number,
      company.Company_Gstno,
      company.Company_Bank || 'N/A',
      company.status,
    ]);

    // Add table
    doc.autoTable({
      startY: 28,
      head: [['S.No', 'Code', 'Company Name', 'Phone', 'GST Number', 'Bank', 'Status']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontSize: 9,
        fontStyle: 'bold',
      },
      bodyStyles: {
        fontSize: 8,
      },
      columnStyles: {
        0: { cellWidth: 12 },
        1: { cellWidth: 25 },
        2: { cellWidth: 60 },
        3: { cellWidth: 30 },
        4: { cellWidth: 40 },
        5: { cellWidth: 40 },
        6: { cellWidth: 20 },
      },
    });

    // Generate PDF buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    // Set response headers
    res.setHeader('Content-Disposition', `attachment; filename=companies_${Date.now()}.pdf`);
    res.setHeader('Content-Type', 'application/pdf');

    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error exporting companies to PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting companies to PDF',
      error: error.message,
    });
  }
};

/**
 * @desc    Import companies from Excel
 * @route   POST /api/company/import/excel
 * @access  Private
 */
export const importCompaniesFromExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an Excel file',
      });
    }

    // Read the Excel file
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (data.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Excel file is empty',
      });
    }

    const results = {
      success: [],
      failed: [],
      total: data.length,
    };

    // Process each row
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      try {
        // Map Excel columns to database fields
        const companyData = {
          Company_Short_Code: row['Company Code'] || row['Company_Short_Code'],
          Company_Name: row['Company Name'] || row['Company_Name'],
          Company_Address1: row['Address Line 1'] || row['Company_Address1'],
          Company_Address2: row['Address Line 2'] || row['Company_Address2'] || '',
          Company_Address3: row['Address Line 3'] || row['Company_Address3'] || '',
          Company_Phone_Number: String(row['Phone Number'] || row['Company_Phone_Number'] || '').replace(/\D/g, ''),
          Company_Gstno: row['GST Number'] || row['Company_Gstno'],
          Company_Bank: row['Bank Name'] || row['Company_Bank'] || '',
          Company_Bank_Branch: row['Bank Branch'] || row['Company_Bank_Branch'] || '',
          Company_Bank_Ifsc: row['IFSC Code'] || row['Company_Bank_Ifsc'] || '',
          Company_Account_No: String(row['Account Number'] || row['Company_Account_No'] || ''),
          status: row['Status'] || 'Active',
          created_by: req.user._id,
        };

        // Validate required fields
        if (!companyData.Company_Short_Code || !companyData.Company_Name || 
            !companyData.Company_Address1 || !companyData.Company_Phone_Number || 
            !companyData.Company_Gstno) {
          results.failed.push({
            row: i + 2, // +2 because Excel starts at 1 and has header
            data: row,
            error: 'Missing required fields',
          });
          continue;
        }

        // Check if company already exists
        const existing = await Company.findOne({
          $or: [
            { Company_Short_Code: companyData.Company_Short_Code.toUpperCase() },
            { Company_Name: companyData.Company_Name },
            { Company_Gstno: companyData.Company_Gstno.toUpperCase() },
          ]
        });

        if (existing) {
          results.failed.push({
            row: i + 2,
            data: row,
            error: 'Company already exists (duplicate Code, Name, or GST)',
          });
          continue;
        }

        // Create company
        const company = await Company.create(companyData);
        results.success.push({
          row: i + 2,
          company: company.Company_Name,
        });

      } catch (error) {
        results.failed.push({
          row: i + 2,
          data: row,
          error: error.message,
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `Import completed. ${results.success.length} companies imported successfully, ${results.failed.length} failed.`,
      results,
    });

  } catch (error) {
    console.error('Error importing companies from Excel:', error);
    res.status(500).json({
      success: false,
      message: 'Error importing companies from Excel',
      error: error.message,
    });
  }
};

/**
 * @desc    Get company analytics/statistics
 * @route   GET /api/company/analytics
 * @access  Private
 */
export const getCompanyAnalytics = async (req, res) => {
  try {
    const totalCompanies = await Company.countDocuments();
    const activeCompanies = await Company.countDocuments({ status: 'Active' });
    const inactiveCompanies = await Company.countDocuments({ status: 'Inactive' });

    // Get companies created in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentCompanies = await Company.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });

    res.status(200).json({
      success: true,
      data: {
        total: totalCompanies,
        active: activeCompanies,
        inactive: inactiveCompanies,
        recentlyAdded: recentCompanies,
      },
    });
  } catch (error) {
    console.error('Error fetching company analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching company analytics',
      error: error.message,
    });
  }
};
