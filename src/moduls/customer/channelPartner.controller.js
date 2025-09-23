// @desc    Get all Channel Partner IDs and Names for dropdown
// @route   GET /api/channelpartner/dropdown
// @access  Protected
// ...existing code...
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
import { ChannelPartner } from './channelPartner.model.js';

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

          return res.status(200).json({
            message: 'Channel Partner retrieved successfully',
            data: {
              partner: channelPartner,
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

          return res.status(200).json({
            message: `Channel Partners retrieved successfully${Object.keys(filter).length ? ' with filters' : ''}`,
            count: channelPartners.length,
            filters: filter,
            data: channelPartners,
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