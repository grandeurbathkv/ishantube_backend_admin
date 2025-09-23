// @desc    Change status (active/inactive) of a Channel Partner Incentive
// @route   PATCH /api/incentives/:id/status
// @access  Protected
export const changeIncentiveStatus = async (req, res, next) => {
  try {
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
import { ChannelPartner } from './channelPartner.model.js';
import { ChannelPartnerIncentive } from './channelPartnerIncentive.model.js';

// @desc    Create Channel Partner with Incentive (Combined)
// @route   POST /api/incentives/create-with-partner
// @access  Protected
export const createChannelPartnerWithIncentive = async (req, res, next) => {
  try {
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