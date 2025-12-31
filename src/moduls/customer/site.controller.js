import { Site, SiteCity, SiteState } from './site.model.js';
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

// ========== Main Site Management (Consolidated CRUD) ==========
const manageSites = async (req, res) => {
  try {
    const method = req.method;
    const { id } = req.params;
    const userId = req.user._id;

    switch (method) {
      case 'POST':
        // Create new Site
        const {
          Site_id,
          Site_Billing_Name,
          Contact_Person,
          Mobile_Number,
          Site_Supervisor_name,
          Site_Supervisor_Number,
          Other_Numbers,
          Email_id,
          Site_Address,
          Site_city,
          Site_State,
          Site_Gstno,
          Site_party_id,
          Site_User_id,
          Site_cp_id
        } = req.body;

        // Check if Site_id already exists
        const existingSite = await Site.findOne({ Site_id });
        if (existingSite) {
          return res.status(400).json({
            success: false,
            message: `Site with ID "${Site_id}" already exists`
          });
        }

        // Auto-create city and state if needed
        if (Site_State) {
          await SiteState.getOrCreate(Site_State, userId);
        }
        if (Site_city && Site_State) {
          await SiteCity.getOrCreate(Site_city, Site_State, userId);
        }

        const newSite = await Site.create({
          Site_id,
          Site_Billing_Name,
          Contact_Person,
          Mobile_Number,
          Site_Supervisor_name: Site_Supervisor_name || '',
          Site_Supervisor_Number: Site_Supervisor_Number || '',
          Other_Numbers: Other_Numbers || '',
          Email_id: Email_id || '',
          Site_Address,
          Site_city,
          Site_State,
          Site_Gstno: Site_Gstno || '',
          Site_party_id,
          Site_User_id,
          Site_cp_id,
          created_by: userId
        });

        // Populate reference details for response
        const populatedSite = await Site.findById(newSite._id)
          .populate('Site_User_id', 'name email')
          .populate('partyDetails', 'Party_Billing_Name Contact_Person Mobile_Number')
          .populate('channelPartnerDetails', 'CP_Name Mobile_Number');

        return res.status(201).json({
          success: true,
          message: 'Site created successfully',
          data: populatedSite
        });

      case 'GET':
        if (id) {
          // Get specific Site by ID with all details
          const site = await Site.findOne({ Site_id: id })
            .populate('Site_User_id', 'name email')
            .populate('partyDetails', 'Party_Billing_Name Contact_Person Mobile_Number Email_id Party_Address')
            .populate('channelPartnerDetails', 'CP_Name Mobile_Number Email_id CP_Address');

          if (!site) {
            return res.status(404).json({
              success: false,
              message: 'Site not found'
            });
          }

          return res.status(200).json({
            success: true,
            message: 'Site retrieved successfully',
            data: site
          });
        } else {
          // Get all Sites with filters and search
          const {
            search,
            city,
            state,
            party_id,
            user_id,
            cp_id,
            supervisor,
            include_details,
            page = 1,
            limit = 10
          } = req.query;

          let filter = {};

          // Search functionality
          if (search) {
            filter.$or = [
              { Site_id: { $regex: search, $options: 'i' } },
              { Site_Billing_Name: { $regex: search, $options: 'i' } },
              { Contact_Person: { $regex: search, $options: 'i' } },
              { Mobile_Number: { $regex: search, $options: 'i' } },
              { Site_Supervisor_name: { $regex: search, $options: 'i' } },
              { Email_id: { $regex: search, $options: 'i' } },
              { Site_Address: { $regex: search, $options: 'i' } }
            ];
          }

          // Filter by city
          if (city) {
            filter.Site_city = { $regex: city, $options: 'i' };
          }

          // Filter by state
          if (state) {
            filter.Site_State = { $regex: state, $options: 'i' };
          }

          // Filter by party
          if (party_id) {
            filter.Site_party_id = party_id;
          }

          // Filter by user
          if (user_id) {
            filter.Site_User_id = user_id;
          }

          // Filter by channel partner
          if (cp_id) {
            filter.Site_cp_id = cp_id;
          }

          // Filter by supervisor presence
          if (supervisor === 'true') {
            filter.Site_Supervisor_name = { $ne: '' };
          } else if (supervisor === 'false') {
            filter.Site_Supervisor_name = '';
          }

          const skip = (parseInt(page) - 1) * parseInt(limit);

          let query = Site.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

          // Always include party name, and full details if requested
          if (include_details === 'true') {
            query = query
              .populate('Site_User_id', 'name email')
              .populate('partyDetails', 'Party_Billing_Name Contact_Person Mobile_Number Email_id Party_Address')
              .populate('channelPartnerDetails', 'CP_Name Mobile_Number Email_id CP_Address');
          } else {
            // Always populate party name even without include_details
            query = query.populate('partyDetails', 'Party_Billing_Name');
          }

          const sites = await query;
          const total = await Site.countDocuments(filter);

          return res.status(200).json({
            success: true,
            message: 'Sites retrieved successfully',
            count: sites.length,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
            filters: {
              search,
              city,
              state,
              party_id,
              user_id,
              cp_id,
              supervisor,
              include_details
            },
            data: sites
          });
        }

      case 'PUT':
        if (!id) {
          return res.status(400).json({
            success: false,
            message: 'Site ID is required for update'
          });
        }

        const updateData = req.body;

        // Auto-create city and state if updated
        if (updateData.Site_State) {
          await SiteState.getOrCreate(updateData.Site_State, userId);
        }
        if (updateData.Site_city && updateData.Site_State) {
          await SiteCity.getOrCreate(updateData.Site_city, updateData.Site_State, userId);
        }

        const updatedSite = await Site.findOneAndUpdate(
          { Site_id: id },
          updateData,
          { new: true, runValidators: true }
        )
          .populate('Site_User_id', 'name email')
          .populate('partyDetails', 'Party_Billing_Name Contact_Person')
          .populate('channelPartnerDetails', 'CP_Name');

        if (!updatedSite) {
          return res.status(404).json({
            success: false,
            message: 'Site not found'
          });
        }

        return res.status(200).json({
          success: true,
          message: 'Site updated successfully',
          data: updatedSite
        });

      case 'DELETE':
        if (!id) {
          return res.status(400).json({
            success: false,
            message: 'Site ID is required for deletion'
          });
        }

        const deletedSite = await Site.findOneAndDelete({ Site_id: id });

        if (!deletedSite) {
          return res.status(404).json({
            success: false,
            message: 'Site not found'
          });
        }

        return res.status(200).json({
          success: true,
          message: 'Site deleted successfully',
          data: deletedSite
        });

      default:
        return res.status(405).json({
          success: false,
          message: 'Method not allowed'
        });
    }
  } catch (error) {
    console.error('Site Management Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// ========== Site Dropdown Data Management (Cities & States) ==========
const manageSiteDropdownData = async (req, res) => {
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

          const cities = await SiteCity.find(filter)
            .sort({ name: 1 })
            .populate('created_by', 'name');

          return res.status(200).json({
            success: true,
            message: 'Site cities retrieved successfully',
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

          const states = await SiteState.find(filter)
            .sort({ name: 1 })
            .populate('created_by', 'name');

          return res.status(200).json({
            success: true,
            message: 'Site states retrieved successfully',
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
          await SiteState.getOrCreate(state, userId);

          const newCity = await SiteCity.getOrCreate(name, state, userId);

          return res.status(201).json({
            success: true,
            message: 'Site city created successfully',
            data: newCity
          });
        } else {
          const newState = await SiteState.getOrCreate(name, userId);

          return res.status(201).json({
            success: true,
            message: 'Site state created successfully',
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
          updatedItem = await SiteCity.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
          ).populate('created_by', 'name');
        } else {
          updatedItem = await SiteState.findByIdAndUpdate(
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
          // Check if city is being used by any site
          const cityInUse = await Site.findOne({ Site_city: await SiteCity.findById(id).then(c => c?.name) });
          if (cityInUse) {
            return res.status(400).json({
              success: false,
              message: 'City cannot be deleted as it is being used by sites'
            });
          }

          deletedItem = await SiteCity.findByIdAndDelete(id);
        } else {
          // Check if state is being used by any site or city
          const stateDoc = await SiteState.findById(id);
          if (stateDoc) {
            const stateInUse = await Site.findOne({ Site_State: stateDoc.name });
            const cityInState = await SiteCity.findOne({ state: stateDoc.name });

            if (stateInUse || cityInState) {
              return res.status(400).json({
                success: false,
                message: 'State cannot be deleted as it is being used by sites or cities'
              });
            }
          }

          deletedItem = await SiteState.findByIdAndDelete(id);
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
    console.error('Site Dropdown Management Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// ========== Site Party Relationship Management ==========
const getSitesByParty = async (req, res) => {
  try {
    const { partyId } = req.params;
    const { include_details, page = 1, limit = 10 } = req.query;

    if (!partyId) {
      return res.status(400).json({
        success: false,
        message: 'Party ID is required'
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const sites = await Site.getSitesByParty(partyId, {
      populate: include_details === 'true',
      limit: parseInt(limit),
      skip
    });

    const total = await Site.countDocuments({ Site_party_id: partyId });

    return res.status(200).json({
      success: true,
      message: 'Sites retrieved successfully for party',
      count: sites.length,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      party_id: partyId,
      data: sites
    });
  } catch (error) {
    console.error('Get Sites By Party Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// ========== Analytics & Reports ==========
const getSiteAnalytics = async (req, res) => {
  try {
    const { type = 'summary', party_id } = req.query;

    switch (type) {
      case 'summary':
        let matchFilter = {};
        if (party_id) {
          matchFilter.Site_party_id = party_id;
        }

        const totalSites = await Site.countDocuments(matchFilter);
        const sitesByState = await Site.aggregate([
          { $match: matchFilter },
          { $group: { _id: '$Site_State', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]);
        const sitesByCity = await Site.aggregate([
          { $match: matchFilter },
          { $group: { _id: '$Site_city', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 }
        ]);

        return res.status(200).json({
          success: true,
          message: 'Site analytics retrieved successfully',
          data: {
            totalSites,
            sitesByState,
            topCities: sitesByCity,
            party_filter: party_id || 'all'
          }
        });

      case 'detailed':
        let detailedFilter = {};
        if (party_id) {
          detailedFilter.Site_party_id = party_id;
        }

        const analytics = await Site.aggregate([
          { $match: detailedFilter },
          {
            $facet: {
              byState: [
                { $group: { _id: '$Site_State', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
              ],
              byCity: [
                { $group: { _id: { city: '$Site_city', state: '$Site_State' }, count: { $sum: 1 } } },
                { $sort: { count: -1 } }
              ],
              byParty: [
                { $group: { _id: '$Site_party_id', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
              ],
              byCP: [
                { $match: { Site_cp_id: { $ne: 'NA' } } },
                { $group: { _id: '$Site_cp_id', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
              ],
              withSupervisor: [
                { $group: { _id: { $ne: ['$Site_Supervisor_name', ''] }, count: { $sum: 1 } } }
              ]
            }
          }
        ]);

        return res.status(200).json({
          success: true,
          message: 'Detailed site analytics retrieved successfully',
          data: analytics[0]
        });

      case 'party':
        if (!party_id) {
          return res.status(400).json({
            success: false,
            message: 'Party ID is required for party analytics'
          });
        }

        const partyAnalytics = await Site.getSiteAnalyticsByParty(party_id);

        return res.status(200).json({
          success: true,
          message: 'Party site analytics retrieved successfully',
          party_id,
          data: partyAnalytics
        });

      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid analytics type. Use "summary", "detailed", or "party"'
        });
    }
  } catch (error) {
    console.error('Site Analytics Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// @desc    Upload Sites from Excel file
// @route   POST /api/site/upload-excel
// @access  Protected
const uploadSitesFromExcel = async (req, res) => {
  try {
    console.log('Excel upload initiated for Sites...');

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
      'Site_Billing_Name': ['Site_Billing_Name', 'Billing Name', 'Name', 'Site Name'],
      'Contact_Person': ['Contact_Person', 'Contact Person', 'Contact', 'Person'],
      'Mobile_Number': ['Mobile_Number', 'Mobile Number', 'Mobile', 'Phone'],
      'Email_id': ['Email_id', 'Email', 'Email ID', 'Email Address'],
      'Site_Address': ['Site_Address', 'Address', 'Site Address'],
      'Site_city': ['Site_city', 'City', 'Site City'],
      'Site_State': ['Site_State', 'State', 'Site State'],
      'Site_Gstno': ['Site_Gstno', 'GST Number', 'GST No', 'GSTIN'],
      'Site_Supervisor_name': ['Site_Supervisor_name', 'Supervisor Name', 'Supervisor'],
      'Site_Supervisor_Number': ['Site_Supervisor_Number', 'Supervisor Number', 'Supervisor Mobile'],
      'Other_Numbers': ['Other_Numbers', 'Other Numbers', 'Additional Numbers'],
      'Site_party_id': ['Site_party_id', 'Party ID', 'Party'],
      'Site_User_id': ['Site_User_id', 'User ID', 'Site User'],
      'Site_cp_id': ['Site_cp_id', 'CP ID', 'Channel Partner ID']
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
        const Site_Billing_Name = findColumnValue(row, 'Site_Billing_Name');
        const Contact_Person = findColumnValue(row, 'Contact_Person');
        const Mobile_Number = findColumnValue(row, 'Mobile_Number');
        const Email_id = findColumnValue(row, 'Email_id');
        const Site_Address = findColumnValue(row, 'Site_Address');
        const Site_city = findColumnValue(row, 'Site_city');
        const Site_State = findColumnValue(row, 'Site_State');
        const Site_Gstno = findColumnValue(row, 'Site_Gstno');
        const Site_Supervisor_name = findColumnValue(row, 'Site_Supervisor_name');
        const Site_Supervisor_Number = findColumnValue(row, 'Site_Supervisor_Number');
        const Other_Numbers = findColumnValue(row, 'Other_Numbers');
        const Site_party_id = findColumnValue(row, 'Site_party_id');
        const Site_User_id = findColumnValue(row, 'Site_User_id');
        const Site_cp_id = findColumnValue(row, 'Site_cp_id');

        // Validate required fields
        if (!Site_Billing_Name || !Site_Billing_Name.toString().trim()) {
          results.failed.push({
            row: rowNumber,
            data: row,
            error: 'Site_Billing_Name is required'
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

        if (!Site_Address || !Site_Address.toString().trim()) {
          results.failed.push({
            row: rowNumber,
            data: row,
            error: 'Site_Address is required'
          });
          continue;
        }

        if (!Site_city || !Site_city.toString().trim()) {
          results.failed.push({
            row: rowNumber,
            data: row,
            error: 'Site_city is required'
          });
          continue;
        }

        if (!Site_State || !Site_State.toString().trim()) {
          results.failed.push({
            row: rowNumber,
            data: row,
            error: 'Site_State is required'
          });
          continue;
        }

        if (!Site_party_id || !Site_party_id.toString().trim()) {
          results.failed.push({
            row: rowNumber,
            data: row,
            error: 'Site_party_id is required'
          });
          continue;
        }

        if (!Site_User_id || !Site_User_id.toString().trim()) {
          results.failed.push({
            row: rowNumber,
            data: row,
            error: 'Site_User_id is required'
          });
          continue;
        }

        if (!Site_cp_id || !Site_cp_id.toString().trim()) {
          results.failed.push({
            row: rowNumber,
            data: row,
            error: 'Site_cp_id is required'
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

        // Validate supervisor mobile if provided
        let cleanSupervisorMobile = null;
        if (Site_Supervisor_Number && Site_Supervisor_Number.toString().trim()) {
          cleanSupervisorMobile = Site_Supervisor_Number.toString().trim();
          if (!/^\d{10}$/.test(cleanSupervisorMobile)) {
            results.failed.push({
              row: rowNumber,
              data: row,
              error: 'Site Supervisor Number must be 10 digits'
            });
            continue;
          }
        }

        // Check for duplicates
        const existingSite = await Site.findOne({
          $or: [
            { Site_Billing_Name: Site_Billing_Name.toString().trim() },
            { Mobile_Number: cleanMobile }
          ]
        });

        if (existingSite) {
          results.duplicates.push({
            row: rowNumber,
            data: row,
            existing: existingSite,
            error: 'Site with this name or mobile number already exists'
          });
          continue;
        }

        // Auto-create city and state if they don't exist
        const cityName = Site_city.toString().trim();
        const stateName = Site_State.toString().trim();

        let existingCity = await SiteCity.findOne({ name: cityName });
        if (!existingCity) {
          existingCity = await SiteCity.create({
            name: cityName,
            state: stateName,
            created_by: req.user._id
          });
        }

        let existingState = await SiteState.findOne({ name: stateName });
        if (!existingState) {
          existingState = await SiteState.create({
            name: stateName,
            created_by: req.user._id
          });
        }

        // Prepare data for creation
        const siteData = {
          Site_Billing_Name: Site_Billing_Name.toString().trim(),
          Contact_Person: Contact_Person.toString().trim(),
          Mobile_Number: cleanMobile,
          Site_Address: Site_Address.toString().trim(),
          Site_city: cityName,
          Site_State: stateName,
          Site_party_id: Site_party_id.toString().trim(),
          Site_User_id: Site_User_id.toString().trim(),
          Site_cp_id: Site_cp_id.toString().trim(),
          created_by: req.user._id
        };

        // Add optional fields
        if (Email_id && Email_id.toString().trim()) {
          const emailStr = Email_id.toString().trim().toLowerCase();
          if (/.+@.+\..+/.test(emailStr)) {
            siteData.Email_id = emailStr;
          }
        }

        if (Site_Gstno && Site_Gstno.toString().trim()) {
          siteData.Site_Gstno = Site_Gstno.toString().trim();
        }

        if (Site_Supervisor_name && Site_Supervisor_name.toString().trim()) {
          siteData.Site_Supervisor_name = Site_Supervisor_name.toString().trim();
        }

        if (cleanSupervisorMobile) {
          siteData.Site_Supervisor_Number = cleanSupervisorMobile;
        }

        if (Other_Numbers && Other_Numbers.toString().trim()) {
          siteData.Other_Numbers = Other_Numbers.toString().trim();
        }

        // Create Site
        const newSite = await Site.create(siteData);

        results.successful.push({
          row: rowNumber,
          data: newSite
        });

        console.log(`Row ${rowNumber}: Successfully created Site ${newSite.Site_id}`);

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

    console.log('Excel upload completed for Sites:', {
      total: results.totalRows,
      successful: results.successful.length,
      failed: results.failed.length,
      duplicates: results.duplicates.length
    });

    return res.status(200).json({
      success: true,
      message: `Excel upload completed. ${results.successful.length}/${results.totalRows} Sites processed successfully`,
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
    console.error('Excel upload error for Sites:', error);

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

// @desc    Generate and download Sites PDF
// @route   GET /api/site/export-pdf
// @access  Protected
const generateSitesPDF = async (req, res) => {
  try {
    console.log('🔥🔥🔥 PDF FUNCTION CALLED FOR SITES 🔥🔥🔥');
    console.log('Method:', req.method);
    console.log('URL:', req.url);
    console.log('Query params:', req.query);

    // Dynamic import of jsPDF
    const jsPDFModule = await import('jspdf');
    const jsPDF = jsPDFModule.jsPDF || jsPDFModule.default;
    await import('jspdf-autotable');

    // Get query parameters for filtering
    const { search, city, state, party_id } = req.query;
    let filter = {};

    // Apply filters
    if (city) filter.Site_city = new RegExp(city, 'i');
    if (state) filter.Site_State = new RegExp(state, 'i');
    if (party_id) filter.Site_party_id = party_id;
    if (search) {
      filter.$or = [
        { Site_id: new RegExp(search, 'i') },
        { Site_Billing_Name: new RegExp(search, 'i') },
        { Contact_Person: new RegExp(search, 'i') },
        { Email_id: new RegExp(search, 'i') }
      ];
    }

    // Fetch sites data
    const sites = await Site.find(filter).sort({ Site_Billing_Name: 1 });

    console.log(`Found ${sites.length} sites for PDF generation`);

    // Create PDF regardless of data presence
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'pt',
      format: 'a4'
    });

    // Add title
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text('Sites Report', 40, 40);

    // Add generation date and record count
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 40, 60);
    doc.text(`Total Records: ${sites.length}`, 40, 75);

    // Add filter information if any
    if (Object.keys(filter).length > 0) {
      let filterText = 'Filters: ';
      if (search) filterText += `Search: "${search}" `;
      if (city) filterText += `City: "${city}" `;
      if (state) filterText += `State: "${state}" `;
      if (party_id) filterText += `Party ID: "${party_id}" `;
      doc.text(filterText, 40, 90);
    }

    if (sites.length === 0) {
      // Add "No data found" message
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('No sites found matching the criteria', 40, 130);
    } else {
      // Prepare table data
      const tableColumns = [
        'S.No.',
        'Site ID',
        'Billing Name',
        'Contact Person',
        'Mobile',
        'Email',
        'City',
        'State',
        'Party ID'
      ];

      const tableRows = sites.map((site, index) => [
        (index + 1).toString(),
        site.Site_id || '-',
        site.Site_Billing_Name || '-',
        site.Contact_Person || '-',
        site.Mobile_Number || '-',
        site.Email_id || '-',
        site.Site_city || '-',
        site.Site_State || '-',
        site.Site_party_id || '-'
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
          1: { cellWidth: 60 },  // Site ID
          2: { cellWidth: 100 }, // Billing Name
          3: { cellWidth: 80 },  // Contact Person
          4: { cellWidth: 70 },  // Mobile
          5: { cellWidth: 90 },  // Email
          6: { cellWidth: 70 },  // City
          7: { cellWidth: 70 },  // State
          8: { cellWidth: 70 }   // Party ID
        }
      });
    }

    // Set response headers
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `sites_report_${timestamp}.pdf`;
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

// @desc    Send OTP to Site's WhatsApp number
// @route   POST /api/site/send-otp
// @access  Public
const sendSiteOTP = async (req, res) => {
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

    const existingSite = await Site.findOne({ Mobile_Number: mobileNumber });
    if (existingSite) {
      return res.status(409).json({
        success: false,
        message: 'This mobile number is already registered with another Site'
      });
    }

    const otp = generateOTP();
    storeOTP(mobileNumber, otp);
    await sendWhatsAppOTP(mobileNumber, otp, 'Site');

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

// @desc    Verify OTP for Site registration
// @route   POST /api/site/verify-otp
// @access  Public
const verifySiteOTP = async (req, res) => {
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
  manageSites,
  manageSiteDropdownData,
  getSitesByParty,
  getSiteAnalytics,
  uploadSitesFromExcel,
  generateSitesPDF,
  sendSiteOTP,
  verifySiteOTP
};
