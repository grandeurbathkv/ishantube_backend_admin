import { Party, PartyCity, PartyState } from './party.model.js';
import mongoose from 'mongoose';

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
          created_by: userId
        });

        // Populate reference details for response
        const populatedParty = await Party.findById(newParty._id)
          .populate('Party_default_User_id', 'name email')
          .populate('channelPartnerDetails', 'CP_Name')
          .populate('architectDetails', 'Arch_Name');

        return res.status(201).json({
          success: true,
          message: 'Party created successfully',
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

          return res.status(200).json({
            success: true,
            message: 'Party retrieved successfully',
            data: party
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

          return res.status(200).json({
            success: true,
            message: 'Parties retrieved successfully',
            count: parties.length,
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
              include_details
            },
            data: parties
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
    const { search, limit = 100 } = req.query;

    let filter = {};

    // Search functionality
    if (search) {
      filter.$or = [
        { Party_id: { $regex: search, $options: 'i' } },
        { Party_Billing_Name: { $regex: search, $options: 'i' } }
      ];
    }

    const parties = await Party.find(filter)
      .select('Party_id Party_Billing_Name')
      .sort({ Party_id: 1 })
      .limit(parseInt(limit));

    const dropdownData = parties.map(party => ({
      id: party.Party_id,
      name: party.Party_Billing_Name,
      label: `${party.Party_id} - ${party.Party_Billing_Name}`
    }));

    return res.status(200).json({
      success: true,
      message: 'All Party dropdown data retrieved successfully',
      count: dropdownData.length,
      filters: { search, limit },
      data: dropdownData
    });

  } catch (error) {
    console.error('Party Dropdown Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};


export {
  manageParties,
  manageDropdownData,
  getPartyAnalytics,
  getAllPartiesDropdown
};
