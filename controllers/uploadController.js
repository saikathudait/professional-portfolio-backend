import cloudinary from '../config/cloudinary.js';
import fs from 'fs';

const removeFileIfExists = (filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

// @desc    Upload image to Cloudinary
// @route   POST /api/upload
// @access  Private/Admin
export const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a file',
      });
    }

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'portfolio',
      use_filename: true,
      unique_filename: true,
    });

    removeFileIfExists(req.file.path);

    res.status(200).json({
      success: true,
      message: 'File uploaded successfully',
      url: result.secure_url,
      publicId: result.public_id,
    });
  } catch (error) {
    removeFileIfExists(req.file?.path);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Upload multiple images to Cloudinary
// @route   POST /api/upload/multiple
// @access  Private/Admin
export const uploadMultipleImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please upload files',
      });
    }

    const uploadPromises = req.files.map(async (file) => {
      const result = await cloudinary.uploader.upload(file.path, {
        folder: 'portfolio',
        use_filename: true,
        unique_filename: true,
      });

      removeFileIfExists(file.path);

      return {
        url: result.secure_url,
        publicId: result.public_id,
      };
    });

    const uploadedFiles = await Promise.all(uploadPromises);

    res.status(200).json({
      success: true,
      message: 'Files uploaded successfully',
      data: uploadedFiles,
    });
  } catch (error) {
    if (req.files) {
      req.files.forEach((file) => {
        removeFileIfExists(file.path);
      });
    }

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Delete image from Cloudinary
// @route   DELETE /api/upload/:publicId
// @access  Private/Admin
export const deleteImage = async (req, res) => {
  try {
    const publicId = decodeURIComponent(req.params.publicId || '');

    await cloudinary.uploader.destroy(publicId);

    res.status(200).json({
      success: true,
      message: 'Image deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
