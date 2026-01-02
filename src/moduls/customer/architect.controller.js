import { Architect, ArchType, City, State } from './architect.model.js';
import XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import {
  generateOTP,
  sendWhatsAppOTP,
  validatePhoneNumber,
  storeOTP,
  verifyOTP as verifyStoredOTP,
  clearOTP
} from '../../utils/whatsappHelper.js';

// Helper function to auto-create dropdown values
const autoCreateDropdownValues = async (Arch_type, Arch_city, Arch_state, state_code) => {
  // Auto-create Arch_type if it doesn't exist
  if (Arch_type) {
    const existingType = await ArchType.findOne({ type_name: Arch_type });
    if (!existingType) {
      await ArchType.create({ type_name: Arch_type });
    }
  }

  // Auto-create City if it doesn't exist
  if (Arch_city) {
    const existingCity = await City.findOne({ city_name: Arch_city });
    if (!existingCity) {
      await City.create({ city_name: Arch_city });
    }
  }

  // Auto-create State if it doesn't exist
  if (Arch_state) {
    const existingState = await State.findOne({ state_name: Arch_state });
    if (!existingState) {
      // Always set a unique state_code
      let code = state_code;
      if (!code || code === null || code === '') {
        // Auto-generate code from state name (e.g., first 3 letters, uppercase, no spaces)
        code = Arch_state.replace(/\s+/g, '').substring(0, 3).toUpperCase();
      }
      const stateData = { state_name: Arch_state, state_code: code };
      await State.create(stateData);
    }
  }
};

