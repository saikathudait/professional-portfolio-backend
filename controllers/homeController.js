import Home from '../models/Home.js';
import User from '../models/User.js';
import fs from 'fs';
import path from 'path';

// @desc    Get home data
// @route   GET /api/home
// @access  Public
export const getHome = async (req, res) => {
  try {
    let home = await Home.findOne();

    if (!home) {
      // Create default home data if not exists
      home = await Home.create({
        heroTitle: "Hi, I'm Saikat",
        heroSubtitle: 'Data Analyst & Machine Learning Engineer',
        heroDescription:
          'I build intelligent systems, dashboards, and predictive models. Explore my work.',
      });
    }

    const responseData = home.toObject();

    const includeOwnerImage = req.query.includeOwnerImage === 'true';

    if (includeOwnerImage && !responseData.heroImage) {
      const adminUser = await User.findOne({
        role: 'admin',
        profileImage: { $ne: '' },
      }).select('profileImage');

      if (adminUser?.profileImage) {
        responseData.ownerProfileImage = adminUser.profileImage;
      }
    }

    res.status(200).json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update home data
// @route   PUT /api/home
// @access  Private/Admin
export const updateHome = async (req, res) => {
  try {
    const allowedFields = [
      'heroTitle',
      'heroSubtitle',
      'heroDescription',
      'heroImage',
      'heroVideo',
      'cvLink',
      'ctaText',
      'ctaLink',
    ];
    const updateData = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    let home = await Home.findOne();

    if (!home) {
      home = await Home.create(updateData);
    } else {
      home = await Home.findByIdAndUpdate(home._id, updateData, {
        new: true,
        runValidators: true,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Home updated successfully',
      data: home,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const removeLocalResume = (resumeLink) => {
  if (!resumeLink) return;

  try {
    const parsed = new URL(resumeLink);
    const filePath = parsed.pathname.replace(/^[\\/]+/, '');
    if (!filePath.startsWith('uploads/')) return;
    const absolutePath = path.join(process.cwd(), filePath);
    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
    }
  } catch (error) {
    const filePath = resumeLink.replace(/^[\\/]+/, '');
    if (!filePath.startsWith('uploads/')) return;
    const absolutePath = path.join(process.cwd(), filePath);
    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
    }
  }
};

// @desc    Upload resume (PDF)
// @route   POST /api/home/cv
// @access  Private/Admin
export const uploadResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a PDF file',
      });
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    if (ext !== '.pdf') {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: 'Only PDF files are allowed',
      });
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const resumeUrl = `${baseUrl}/uploads/${req.file.filename}`;

    let home = await Home.findOne();
    if (!home) {
      home = await Home.create({ cvLink: resumeUrl });
    } else {
      removeLocalResume(home.cvLink);
      home.cvLink = resumeUrl;
      await home.save();
    }

    res.status(200).json({
      success: true,
      message: 'Resume uploaded successfully',
      url: resumeUrl,
      data: home,
    });
  } catch (error) {
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
