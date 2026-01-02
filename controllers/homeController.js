import Home from '../models/Home.js';
import User from '../models/User.js';
import fs from 'fs';
import path from 'path';
import { resolveUploadsPath } from '../config/uploads.js';

const getRequestBaseUrl = (req) => {
  const forwardedProto = req.headers['x-forwarded-proto'];
  const protocol = Array.isArray(forwardedProto)
    ? forwardedProto[0]
    : forwardedProto || req.protocol;
  const forwardedHost = req.headers['x-forwarded-host'];
  const host = Array.isArray(forwardedHost)
    ? forwardedHost[0]
    : forwardedHost || req.get('host');
  return `${protocol}://${host}`;
};

const normalizeCvLink = (req, cvLink) => {
  if (!cvLink) return '';

  const baseUrl = getRequestBaseUrl(req);

  if (cvLink.startsWith('/uploads/')) {
    return `${baseUrl}${cvLink}`;
  }

  if (cvLink.startsWith('uploads/')) {
    return `${baseUrl}/${cvLink}`;
  }

  try {
    const parsedUrl = new URL(cvLink);
    if (!parsedUrl.pathname.startsWith('/uploads/')) {
      return cvLink;
    }

    const currentHost = new URL(baseUrl).host;
    const isLocalHost = ['localhost', '127.0.0.1', '0.0.0.0'].includes(
      parsedUrl.hostname
    );

    if (isLocalHost || parsedUrl.host === currentHost) {
      return `${baseUrl}${parsedUrl.pathname}`;
    }
  } catch (error) {
    return cvLink;
  }

  return cvLink;
};

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
    responseData.cvLink = normalizeCvLink(req, responseData.cvLink);

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
    const absolutePath = resolveUploadsPath(filePath);
    if (absolutePath && fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
    }
  } catch (error) {
    const filePath = resumeLink.replace(/^[\\/]+/, '');
    const absolutePath = resolveUploadsPath(filePath);
    if (absolutePath && fs.existsSync(absolutePath)) {
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

    const resumePath = `/uploads/${req.file.filename}`;
    const resumeUrl = normalizeCvLink(req, resumePath);

    let home = await Home.findOne();
    if (!home) {
      home = await Home.create({ cvLink: resumePath });
    } else {
      removeLocalResume(home.cvLink);
      home.cvLink = resumePath;
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