// @desc    Architect CRUD Operations (Create, Read, Update, Delete)
// @route   POST /api/architect (Create)
// @route   GET /api/architect (Get All with filters)
// @route   GET /api/architect/:id (Get by ID)
// @route   PUT /api/architect/:id (Update)
// @route   DELETE /api/architect/:id (Delete)
// @access  Protected
export const manageArchitects = async (req, res, next) => {
  try {
    const { method } = req;
    const { id } = req.params;

    switch (method) {

      case 'POST': {
        // CREATE ARCHITECT
        const {
          Arch_Name,
          Arch_type,
          Arch_category,
          Image,
          Arch_Address,
          Arch_city,
          Arch_state,
          state_code,
          Mobile,
          Email
        } = req.body;

        // Auto-generate next Arch_id (sequential)
        const lastArchitect = await Architect.findOne({}, {}, { sort: { Arch_id: -1 } });
        let nextIdNum = 1;
        if (lastArchitect && lastArchitect.Arch_id) {
          const match = lastArchitect.Arch_id.match(/ARCH(\d+)/);
          if (match) {
            nextIdNum = parseInt(match[1], 10) + 1;
          }
        }
        const Arch_id = `ARCH${String(nextIdNum).padStart(3, '0')}`;

        // Check if Architect with same name and mobile already exists
        const existingArchitect = await Architect.findOne({ Arch_Name, 'Mobile Number': Mobile });
        if (existingArchitect) {
          return res.status(400).json({ message: 'Architect with this name and mobile number already exists' });
        }

        // Auto-create dropdown values (pass state_code)
        await autoCreateDropdownValues(Arch_type, Arch_city, Arch_state, state_code);

        const newArchitect = await Architect.create({
          Arch_id,
          Arch_Name,
          'Mobile Number': Mobile,
          'Email id': Email,
          Arch_type,
          Arch_category,
          Image,
          Arch_Address,
          Arch_city,
          Arch_state,
          mobileVerified: req.body.mobileVerified === 'true' || req.body.mobileVerified === true,
        });

        return res.status(201).json({
          message: 'Architect created successfully',
          data: {
            ...newArchitect.toObject(),
            mobile: newArchitect['Mobile Number'] || '',
            email: newArchitect['Email id'] || ''
          }
        });
      }

      case 'GET':
        if (id) {
          // GET ARCHITECT BY ID
          const architect = await Architect.findOne({ Arch_id: id });
          if (!architect) {
            return res.status(404).json({ message: 'Architect not found' });
          }
          return res.status(200).json({
            message: 'Architect retrieved successfully',
            data: architect,
          });
        } else {
          // GET ALL ARCHITECTS WITH FILTERS
          const { city, state, type, category, search } = req.query;
          let filter = {};

          // Apply filters based on query parameters
          if (city) filter.Arch_city = new RegExp(city, 'i');
          if (state) filter.Arch_state = new RegExp(state, 'i');
          if (type) filter.Arch_type = new RegExp(type, 'i');
          if (category) filter.Arch_category = category;
          if (search) {
            filter.$or = [
              { Arch_Name: new RegExp(search, 'i') },
              { Arch_id: new RegExp(search, 'i') },
              { 'Email id': new RegExp(search, 'i') },
              { Arch_Address: new RegExp(search, 'i') }
            ];
          }

          const architects = await Architect.find(filter).sort({ Arch_Name: 1 });
          // Ensure Mobile Number and Email id are included in the response
          const architectList = architects.map(a => ({
            Arch_id: a.Arch_id,
            Arch_Name: a.Arch_Name,
            'Mobile Number': a['Mobile Number'],
            'Email id': a['Email id'],
            Arch_type: a.Arch_type,
            Arch_category: a.Arch_category,
            Image: a.Image,
            Arch_Address: a.Arch_Address,
            Arch_city: a.Arch_city,
            Arch_state: a.Arch_state,
            createdAt: a.createdAt,
            updatedAt: a.updatedAt
          }));
          return res.status(200).json({
            message: `Architects retrieved successfully${Object.keys(filter).length ? ' with filters' : ''}`,
            count: architectList.length,
            filters: filter,
            data: architectList,
          });
        }

      case 'PUT':
        // UPDATE ARCHITECT
        if (!id) {
          return res.status(400).json({ message: 'Architect ID is required for update' });
        }

        // Extract state_code from body for update as well
        const { Arch_type, Arch_city, Arch_state, state_code } = req.body;
        await autoCreateDropdownValues(Arch_type, Arch_city, Arch_state, state_code);

        const updatedArchitect = await Architect.findOneAndUpdate(
          { Arch_id: id },
          req.body,
          { new: true, runValidators: true }
        );

        if (!updatedArchitect) {
          return res.status(404).json({ message: 'Architect not found' });
        }

        return res.status(200).json({
          message: 'Architect updated successfully',
          data: updatedArchitect,
        });

      case 'DELETE':
        // DELETE ARCHITECT
        if (!id) {
          return res.status(400).json({ message: 'Architect ID is required for deletion' });
        }

        const deletedArchitect = await Architect.findOneAndDelete({ Arch_id: id });
        if (!deletedArchitect) {
          return res.status(404).json({ message: 'Architect not found' });
        }

        return res.status(200).json({
          message: 'Architect deleted successfully',
          data: deletedArchitect,
        });

      default:
        return res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Dropdown Data Management (Get all dropdown options + Add new options)
// @route   GET /api/architect/dropdown?type=arch-types|cities|states|categories
// @route   POST /api/architect/dropdown (Add new dropdown item)
// @access  Protected
export const manageDropdownData = async (req, res, next) => {
  try {
    const { method } = req;
    const { type } = req.query;

    if (method === 'GET') {
      // GET DROPDOWN DATA
      switch (type) {
        case 'arch-types':
          const archTypes = await ArchType.find({}).sort({ type_name: 1 });
          return res.status(200).json({
            message: 'Architect types retrieved successfully',
            type: 'arch-types',
            count: archTypes.length,
            data: archTypes,
          });

        case 'cities':
          const cities = await City.find({}).sort({ city_name: 1 });
          return res.status(200).json({
            message: 'Cities retrieved successfully',
            type: 'cities',
            count: cities.length,
            data: cities,
          });

        case 'states':
          const states = await State.find({}).sort({ state_name: 1 });
          return res.status(200).json({
            message: 'States retrieved successfully',
            type: 'states',
            count: states.length,
            data: states,
          });

        case 'categories':
          const categories = ['A', 'B', 'C', 'D'];
          return res.status(200).json({
            message: 'Architect categories retrieved successfully',
            type: 'categories',
            count: categories.length,
            data: categories.map(cat => ({ category: cat })),
          });

        default:
          // Return all dropdown data if no specific type requested
          const [allArchTypes, allCities, allStates] = await Promise.all([
            ArchType.find({}).sort({ type_name: 1 }),
            City.find({}).sort({ city_name: 1 }),
            State.find({}).sort({ state_name: 1 })
          ]);

          return res.status(200).json({
            message: 'All dropdown data retrieved successfully',
            data: {
              arch_types: allArchTypes,
              cities: allCities,
              states: allStates,
              categories: ['A', 'B', 'C', 'D'].map(cat => ({ category: cat }))
            },
          });
      }
    } else if (method === 'POST') {
      // ADD NEW DROPDOWN ITEM
      const { dropdown_type, name, description, state_code } = req.body;

      switch (dropdown_type) {
        case 'arch-type':
          const existingType = await ArchType.findOne({ type_name: name });
          if (existingType) {
            return res.status(400).json({ message: 'Architect type already exists' });
          }
          const newArchType = await ArchType.create({ type_name: name, description });
          return res.status(201).json({
            message: 'Architect type added successfully',
            data: newArchType,
          });

        // City create (dropdown POST)
        case 'city':
          if (!name) {
            return res.status(400).json({ message: 'City name is required' });
          }
          const existingCity = await City.findOne({ city_name: name });
          if (existingCity) {
            return res.status(400).json({ message: 'City already exists' });
          }
          // Only set state_code if provided and not empty/null
          const cityData = { city_name: name };
          if (state_code !== undefined && state_code !== null && state_code !== '') {
            cityData.state_code = state_code;
          }
          const newCity = await City.create(cityData);
          return res.status(201).json({
            message: 'City added successfully',
            data: newCity,
          });

        // State create (dropdown POST)
        case 'state':
          if (!name) {
            return res.status(400).json({ message: 'State name is required' });
          }
          const existingState = await State.findOne({ state_name: name });
          if (existingState) {
            return res.status(400).json({ message: 'State already exists' });
          }
          // Only set state_code if provided and not empty/null
          const stateData = { state_name: name };
          if (state_code !== undefined && state_code !== null && state_code !== '') {
            stateData.state_code = state_code;
          }
          const newState = await State.create(stateData);
          return res.status(201).json({
            message: 'State added successfully',
            data: newState,
          });

        default:
          return res.status(400).json({ message: 'Invalid dropdown_type. Use: arch-type, city, or state' });
      }
    }
  } catch (error) {
    next(error);
  }
};

// ========== Architect Type Management ==========
// @desc    Architect Type Operations (Create, Get All)
// @route   POST /api/architect/arch-types (Create)
// @route   GET /api/architect/arch-types (Get All)
// @access  Protected
export const manageArchTypes = async (req, res, next) => {
  try {
    const { method } = req;
    console.log(`ArchTypes API called with method: ${method}`);

    switch (method) {
      case 'POST':
        // CREATE ARCHITECT TYPE
        const { type_name, description } = req.body;

        if (!type_name) {
          return res.status(400).json({ message: 'Architect type name is required' });
        }

        const existingType = await ArchType.findOne({ type_name });
        if (existingType) {
          return res.status(400).json({ message: 'Architect type already exists' });
        }

        const newArchType = await ArchType.create({ type_name, description });
        return res.status(201).json({
          message: 'Architect type created successfully',
          data: newArchType,
        });

      case 'GET':
        // GET ALL ARCHITECT TYPES
        console.log('Getting all architect types...');
        const archTypes = await ArchType.find({}).sort({ type_name: 1 });
        console.log(`Found ${archTypes.length} architect types`);
        return res.status(200).json({
          message: 'Architect types retrieved successfully',
          count: archTypes.length,
          data: archTypes,
        });

      default:
        return res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    next(error);
  }
};

// ========== City Management ==========
// @desc    City Operations (Create, Get All)
// @route   POST /api/architect/cities (Create)
// @route   GET /api/architect/cities (Get All)
// @access  Protected
export const manageCities = async (req, res, next) => {
  try {
    const { method } = req;
    console.log(`Cities API called with method: ${method}`);

    switch (method) {
      case 'POST':
        // CREATE CITY
        const { city_name, state_code } = req.body;

        if (!city_name) {
          return res.status(400).json({ message: 'City name is required' });
        }

        const existingCity = await City.findOne({ city_name });
        if (existingCity) {
          return res.status(400).json({ message: 'City already exists' });
        }

        const cityData = { city_name };
        if (state_code !== undefined && state_code !== null && state_code !== '') {
          cityData.state_code = state_code;
        }

        const newCity = await City.create(cityData);
        return res.status(201).json({
          message: 'City created successfully',
          data: newCity,
        });

      case 'GET':
        // GET ALL CITIES
        console.log('Getting all cities...');
        const cities = await City.find({}).sort({ city_name: 1 });
        console.log(`Found ${cities.length} cities`);
        return res.status(200).json({
          message: 'Cities retrieved successfully',
          count: cities.length,
          data: cities,
        });

      default:
        return res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    next(error);
  }
};

// ========== State Management ==========
// @desc    State Operations (Create, Get All)
// @route   POST /api/architect/states (Create)
// @route   GET /api/architect/states (Get All)
// @access  Protected
export const manageStates = async (req, res, next) => {
  try {
    const { method } = req;
    console.log(`States API called with method: ${method}`);

    switch (method) {
      case 'POST':
        // CREATE STATE
        const { state_name, state_code } = req.body;

        if (!state_name) {
          return res.status(400).json({ message: 'State name is required' });
        }

        const existingState = await State.findOne({ state_name });
        if (existingState) {
          return res.status(400).json({ message: 'State already exists' });
        }

        const stateData = { state_name };
        if (state_code !== undefined && state_code !== null && state_code !== '') {
          stateData.state_code = state_code;
        }

        const newState = await State.create(stateData);
        return res.status(201).json({
          message: 'State created successfully',
          data: newState,
        });

      case 'GET':
        // GET ALL STATES
        console.log('Getting all states...');
        const states = await State.find({}).sort({ state_name: 1 });
        console.log(`Found ${states.length} states`);
        return res.status(200).json({
          message: 'States retrieved successfully',
          count: states.length,
          data: states,
        });

      default:
        return res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    next(error);
  }
};

// ========== Architect Category Management ==========
// @desc    Architect Category Operations (Create, Get All)
// @route   POST /api/architect/categories (Create)
// @route   GET /api/architect/categories (Get All)
// @access  Protected
export const manageArchitectCategories = async (req, res, next) => {
  try {
    const { method } = req;
    console.log(`Categories API called with method: ${method}`);

    switch (method) {
      case 'POST':
        // CREATE ARCHITECT CATEGORY
        const { category_name } = req.body;

        if (!category_name) {
          return res.status(400).json({ message: 'Category name is required' });
        }

        // Accept any category name without validation
        return res.status(201).json({
          message: 'Category created successfully',
          data: { category: category_name },
        });

      case 'GET':
        // GET ALL ARCHITECT CATEGORIES
        console.log('Getting all architect categories...');
        // For now returning example categories - in future you can store in database
        const categories = ['A', 'B', 'C', 'D', 'Premium', 'Standard', 'Basic'];
        console.log(`Found ${categories.length} categories`);
        return res.status(200).json({
          message: 'Architect categories retrieved successfully',
          count: categories.length,
          data: categories.map(cat => ({ category: cat })),
        });

      default:
        return res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Send OTP to Architect's WhatsApp number
// @route   POST /api/architect/send-otp
// @access  Public
export const sendArchitectOTP = async (req, res, next) => {
  try {
    const { mobileNumber } = req.body;

    if (!mobileNumber) {
      return res.status(400).json({
        success: false,
        message: 'Mobile number is required'
      });
    }

    if (!validatePhoneNumber(mobileNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid mobile number format. Please enter a 10-digit number'
      });
    }

    // Check if mobile number already exists
    const existingArchitect = await Architect.findOne({ 'Mobile Number': mobileNumber });
    if (existingArchitect) {
      return res.status(409).json({
        success: false,
        message: 'This mobile number is already registered with another Architect'
      });
    }

    const otp = generateOTP();
    storeOTP(mobileNumber, otp);
    await sendWhatsAppOTP(mobileNumber, otp, 'Architect');

    console.log(`OTP sent to ${mobileNumber}: ${otp}`);

    return res.status(200).json({
      success: true,
      message: 'OTP sent successfully to your WhatsApp number',
      data: { mobileNumber }
    });

  } catch (error) {
    console.error('Send OTP error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to send OTP. Please try again.'
    });
  }
};

// @desc    Verify OTP for Architect registration
// @route   POST /api/architect/verify-otp
// @access  Public
export const verifyArchitectOTP = async (req, res, next) => {
  try {
    const { mobileNumber, otp } = req.body;

    if (!mobileNumber || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Mobile number and OTP are required'
      });
    }

    const isValid = verifyStoredOTP(mobileNumber, otp);

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP. Please request a new OTP.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
      data: {
        mobileNumber,
        verified: true
      }
    });

  } catch (error) {
    console.error('Verify OTP error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify OTP. Please try again.'
    });
  }
};

export const getArchitectNames = async (req, res, next) => {
  try {
    console.log('Getting architect names list...');

    // Get only Arch_Name field from all architects
    const architectNames = await Architect.find({}, { Arch_Name: 1, Arch_id: 1, _id: 0 }).sort({ Arch_Name: 1 });

    // Extract just the names array
    const namesList = architectNames.map(architect => ({
      Arch_id: architect.Arch_id,
      Arch_Name: architect.Arch_Name
    }));

    console.log(`Found ${namesList.length} architect names`);

    return res.status(200).json({
      message: 'Architect names retrieved successfully',
      count: namesList.length,
      data: namesList,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload Architects from Excel file
// @route   POST /api/architect/upload-excel
// @access  Protected
export const uploadArchitectsFromExcel = async (req, res, next) => {
  try {
    console.log('Excel upload initiated for Architects...');

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
    const sheetName = workbook.SheetNames[0];
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

    // Results tracking
    const results = {
      successful: [],
      failed: [],
      duplicates: [],
      totalRows: jsonData.length
    };

    // Column mapping for flexibility
    const columnMapping = {
      'Arch_Name': ['Arch_Name', 'Architect Name', 'Name', 'Architect'],
      'Mobile Number': ['Mobile Number', 'Mobile', 'Phone', 'Contact Number'],
      'Email id': ['Email id', 'Email', 'Email ID', 'Email Address'],
      'Arch_Address': ['Arch_Address', 'Address', 'Architect Address'],
      'Arch_city': ['Arch_city', 'City', 'Architect City'],
      'Arch_state': ['Arch_state', 'State', 'Architect State'],
      'Arch_type': ['Arch_type', 'Type', 'Architect Type'],
      'Arch_category': ['Arch_category', 'Category', 'Architect Category']
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
      const rowNumber = i + 2;

      try {
        // Extract data from row
        const Arch_Name = findColumnValue(row, 'Arch_Name');
        const mobileNumber = findColumnValue(row, 'Mobile Number');
        const email = findColumnValue(row, 'Email id');
        const address = findColumnValue(row, 'Arch_Address');
        const city = findColumnValue(row, 'Arch_city');
        const state = findColumnValue(row, 'Arch_state');
        const type = findColumnValue(row, 'Arch_type');
        const category = findColumnValue(row, 'Arch_category');

        // Validate required fields
        if (!Arch_Name || !Arch_Name.toString().trim()) {
          results.failed.push({
            row: rowNumber,
            data: row,
            error: 'Arch_Name is required'
          });
          continue;
        }

        if (!address || !address.toString().trim()) {
          results.failed.push({
            row: rowNumber,
            data: row,
            error: 'Arch_Address is required'
          });
          continue;
        }

        if (!city || !city.toString().trim()) {
          results.failed.push({
            row: rowNumber,
            data: row,
            error: 'Arch_city is required'
          });
          continue;
        }

        if (!state || !state.toString().trim()) {
          results.failed.push({
            row: rowNumber,
            data: row,
            error: 'Arch_state is required'
          });
          continue;
        }

        if (!category || !category.toString().trim()) {
          results.failed.push({
            row: rowNumber,
            data: row,
            error: 'Arch_category is required'
          });
          continue;
        }

        // Validate mobile number format if provided
        let cleanMobile = null;
        if (mobileNumber && mobileNumber.toString().trim()) {
          cleanMobile = mobileNumber.toString().trim();
          if (!/^\d{10}$/.test(cleanMobile)) {
            results.failed.push({
              row: rowNumber,
              data: row,
              error: 'Mobile Number must be 10 digits'
            });
            continue;
          }
        }

        // Validate category
        if (!['A', 'B', 'C', 'D'].includes(category.toString().trim().toUpperCase())) {
          results.failed.push({
            row: rowNumber,
            data: row,
            error: 'Arch_category must be A, B, C, or D'
          });
          continue;
        }

        // Check for duplicates
        const existingArchitect = await Architect.findOne({
          $or: [
            { Arch_Name: Arch_Name.toString().trim() },
            ...(cleanMobile ? [{ 'Mobile Number': cleanMobile }] : [])
          ]
        });

        if (existingArchitect) {
          results.duplicates.push({
            row: rowNumber,
            data: row,
            existing: existingArchitect,
            error: 'Architect with this name or mobile number already exists'
          });
          continue;
        }

        // Auto-create dropdown values
        await autoCreateDropdownValues(
          type ? type.toString().trim() : null,
          city.toString().trim(),
          state.toString().trim(),
          null
        );

        // Auto-generate Arch_id
        const lastArchitect = await Architect.findOne({}, {}, { sort: { Arch_id: -1 } });
        let nextIdNum = 1;
        if (lastArchitect && lastArchitect.Arch_id) {
          const match = lastArchitect.Arch_id.match(/ARCH(\d+)/);
          if (match) {
            nextIdNum = parseInt(match[1], 10) + 1;
          }
        }
        const Arch_id = `ARCH${String(nextIdNum).padStart(3, '0')}`;

        // Prepare data for creation
        const architectData = {
          Arch_id,
          Arch_Name: Arch_Name.toString().trim(),
          Arch_Address: address.toString().trim(),
          Arch_city: city.toString().trim(),
          Arch_state: state.toString().trim(),
          Arch_category: category.toString().trim().toUpperCase()
        };

        // Add optional fields
        if (cleanMobile) {
          architectData['Mobile Number'] = cleanMobile;
        }

        if (email && email.toString().trim()) {
          const emailStr = email.toString().trim().toLowerCase();
          if (/.+@.+\..+/.test(emailStr)) {
            architectData['Email id'] = emailStr;
          }
        }

        if (type && type.toString().trim()) {
          architectData.Arch_type = type.toString().trim();
        }

        // Create Architect
        const newArchitect = await Architect.create(architectData);

        results.successful.push({
          row: rowNumber,
          data: newArchitect
        });

        console.log(`Row ${rowNumber}: Successfully created Architect ${newArchitect.Arch_id}`);

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

    console.log('Excel upload completed for Architects:', {
      total: results.totalRows,
      successful: results.successful.length,
      failed: results.failed.length,
      duplicates: results.duplicates.length
    });

    return res.status(200).json({
      success: true,
      message: `Excel upload completed. ${results.successful.length}/${results.totalRows} Architects processed successfully`,
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
    console.error('Excel upload error for Architects:', error);

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

// @desc    Generate and download Architects PDF
// @route   GET /api/architect/export-pdf
// @access  Protected
export const generateArchitectsPDF = async (req, res, next) => {
  try {
    console.log('PDF generation initiated for Architects...');

    // Dynamic import of jsPDF
    const jsPDFModule = await import('jspdf');
    const jsPDF = jsPDFModule.jsPDF || jsPDFModule.default;
    await import('jspdf-autotable');

    // Get query parameters for filtering
    const { search, city, state, type, category } = req.query;
    let filter = {};

    // Apply filters
    if (city) filter.Arch_city = new RegExp(city, 'i');
    if (state) filter.Arch_state = new RegExp(state, 'i');
    if (type) filter.Arch_type = new RegExp(type, 'i');
    if (category) filter.Arch_category = category;
    if (search) {
      filter.$or = [
        { Arch_Name: new RegExp(search, 'i') },
        { Arch_id: new RegExp(search, 'i') },
        { 'Email id': new RegExp(search, 'i') },
        { Arch_Address: new RegExp(search, 'i') }
      ];
    }

    // Fetch architects data
    const architects = await Architect.find(filter).sort({ Arch_Name: 1 });

    if (!architects || architects.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No Architects found to export'
      });
    }

    console.log(`Generating PDF for ${architects.length} Architects`);

    // Create new PDF document
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    // Add title
    doc.setFontSize(20);
    doc.setTextColor(40, 116, 166);
    doc.text('Architects Report', 14, 20);

    // Add generation info
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

    let yPosition = 33;
    if (Object.keys(filter).length > 0) {
      doc.text(`Filters applied: ${JSON.stringify(filter)}`, 14, yPosition);
      yPosition += 5;
    }

    doc.text(`Total Records: ${architects.length}`, 14, yPosition);

    // Prepare table data
    const tableColumns = [
      'S.No.',
      'Arch ID',
      'Name',
      'Mobile',
      'Email',
      'Type',
      'Category',
      'City',
      'State'
    ];

    const tableRows = architects.map((architect, index) => [
      (index + 1).toString(),
      architect.Arch_id || '-',
      architect.Arch_Name || '-',
      architect['Mobile Number'] || '-',
      architect['Email id'] || '-',
      architect.Arch_type || '-',
      architect.Arch_category || '-',
      architect.Arch_city || '-',
      architect.Arch_state || '-'
    ]);

    // Add table to PDF
    doc.autoTable({
      head: [tableColumns],
      body: tableRows,
      startY: yPosition + 10,
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
        0: { cellWidth: 15, halign: 'center' },
        1: { cellWidth: 25, halign: 'center' },
        2: { cellWidth: 45, halign: 'left' },
        3: { cellWidth: 25, halign: 'center' },
        4: { cellWidth: 45, halign: 'left' },
        5: { cellWidth: 30, halign: 'left' },
        6: { cellWidth: 20, halign: 'center' },
        7: { cellWidth: 30, halign: 'left' },
        8: { cellWidth: 30, halign: 'left' }
      },
      styles: {
        fontSize: 8,
        cellPadding: 2
      },
      margin: { top: 10, left: 14, right: 14 }
    });

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
    const filename = `architects-${timestamp}.pdf`;

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Send PDF
    const pdfOutput = doc.output();
    res.send(Buffer.from(pdfOutput, 'binary'));

    console.log(`PDF generated successfully: ${filename}`);

  } catch (error) {
    console.error('PDF generation error for Architects:', error);
    next(error);
  }
};

