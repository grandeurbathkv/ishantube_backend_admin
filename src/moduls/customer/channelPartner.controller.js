import { ChannelPartner, ChannelPartnerIncentive } from './channelPartner.model.js';

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
          CP_id, CP_Name, 'Mobile Number': mobileNumber, 'Email id': email, 
          Image, CP_Address 
        } = req.body;

        // Check if Channel Partner with CP_id already exists
        const existingPartner = await ChannelPartner.findOne({ CP_id });
        if (existingPartner) {
          return res.status(400).json({ message: 'Channel Partner with this ID already exists' });
        }

        const newChannelPartner = await ChannelPartner.create({
          CP_id, CP_Name, 'Mobile Number': mobileNumber, 'Email id': email,
          Image, CP_Address,
        });

        return res.status(201).json({
          message: 'Channel Partner created successfully',
          data: newChannelPartner,
        });

      case 'GET':
        if (id) {
          // GET CHANNEL PARTNER BY ID with incentives
          const channelPartner = await ChannelPartner.findOne({ CP_id: id });
          if (!channelPartner) {
            return res.status(404).json({ message: 'Channel Partner not found' });
          }

          // Get incentives for this channel partner
          const incentives = await ChannelPartnerIncentive.find({ CP_id: id });

          return res.status(200).json({
            message: 'Channel Partner retrieved successfully',
            data: {
              partner: channelPartner,
              incentives: incentives,
            },
          });
        } else {
          // GET ALL CHANNEL PARTNERS WITH FILTERS
          const { search, include_incentives } = req.query;
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

          // Include incentives if requested
          let responseData = channelPartners;
          if (include_incentives === 'true') {
            responseData = await Promise.all(
              channelPartners.map(async (partner) => {
                const incentives = await ChannelPartnerIncentive.find({ CP_id: partner.CP_id });
                return {
                  ...partner.toObject(),
                  incentives: incentives,
                };
              })
            );
          }

          return res.status(200).json({
            message: `Channel Partners retrieved successfully${Object.keys(filter).length ? ' with filters' : ''}`,
            count: channelPartners.length,
            filters: filter,
            data: responseData,
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

        // Also delete all associated incentives
        await ChannelPartnerIncentive.deleteMany({ CP_id: id });

        return res.status(200).json({
          message: 'Channel Partner and associated incentives deleted successfully',
          data: deletedPartner,
        });

      default:
        return res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Channel Partner Incentive Management (Create, Read, Update, Delete)
// @route   POST /api/channelpartner/:id/incentives (Create incentive)
// @route   GET /api/channelpartner/incentives (Get All incentives with filters)
// @route   PUT /api/channelpartner/incentives/:incentiveId (Update incentive)
// @route   DELETE /api/channelpartner/incentives/:incentiveId (Delete incentive)
// @access  Protected
export const manageIncentives = async (req, res, next) => {
  try {
    const { method } = req;
    const { id, incentiveId } = req.params;

    switch (method) {
      case 'POST':
        // CREATE CHANNEL PARTNER INCENTIVE
        const { Brand, Incentive_type, Incentive_factor } = req.body;
        const CP_id = id;

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

        // Populate with channel partner details if needed
        const incentivesWithPartner = await Promise.all(
          incentives.map(async (incentive) => {
            const partner = await ChannelPartner.findOne({ CP_id: incentive.CP_id });
            return {
              ...incentive.toObject(),
              partner_name: partner ? partner.CP_Name : 'Unknown Partner',
            };
          })
        );

        return res.status(200).json({
          message: `Channel Partner Incentives retrieved successfully${Object.keys(filter).length ? ' with filters' : ''}`,
          count: incentives.length,
          filters: filter,
          data: incentivesWithPartner,
        });

      case 'PUT':
        // UPDATE INCENTIVE
        if (!incentiveId) {
          return res.status(400).json({ message: 'Incentive ID is required for update' });
        }

        const updatedIncentive = await ChannelPartnerIncentive.findByIdAndUpdate(
          incentiveId,
          req.body,
          { new: true, runValidators: true }
        );

        if (!updatedIncentive) {
          return res.status(404).json({ message: 'Channel Partner Incentive not found' });
        }

        return res.status(200).json({
          message: 'Channel Partner Incentive updated successfully',
          data: updatedIncentive,
        });

      case 'DELETE':
        // DELETE INCENTIVE
        if (!incentiveId) {
          return res.status(400).json({ message: 'Incentive ID is required for deletion' });
        }

        const deletedIncentive = await ChannelPartnerIncentive.findByIdAndDelete(incentiveId);
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
