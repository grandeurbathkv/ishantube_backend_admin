import { Architect, ArchType, City, State } from './architect.model.js';

// Helper function to auto-create dropdown values
const autoCreateDropdownValues = async (Arch_type, Arch_city, Arch_state) => {
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
      await State.create({ state_name: Arch_state });
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
      case 'POST':
        // CREATE ARCHITECT
        const { 
          Arch_id, Arch_Name, 'Mobile Number': mobileNumber, 'Email id': email, 
          Arch_type, Arch_category, Image, Arch_Address, Arch_city, Arch_state 
        } = req.body;

        // Check if Architect with Arch_id already exists
        const existingArchitect = await Architect.findOne({ Arch_id });
        if (existingArchitect) {
          return res.status(400).json({ message: 'Architect with this ID already exists' });
        }

        // Auto-create dropdown values
        await autoCreateDropdownValues(Arch_type, Arch_city, Arch_state);

        const newArchitect = await Architect.create({
          Arch_id, Arch_Name, 'Mobile Number': mobileNumber, 'Email id': email,
          Arch_type, Arch_category, Image, Arch_Address, Arch_city, Arch_state,
        });

        return res.status(201).json({
          message: 'Architect created successfully',
          data: newArchitect,
        });

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
          return res.status(200).json({
            message: `Architects retrieved successfully${Object.keys(filter).length ? ' with filters' : ''}`,
            count: architects.length,
            filters: filter,
            data: architects,
          });
        }

      case 'PUT':
        // UPDATE ARCHITECT
        if (!id) {
          return res.status(400).json({ message: 'Architect ID is required for update' });
        }

        // Auto-create dropdown values if they don't exist
        await autoCreateDropdownValues(req.body.Arch_type, req.body.Arch_city, req.body.Arch_state);

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

        case 'city':
          const existingCity = await City.findOne({ city_name: name });
          if (existingCity) {
            return res.status(400).json({ message: 'City already exists' });
          }
          const newCity = await City.create({ city_name: name, state_code });
          return res.status(201).json({
            message: 'City added successfully',
            data: newCity,
          });

        case 'state':
          const existingState = await State.findOne({ state_name: name });
          if (existingState) {
            return res.status(400).json({ message: 'State already exists' });
          }
          const newState = await State.create({ state_name: name, state_code });
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
