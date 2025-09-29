import { Architect, ArchType, City, State } from './architect.model.js';

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
// @desc    Get all Architect Categories (Static list)
// @route   GET /api/architect/categories
// @access  Protected
export const getArchitectCategories = async (req, res, next) => {
  try {
    const categories = ['A', 'B', 'C', 'D'];
    return res.status(200).json({
      message: 'Architect categories retrieved successfully',
      count: categories.length,
      data: categories.map(cat => ({ category: cat })),
    });
  } catch (error) {
    next(error);
  }
};
