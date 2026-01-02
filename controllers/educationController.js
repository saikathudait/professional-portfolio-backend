import Education from '../models/Education.js';

// @desc    Get all education
// @route   GET /api/education
// @access  Public
export const getEducation = async (req, res) => {
  try {
    const education = await Education.find().sort({ order: 1, startDate: -1 });

    res.status(200).json({
      success: true,
      count: education.length,
      data: education,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get single education
// @route   GET /api/education/:id
// @access  Public
export const getEducationById = async (req, res) => {
  try {
    const education = await Education.findById(req.params.id);

    if (!education) {
      return res.status(404).json({
        success: false,
        message: 'Education not found',
      });
    }

    res.status(200).json({
      success: true,
      data: education,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Create education
// @route   POST /api/education
// @access  Private/Admin
export const createEducation = async (req, res) => {
  try {
    const education = await Education.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Education created successfully',
      data: education,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update education
// @route   PUT /api/education/:id
// @access  Private/Admin
export const updateEducation = async (req, res) => {
  try {
    const education = await Education.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!education) {
      return res.status(404).json({
        success: false,
        message: 'Education not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Education updated successfully',
      data: education,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Delete education
// @route   DELETE /api/education/:id
// @access  Private/Admin
export const deleteEducation = async (req, res) => {
  try {
    const education = await Education.findByIdAndDelete(req.params.id);

    if (!education) {
      return res.status(404).json({
        success: false,
        message: 'Education not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Education deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};