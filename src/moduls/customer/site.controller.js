import { Site, SiteCity, SiteState } from './site.model.js';
import mongoose from 'mongoose';

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

          // Include detailed references if requested
          if (include_details === 'true') {
            query = query
              .populate('Site_User_id', 'name email')
              .populate('partyDetails', 'Party_Billing_Name Contact_Person Mobile_Number')
              .populate('channelPartnerDetails', 'CP_Name Mobile_Number');
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

export {
  manageSites,
  manageSiteDropdownData,
  getSitesByParty,
  getSiteAnalytics
};
