import { Party, PartyCity, PartyState } from './party.model.js';
import { Site } from './site.model.js';
import mongoose from 'mongoose';
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

// ========== Main Party Management (Consolidated CRUD) ==========
const manageParties = async (req, res) => {
  try {
    const method = req.method;
    const { id } = req.params;
    const userId = req.user._id;

    switch (method) {
      case 'POST':
        // Create new Party
        const {
          Party_id,
          Party_Billing_Name,
          Contact_Person,
          Mobile_Number,
          Other_Numbers,
          Email_id,
          Party_Address,
          Party_city,
          Party_State,
          Party_Gstno,
          Party_default_User_id,
          Party_default_cp_id,
          Party_default_Arch_id
        } = req.body;

        // Check if Party_id already exists
        const existingParty = await Party.findOne({ Party_id });
        if (existingParty) {
          return res.status(400).json({
            success: false,
            message: `Party with ID "${Party_id}" already exists`
          });
        }

        // Auto-create city and state if needed
        if (Party_State) {
          await PartyState.getOrCreate(Party_State, userId);
        }
        if (Party_city && Party_State) {
          await PartyCity.getOrCreate(Party_city, Party_State, userId);
        }

        const newParty = await Party.create({
          Party_id,
          Party_Billing_Name,
          Contact_Person,
          Mobile_Number,
          Other_Numbers: Other_Numbers || '',
          Email_id: Email_id || '',
          Party_Address,
          Party_city,
          Party_State,
          Party_Gstno: Party_Gstno || '',
          Party_default_User_id,
          Party_default_cp_id,
          Party_default_Arch_id,
          created_by: userId,
          mobileVerified: req.body.mobileVerified === 'true' || req.body.mobileVerified === true,
        });

        // Auto-create default site for the party
        try {
          const defaultSite = await Site.create({
            Site_id: `${Party_id}-SITE01`,
            Site_Billing_Name: `${Party_Billing_Name} - Default Site`,
            Contact_Person: Contact_Person,
            Mobile_Number: Mobile_Number,
            Other_Numbers: Other_Numbers || '',
            Email_id: Email_id || '',
            Site_Address: Party_Address,
            Site_city: Party_city,
            Site_State: Party_State,
            Site_party_id: Party_id,
            created_by: userId
          });
          console.log('Default site created:', defaultSite.Site_id);
        } catch (siteError) {
          console.error('Error creating default site:', siteError);
          // Continue even if site creation fails
        }

        // Populate reference details for response
        const populatedParty = await Party.findById(newParty._id)
          .populate('Party_default_User_id', 'name email')
          .populate('channelPartnerDetails', 'CP_Name')
          .populate('architectDetails', 'Arch_Name');

        return res.status(201).json({
          success: true,
          message: 'Party and default site created successfully',
          data: populatedParty
        });

      case 'GET':
        if (id) {
          // Get specific Party by ID with all details
          const party = await Party.findOne({ Party_id: id })
            .populate('Party_default_User_id', 'name email')
            .populate('channelPartnerDetails', 'CP_Name Mobile_Number Email_id')
            .populate('architectDetails', 'Arch_Name Mobile_Number Email_id');

          if (!party) {
            return res.status(404).json({
              success: false,
              message: 'Party not found'
            });
          }

          // Get associated sites for this party
          const partySites = await Site.find({ Site_party_id: id })
            .select('Site_id Site_Billing_Name Contact_Person Mobile_Number Site_Address Site_city Site_State')
            .sort({ createdAt: -1 });

          // Add sites to party data
          const partyWithSites = {
            ...party.toObject(),
            sites: partySites,
            sitesCount: partySites.length
          };

          return res.status(200).json({
            success: true,
            message: 'Party retrieved successfully with sites',
            data: partyWithSites
          });
        } else {
          // Get all Parties with filters and search
          const {
            search,
            city,
            state,
            user_id,
            cp_id,
            arch_id,
            include_details,
            include_sites,
            page = 1,
            limit = 10
          } = req.query;

          let filter = {};

          // Search functionality
          if (search) {
            filter.$or = [
              { Party_id: { $regex: search, $options: 'i' } },
              { Party_Billing_Name: { $regex: search, $options: 'i' } },
              { Contact_Person: { $regex: search, $options: 'i' } },
              { Mobile_Number: { $regex: search, $options: 'i' } },
              { Email_id: { $regex: search, $options: 'i' } },
              { Party_Address: { $regex: search, $options: 'i' } }
            ];
          }

          // Filter by city
          if (city) {
            filter.Party_city = { $regex: city, $options: 'i' };
          }

          // Filter by state
          if (state) {
            filter.Party_State = { $regex: state, $options: 'i' };
          }

          // Filter by user
          if (user_id) {
            filter.Party_default_User_id = user_id;
          }

          // Filter by channel partner
          if (cp_id) {
            filter.Party_default_cp_id = cp_id;
          }

          // Filter by architect
          if (arch_id) {
            filter.Party_default_Arch_id = arch_id;
          }

          const skip = (parseInt(page) - 1) * parseInt(limit);

          let query = Party.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

          // Include detailed references if requested
          if (include_details === 'true') {
            query = query
              .populate('Party_default_User_id', 'name email')
              .populate('channelPartnerDetails', 'CP_Name Mobile_Number')
              .populate('architectDetails', 'Arch_Name Mobile_Number');
          }

          const parties = await query;
          const total = await Party.countDocuments(filter);

          let partiesWithSites = parties;

          // Include sites data if requested
          if (include_sites === 'true') {
            partiesWithSites = await Promise.all(parties.map(async (party) => {
              const partySites = await Site.find({ Site_party_id: party.Party_id })
                .select('Site_id Site_Billing_Name Contact_Person Mobile_Number Site_Address Site_city Site_State')
                .sort({ createdAt: -1 });

              return {
                ...party.toObject(),
                sites: partySites,
                sitesCount: partySites.length
              };
            }));
          } else {
            // Just add site count for each party
            partiesWithSites = await Promise.all(parties.map(async (party) => {
              const siteCount = await Site.countDocuments({ Site_party_id: party.Party_id });

              return {
                ...party.toObject(),
                sitesCount: siteCount
              };
            }));
          }

          return res.status(200).json({
            success: true,
            message: 'Parties retrieved successfully',
            count: partiesWithSites.length,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
            filters: {
              search,
              city,
              state,
              user_id,
              cp_id,
              arch_id,
              include_details,
              include_sites
            },
            data: partiesWithSites
          });
        }

      case 'PUT':
        if (!id) {
          return res.status(400).json({
            success: false,
            message: 'Party ID is required for update'
          });
        }

        const updateData = req.body;

        // Auto-create city and state if updated
        if (updateData.Party_State) {
          await PartyState.getOrCreate(updateData.Party_State, userId);
        }
        if (updateData.Party_city && updateData.Party_State) {
          await PartyCity.getOrCreate(updateData.Party_city, updateData.Party_State, userId);
        }

        const updatedParty = await Party.findOneAndUpdate(
          { Party_id: id },
          updateData,
          { new: true, runValidators: true }
        )
          .populate('Party_default_User_id', 'name email')
          .populate('channelPartnerDetails', 'CP_Name')
          .populate('architectDetails', 'Arch_Name');

        if (!updatedParty) {
          return res.status(404).json({
            success: false,
            message: 'Party not found'
          });
        }

        return res.status(200).json({
          success: true,
          message: 'Party updated successfully',
          data: updatedParty
        });

      case 'DELETE':
        if (!id) {
          return res.status(400).json({
            success: false,
            message: 'Party ID is required for deletion'
          });
        }

        const deletedParty = await Party.findOneAndDelete({ Party_id: id });

        if (!deletedParty) {
          return res.status(404).json({
            success: false,
            message: 'Party not found'
          });
        }

        return res.status(200).json({
          success: true,
          message: 'Party deleted successfully',
          data: deletedParty
        });

      default:
        return res.status(405).json({
          success: false,
          message: 'Method not allowed'
        });
    }
  } catch (error) {
    console.error('Party Management Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// ========== Dropdown Data Management (Cities & States) ==========
const manageDropdownData = async (req, res) => {
  try {
    const method = req.method;
    const { type, id } = req.params;
    const userId = req.user._id;

    if (!['cities', 'states'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid dropdown type. Use "cities" or "states"'
      });
    }

    switch (method) {
      case 'GET':
        if (type === 'cities') {
          const { state, search } = req.query;
          let filter = {};

          if (state) {
            filter.state = { $regex: state, $options: 'i' };
          }

          if (search) {
            filter.name = { $regex: search, $options: 'i' };
          }

          const cities = await PartyCity.find(filter)
            .sort({ name: 1 })
            .populate('created_by', 'name');

          return res.status(200).json({
            success: true,
            message: 'Cities retrieved successfully',
            count: cities.length,
            filters: { state, search },
            data: cities
          });
        } else {
          const { search } = req.query;
          let filter = {};

          if (search) {
            filter.name = { $regex: search, $options: 'i' };
          }

          const states = await PartyState.find(filter)
            .sort({ name: 1 })
            .populate('created_by', 'name');

          return res.status(200).json({
            success: true,
            message: 'States retrieved successfully',
            count: states.length,
            filters: { search },
            data: states
          });
        }

      case 'POST':
        const { name, state } = req.body;

        if (!name) {
          return res.status(400).json({
            success: false,
            message: `${type === 'cities' ? 'City' : 'State'} name is required`
          });
        }

        if (type === 'cities') {
          if (!state) {
            return res.status(400).json({
              success: false,
              message: 'State is required for city creation'
            });
          }

          // Auto-create state if doesn't exist
          await PartyState.getOrCreate(state, userId);

          const newCity = await PartyCity.getOrCreate(name, state, userId);

          return res.status(201).json({
            success: true,
            message: 'City created successfully',
            data: newCity
          });
        } else {
          const newState = await PartyState.getOrCreate(name, userId);

          return res.status(201).json({
            success: true,
            message: 'State created successfully',
            data: newState
          });
        }

      case 'PUT':
        if (!id) {
          return res.status(400).json({
            success: false,
            message: `${type === 'cities' ? 'City' : 'State'} ID is required for update`
          });
        }

        const updateData = req.body;
        let updatedItem;

        if (type === 'cities') {
          updatedItem = await PartyCity.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
          ).populate('created_by', 'name');
        } else {
          updatedItem = await PartyState.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
          ).populate('created_by', 'name');
        }

        if (!updatedItem) {
          return res.status(404).json({
            success: false,
            message: `${type === 'cities' ? 'City' : 'State'} not found`
          });
        }

        return res.status(200).json({
          success: true,
          message: `${type === 'cities' ? 'City' : 'State'} updated successfully`,
          data: updatedItem
        });

      case 'DELETE':
        if (!id) {
          return res.status(400).json({
            success: false,
            message: `${type === 'cities' ? 'City' : 'State'} ID is required for deletion`
          });
        }

        let deletedItem;

        if (type === 'cities') {
          // Check if city is being used by any party
          const cityInUse = await Party.findOne({ Party_city: await PartyCity.findById(id).then(c => c?.name) });
          if (cityInUse) {
            return res.status(400).json({
              success: false,
              message: 'City cannot be deleted as it is being used by parties'
            });
          }

          deletedItem = await PartyCity.findByIdAndDelete(id);
        } else {
          // Check if state is being used by any party or city
          const stateDoc = await PartyState.findById(id);
          if (stateDoc) {
            const stateInUse = await Party.findOne({ Party_State: stateDoc.name });
            const cityInState = await PartyCity.findOne({ state: stateDoc.name });

            if (stateInUse || cityInState) {
              return res.status(400).json({
                success: false,
                message: 'State cannot be deleted as it is being used by parties or cities'
              });
            }
          }

          deletedItem = await PartyState.findByIdAndDelete(id);
        }

        if (!deletedItem) {
          return res.status(404).json({
            success: false,
            message: `${type === 'cities' ? 'City' : 'State'} not found`
          });
        }

        return res.status(200).json({
          success: true,
          message: `${type === 'cities' ? 'City' : 'State'} deleted successfully`,
          data: deletedItem
        });

      default:
        return res.status(405).json({
          success: false,
          message: 'Method not allowed'
        });
    }
  } catch (error) {
    console.error('Dropdown Management Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// ========== Analytics & Reports ==========
const getPartyAnalytics = async (req, res) => {
  try {
    const { type = 'summary' } = req.query;

    switch (type) {
      case 'summary':
        const totalParties = await Party.countDocuments();
        const partiesByState = await Party.aggregate([
          { $group: { _id: '$Party_State', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]);
        const partiesByCity = await Party.aggregate([
          { $group: { _id: '$Party_city', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 }
        ]);

        return res.status(200).json({
          success: true,
          message: 'Party analytics retrieved successfully',
          data: {
            totalParties,
            partiesByState,
            topCities: partiesByCity
          }
        });

      case 'detailed':
        const analytics = await Party.aggregate([
          {
            $facet: {
              byState: [
                { $group: { _id: '$Party_State', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
              ],
              byCity: [
                { $group: { _id: { city: '$Party_city', state: '$Party_State' }, count: { $sum: 1 } } },
                { $sort: { count: -1 } }
              ],
              byCP: [
                { $match: { Party_default_cp_id: { $ne: 'NA' } } },
                { $group: { _id: '$Party_default_cp_id', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
              ],
              byArch: [
                { $match: { Party_default_Arch_id: { $ne: 'NA' } } },
                { $group: { _id: '$Party_default_Arch_id', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
              ]
            }
          }
        ]);

        return res.status(200).json({
          success: true,
          message: 'Detailed party analytics retrieved successfully',
          data: analytics[0]
        });

      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid analytics type. Use "summary" or "detailed"'
        });
    }
  } catch (error) {
    console.error('Analytics Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// ========== Get All Party Dropdown ==========
const getAllPartiesDropdown = async (req, res) => {
  try {
    console.log('🔵 PARTY DROPDOWN - Step 1: API Called');
    console.log('🔵 PARTY DROPDOWN - Step 2: Query params:', req.query);

    const { search, limit = 100 } = req.query;

    let filter = {};

    // Search functionality
    if (search) {
      filter.$or = [
        { Party_id: { $regex: search, $options: 'i' } },
        { Party_Billing_Name: { $regex: search, $options: 'i' } }
      ];
    }

    console.log('🔵 PARTY DROPDOWN - Step 3: Filter:', filter);

    const parties = await Party.find(filter)
      .select('Party_id Party_Billing_Name')
      .sort({ Party_id: 1 })
      .limit(parseInt(limit));

    console.log('🔵 PARTY DROPDOWN - Step 4: Found parties count:', parties.length);
    console.log('🔵 PARTY DROPDOWN - Step 5: Sample party:', parties[0]);

    const dropdownData = parties.map(party => ({
      id: party._id.toString(),
      party_id: party.Party_id,
      name: party.Party_Billing_Name,
      label: `${party.Party_id} - ${party.Party_Billing_Name}`
    }));

    console.log('🔵 PARTY DROPDOWN - Step 6: Mapped dropdown data count:', dropdownData.length);
    console.log('🔵 PARTY DROPDOWN - Step 7: Sample mapped party:', dropdownData[0]);

    return res.status(200).json({
      success: true,
      message: 'All Party dropdown data retrieved successfully',
      count: dropdownData.length,
      filters: { search, limit },
      data: dropdownData
    });

  } catch (error) {
    console.error('❌ PARTY DROPDOWN - Error:', error);
    console.error('❌ PARTY DROPDOWN - Error message:', error.message);
    console.error('❌ PARTY DROPDOWN - Error stack:', error.stack);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// @desc    Upload Parties from Excel file
// @route   POST /api/party/upload-excel
// @access  Protected
const uploadPartiesFromExcel = async (req, res) => {
  try {
    console.log('Excel upload initiated for Parties...');

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Excel file is required'
      });
    }

    const allowedExtensions = ['.xlsx', '.xls'];
    const fileExtension = path.extname(req.file.originalname).toLowerCase();

    if (!allowedExtensions.includes(fileExtension)) {
      return res.status(400).json({
        success: false,
        message: 'Only .xlsx and .xls files are allowed'
      });
    }

    console.log('Reading Excel file...');

    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    if (!jsonData || jsonData.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Excel file is empty or has no valid data'
      });
    }

    console.log(`Found ${jsonData.length} rows in Excel file`);

    const results = {
      successful: [],
      failed: [],
      duplicates: [],
      totalRows: jsonData.length
    };

    // Column mapping for flexibility
    const columnMapping = {
      'Party_Billing_Name': ['Party_Billing_Name', 'Billing Name', 'Name', 'Party Name'],
      'Contact_Person': ['Contact_Person', 'Contact Person', 'Contact', 'Person'],
      'Mobile_Number': ['Mobile_Number', 'Mobile Number', 'Mobile', 'Phone'],
      'Email_id': ['Email_id', 'Email', 'Email ID', 'Email Address'],
      'Party_Address': ['Party_Address', 'Address', 'Party Address'],
      'Party_city': ['Party_city', 'City', 'Party City'],
      'Party_State': ['Party_State', 'State', 'Party State'],
      'Party_Gstno': ['Party_Gstno', 'GST Number', 'GST No', 'GSTIN'],
      'Other_Numbers': ['Other_Numbers', 'Other Numbers', 'Additional Numbers'],
      'Party_default_User_id': ['Party_default_User_id', 'User ID', 'Default User'],
      'Party_default_cp_id': ['Party_default_cp_id', 'CP ID', 'Channel Partner ID'],
      'Party_default_Arch_id': ['Party_default_Arch_id', 'Arch ID', 'Architect ID']
    };

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
        const Party_Billing_Name = findColumnValue(row, 'Party_Billing_Name');
        const Contact_Person = findColumnValue(row, 'Contact_Person');
        const Mobile_Number = findColumnValue(row, 'Mobile_Number');
        const Email_id = findColumnValue(row, 'Email_id');
        const Party_Address = findColumnValue(row, 'Party_Address');
        const Party_city = findColumnValue(row, 'Party_city');
        const Party_State = findColumnValue(row, 'Party_State');
        const Party_Gstno = findColumnValue(row, 'Party_Gstno');
        const Other_Numbers = findColumnValue(row, 'Other_Numbers');
        const Party_default_User_id = findColumnValue(row, 'Party_default_User_id');
        const Party_default_cp_id = findColumnValue(row, 'Party_default_cp_id');
        const Party_default_Arch_id = findColumnValue(row, 'Party_default_Arch_id');

        // Validate required fields
        if (!Party_Billing_Name || !Party_Billing_Name.toString().trim()) {
          results.failed.push({
            row: rowNumber,
            data: row,
            error: 'Party_Billing_Name is required'
          });
          continue;
        }

        if (!Contact_Person || !Contact_Person.toString().trim()) {
          results.failed.push({
            row: rowNumber,
            data: row,
            error: 'Contact_Person is required'
          });
          continue;
        }

        if (!Mobile_Number || !Mobile_Number.toString().trim()) {
          results.failed.push({
            row: rowNumber,
            data: row,
            error: 'Mobile_Number is required'
          });
          continue;
        }

        if (!Party_Address || !Party_Address.toString().trim()) {
          results.failed.push({
            row: rowNumber,
            data: row,
            error: 'Party_Address is required'
          });
          continue;
        }

        if (!Party_city || !Party_city.toString().trim()) {
          results.failed.push({
            row: rowNumber,
            data: row,
            error: 'Party_city is required'
          });
          continue;
        }

        if (!Party_State || !Party_State.toString().trim()) {
          results.failed.push({
            row: rowNumber,
            data: row,
            error: 'Party_State is required'
          });
          continue;
        }

        if (!Party_default_User_id || !Party_default_User_id.toString().trim()) {
          results.failed.push({
            row: rowNumber,
            data: row,
            error: 'Party_default_User_id is required'
          });
          continue;
        }

        if (!Party_default_cp_id || !Party_default_cp_id.toString().trim()) {
          results.failed.push({
            row: rowNumber,
            data: row,
            error: 'Party_default_cp_id is required'
          });
          continue;
        }

        if (!Party_default_Arch_id || !Party_default_Arch_id.toString().trim()) {
          results.failed.push({
            row: rowNumber,
            data: row,
            error: 'Party_default_Arch_id is required'
          });
          continue;
        }

        // Validate mobile number format
        const cleanMobile = Mobile_Number.toString().trim();
        if (!/^\d{10}$/.test(cleanMobile)) {
          results.failed.push({
            row: rowNumber,
            data: row,
            error: 'Mobile Number must be 10 digits'
          });
          continue;
        }

        // Check for duplicates
        const existingParty = await Party.findOne({
          $or: [
            { Party_Billing_Name: Party_Billing_Name.toString().trim() },
            { Mobile_Number: cleanMobile }
          ]
        });

        if (existingParty) {
          results.duplicates.push({
            row: rowNumber,
            data: row,
            existing: existingParty,
            error: 'Party with this name or mobile number already exists'
          });
          continue;
        }

        // Auto-create city and state if they don't exist
        const cityName = Party_city.toString().trim();
        const stateName = Party_State.toString().trim();

        let existingCity = await PartyCity.findOne({ name: cityName });
        if (!existingCity) {
          existingCity = await PartyCity.create({
            name: cityName,
            state: stateName,
            created_by: req.user._id
          });
        }

        let existingState = await PartyState.findOne({ name: stateName });
        if (!existingState) {
          existingState = await PartyState.create({
            name: stateName,
            created_by: req.user._id
          });
        }

        // Prepare data for creation
        const partyData = {
          Party_Billing_Name: Party_Billing_Name.toString().trim(),
          Contact_Person: Contact_Person.toString().trim(),
          Mobile_Number: cleanMobile,
          Party_Address: Party_Address.toString().trim(),
          Party_city: cityName,
          Party_State: stateName,
          Party_default_User_id: Party_default_User_id.toString().trim(),
          Party_default_cp_id: Party_default_cp_id.toString().trim(),
          Party_default_Arch_id: Party_default_Arch_id.toString().trim(),
          created_by: req.user._id
        };

        // Add optional fields
        if (Email_id && Email_id.toString().trim()) {
          const emailStr = Email_id.toString().trim().toLowerCase();
          if (/.+@.+\..+/.test(emailStr)) {
            partyData.Email_id = emailStr;
          }
        }

        if (Party_Gstno && Party_Gstno.toString().trim()) {
          partyData.Party_Gstno = Party_Gstno.toString().trim();
        }

        if (Other_Numbers && Other_Numbers.toString().trim()) {
          partyData.Other_Numbers = Other_Numbers.toString().trim();
        }

        // Create Party
        const newParty = await Party.create(partyData);

        results.successful.push({
          row: rowNumber,
          data: newParty
        });

        console.log(`Row ${rowNumber}: Successfully created Party ${newParty.Party_id}`);

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

    console.log('Excel upload completed for Parties:', {
      total: results.totalRows,
      successful: results.successful.length,
      failed: results.failed.length,
      duplicates: results.duplicates.length
    });

    return res.status(200).json({
      success: true,
      message: `Excel upload completed. ${results.successful.length}/${results.totalRows} Parties processed successfully`,
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
    console.error('Excel upload error for Parties:', error);

    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.warn('Could not delete uploaded file after error:', cleanupError.message);
      }
    }

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// @desc    Generate and download Parties PDF
// @route   GET /api/party/export-pdf
// @access  Protected
const generatePartiesPDF = async (req, res) => {
  try {
    console.log('🔥🔥🔥 PDF FUNCTION CALLED FOR PARTIES 🔥🔥🔥');
    console.log('Method:', req.method);
    console.log('URL:', req.url);
    console.log('Query params:', req.query);

    // Dynamic import of jsPDF
    const jsPDFModule = await import('jspdf');
    const jsPDF = jsPDFModule.jsPDF || jsPDFModule.default;
    await import('jspdf-autotable');

    // Get query parameters for filtering
    const { search, city, state } = req.query;
    let filter = {};

    // Apply filters
    if (city) filter.Party_city = new RegExp(city, 'i');
    if (state) filter.Party_State = new RegExp(state, 'i');
    if (search) {
      filter.$or = [
        { Party_id: new RegExp(search, 'i') },
        { Party_Billing_Name: new RegExp(search, 'i') },
        { Contact_Person: new RegExp(search, 'i') },
        { Email_id: new RegExp(search, 'i') }
      ];
    }

    // Fetch parties data
    const parties = await Party.find(filter).sort({ Party_Billing_Name: 1 });

    console.log(`Found ${parties.length} parties for PDF generation`);

    // Create PDF regardless of data presence
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'pt',
      format: 'a4'
    });

    // Add title
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text('Parties Report', 40, 40);

    // Add generation date and record count
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 40, 60);
    doc.text(`Total Records: ${parties.length}`, 40, 75);

    // Add filter information if any
    if (Object.keys(filter).length > 0) {
      let filterText = 'Filters: ';
      if (search) filterText += `Search: "${search}" `;
      if (city) filterText += `City: "${city}" `;
      if (state) filterText += `State: "${state}" `;
      doc.text(filterText, 40, 90);
    }

    if (parties.length === 0) {
      // Add "No data found" message
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('No parties found matching the criteria', 40, 130);
    } else {
      // Prepare table data
      const tableColumns = [
        'S.No.',
        'Party ID',
        'Billing Name',
        'Contact Person',
        'Mobile',
        'Email',
        'City',
        'State',
        'GST No'
      ];

      const tableRows = parties.map((party, index) => [
        (index + 1).toString(),
        party.Party_id || '-',
        party.Party_Billing_Name || '-',
        party.Contact_Person || '-',
        party.Mobile_Number || '-',
        party.Email_id || '-',
        party.Party_city || '-',
        party.Party_State || '-',
        party.Party_Gstno || '-'
      ]);

      // Add table to PDF
      doc.autoTable({
        head: [tableColumns],
        body: tableRows,
        startY: Object.keys(filter).length > 0 ? 110 : 95,
        styles: {
          fontSize: 8,
          cellPadding: 2,
        },
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: 255,
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        },
        margin: { top: 90, left: 20, right: 20 },
        columnStyles: {
          0: { cellWidth: 40 },  // S.No.
          1: { cellWidth: 60 },  // Party ID
          2: { cellWidth: 100 }, // Billing Name
          3: { cellWidth: 80 },  // Contact Person
          4: { cellWidth: 70 },  // Mobile
          5: { cellWidth: 90 },  // Email
          6: { cellWidth: 70 },  // City
          7: { cellWidth: 70 },  // State
          8: { cellWidth: 80 }   // GST No
        }
      });
    }

    // Set response headers
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `parties_report_${timestamp}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Send PDF
    const pdfBuffer = doc.output('arraybuffer');
    res.send(Buffer.from(pdfBuffer));

    console.log('PDF generated and sent successfully');

  } catch (error) {
    console.error('PDF generation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error generating PDF',
      error: error.message
    });
  }
};

// @desc    Send OTP to Party's WhatsApp number
// @route   POST /api/party/send-otp
// @access  Public
const sendPartyOTP = async (req, res) => {
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

    const existingParty = await Party.findOne({ Mobile_Number: mobileNumber });
    if (existingParty) {
      return res.status(409).json({
        success: false,
        message: 'This mobile number is already registered with another Party'
      });
    }

    const otp = generateOTP();
    storeOTP(mobileNumber, otp);
    await sendWhatsAppOTP(mobileNumber, otp, 'Party');

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

// @desc    Verify OTP for Party registration
// @route   POST /api/party/verify-otp
// @access  Public
const verifyPartyOTP = async (req, res) => {
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

export {
  manageParties,
  manageDropdownData,
  getPartyAnalytics,
  getAllPartiesDropdown,
  uploadPartiesFromExcel,
  generatePartiesPDF,
  sendPartyOTP,
  verifyPartyOTP
};
