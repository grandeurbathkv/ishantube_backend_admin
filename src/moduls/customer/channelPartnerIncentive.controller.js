import { ChannelPartner } from './channelPartner.model.js';
import { ChannelPartnerIncentive } from './channelPartnerIncentive.model.js';

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
        const { CP_id, Brand, Incentive_type, Incentive_factor } = req.body;

        // Check if Channel Partner exists
        const channelPartner = await ChannelPartner.findOne({ CP_id });
        if (!channelPartner) {
          return res.status(404).json({ message: 'Channel Partner not found' });
        }

        // Check if incentive for this brand already exists for this channel partner
        const existingIncentive = await ChannelPartnerIncentive.findOne({ CP_id, Brand });
        if (existingIncentive) {
          return res.status(400).json({ message: 'Incentive for this brand already exists for this Channel Partner' });
        }

        const newIncentive = await ChannelPartnerIncentive.create({
          CP_id, Brand, Incentive_type, Incentive_factor,
        });

        return res.status(201).json({
          message: 'Channel Partner Incentive created successfully',
          data: newIncentive,
        });

      case 'GET':
        if (id) {
          // GET INCENTIVE BY ID
          const incentive = await ChannelPartnerIncentive.findById(id);
          if (!incentive) {
            return res.status(404).json({ message: 'Channel Partner Incentive not found' });
          }

          // Get channel partner details
          const partner = await ChannelPartner.findOne({ CP_id: incentive.CP_id });

          return res.status(200).json({
            message: 'Channel Partner Incentive retrieved successfully',
            data: {
              incentive: incentive,
              partner: partner,
            },
          });
        } else {
          // GET ALL INCENTIVES WITH FILTERS
          const { cp_id, brand, incentive_type, search } = req.query;
          let filter = {};

          // Apply filters based on query parameters
          if (cp_id) filter.CP_id = cp_id;
          if (brand) filter.Brand = new RegExp(brand, 'i');
          if (incentive_type) filter.Incentive_type = incentive_type;
          if (search) {
            filter.$or = [
              { Brand: new RegExp(search, 'i') },
              { CP_id: new RegExp(search, 'i') }
            ];
          }

          const incentives = await ChannelPartnerIncentive.find(filter).sort({ Brand: 1 });

          // Populate with channel partner details
          const incentivesWithPartner = await Promise.all(
            incentives.map(async (incentive) => {
              const partner = await ChannelPartner.findOne({ CP_id: incentive.CP_id });
              return {
                ...incentive.toObject(),
                partner_name: partner ? partner.CP_Name : 'Unknown Partner',
                partner_details: partner,
              };
            })
          );

          return res.status(200).json({
            message: `Channel Partner Incentives retrieved successfully${Object.keys(filter).length ? ' with filters' : ''}`,
            count: incentives.length,
            filters: filter,
            data: incentivesWithPartner,
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

        // If CP_id or Brand is being updated, check for conflicts
        const { CP_id: newCP_id, Brand: newBrand } = req.body;
        if (newCP_id || newBrand) {
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

        const updatedIncentive = await ChannelPartnerIncentive.findByIdAndUpdate(
          id,
          req.body,
          { new: true, runValidators: true }
        );

        return res.status(200).json({
          message: 'Channel Partner Incentive updated successfully',
          data: updatedIncentive,
        });

      case 'DELETE':
        // DELETE INCENTIVE
        if (!id) {
          return res.status(400).json({ message: 'Incentive ID is required for deletion' });
        }

        const deletedIncentive = await ChannelPartnerIncentive.findByIdAndDelete(id);
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

    // Check if Channel Partner exists
    const channelPartner = await ChannelPartner.findOne({ CP_id: cpId });
    if (!channelPartner) {
      return res.status(404).json({ message: 'Channel Partner not found' });
    }

    // Get all incentives for this channel partner
    const incentives = await ChannelPartnerIncentive.find({ CP_id: cpId }).sort({ Brand: 1 });

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