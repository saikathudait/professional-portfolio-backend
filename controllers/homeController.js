import Home from '../models/Home.js';
import User from '../models/User.js';
import cloudinary from '../config/cloudinary.js';
import fs from 'fs';
import path from 'path';
import { resolveUploadsPath } from '../config/uploads.js';

const removeFileIfExists = (filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

const hasCloudinaryConfig =
  Boolean(process.env.CLOUDINARY_CLOUD_NAME) &&
  Boolean(process.env.CLOUDINARY_API_KEY) &&
  Boolean(process.env.CLOUDINARY_API_SECRET);
const shouldUseCloudinaryForResume =
  process.env.RESUME_STORAGE === 'cloudinary' && hasCloudinaryConfig;

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

const getNormalizedUploadPath = (value) => {
  if (!value) return '';
  const normalized = value.replace(/\\/g, '/');
  const match = normalized.match(/^\/?(?:api\/)?uploads\/(.+)$/);
  return match ? `/uploads/${match[1]}` : '';
};

const normalizeCvLink = (req, cvLink) => {
  if (!cvLink) return '';

  const baseUrl = getRequestBaseUrl(req);
  const localUploadPath = getNormalizedUploadPath(cvLink);

  if (localUploadPath) {
    return `${baseUrl}${localUploadPath}`;
  }

  try {
    const parsedUrl = new URL(cvLink);
    const uploadPath = getNormalizedUploadPath(parsedUrl.pathname);
    if (!uploadPath) {
      return cvLink;
    }

    const currentHost = new URL(baseUrl).host;
    const isLocalHost = ['localhost', '127.0.0.1', '0.0.0.0'].includes(
      parsedUrl.hostname
    );

    if (isLocalHost || parsedUrl.host === currentHost) {
      return `${baseUrl}${uploadPath}`;
    }
  } catch (error) {
    return cvLink;
  }

  return cvLink;
};

const getLocalUploadPathFromLink = (req, resumeLink) => {
  const directUploadPath = getNormalizedUploadPath(resumeLink);
  if (directUploadPath) return directUploadPath;

  try {
    const parsedUrl = new URL(resumeLink);
    const uploadPath = getNormalizedUploadPath(parsedUrl.pathname);
    if (!uploadPath) return '';

    const currentHost = new URL(getRequestBaseUrl(req)).host;
    const isLocalHost = ['localhost', '127.0.0.1', '0.0.0.0'].includes(
      parsedUrl.hostname
    );

    return isLocalHost || parsedUrl.host === currentHost ? uploadPath : '';
  } catch {
    return '';
  }
};

const hasLocalResumeFile = (req, resumeLink) => {
  const uploadPath = getLocalUploadPathFromLink(req, resumeLink);
  if (!uploadPath) return true;

  const absolutePath = resolveUploadsPath(uploadPath);
  return Boolean(absolutePath && fs.existsSync(absolutePath));
};

const getPdfPageCount = (filePath) => {
  try {
    const pdf = fs.readFileSync(filePath, 'latin1');
    const matches = pdf.match(/\/Type\s*\/Page\b/g);
    return matches?.length || null;
  } catch (error) {
    return null;
  }
};

const getResumeMetadata = (file, storage) => ({
  cvFileName: file.originalname || file.filename || 'resume.pdf',
  cvFileSize: file.size || 0,
  cvMimeType: file.mimetype || 'application/pdf',
  cvUploadedAt: new Date(),
  cvPageCount: getPdfPageCount(file.path),
  cvStorage: storage,
});

const clearResumeMetadata = {
  cvFileName: '',
  cvFileSize: 0,
  cvMimeType: '',
  cvUploadedAt: null,
  cvPageCount: null,
  cvStorage: '',
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
    const resumeFileExists = hasLocalResumeFile(req, responseData.cvLink);
    responseData.cvLink = resumeFileExists
      ? normalizeCvLink(req, responseData.cvLink)
      : '';
    responseData.cvMissing = !resumeFileExists;
    responseData.cv = {
      link: responseData.cvLink,
      fileName: responseData.cvFileName || '',
      fileSize: responseData.cvFileSize || 0,
      mimeType: responseData.cvMimeType || '',
      uploadedAt: responseData.cvUploadedAt || null,
      pageCount: responseData.cvPageCount || null,
      storage: responseData.cvStorage || '',
    };

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
      home = await Home.create(
        req.body.cvLink !== undefined
          ? { ...updateData, ...clearResumeMetadata, cvStorage: updateData.cvLink ? 'external' : '' }
          : updateData
      );
    } else {
      if (req.body.cvLink !== undefined && req.body.cvLink !== home.cvLink) {
        removeLocalResume(home.cvLink);
        Object.assign(
          updateData,
          updateData.cvLink
            ? { ...clearResumeMetadata, cvStorage: 'external' }
            : clearResumeMetadata
        );
      }

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

  let uploadPath = getNormalizedUploadPath(resumeLink);

  try {
    const parsed = new URL(resumeLink);
    uploadPath = getNormalizedUploadPath(parsed.pathname);
  } catch (error) {
    // Non-URL values are handled by the direct path normalization above.
  }

  const absolutePath = resolveUploadsPath(uploadPath);
  removeFileIfExists(absolutePath);
};

const storeResumeLocally = (req) => {
  const resumePath = `/uploads/${req.file.filename}`;
  return {
    resumeUrl: normalizeCvLink(req, resumePath),
    storedResumeValue: resumePath,
    metadata: getResumeMetadata(req.file, 'local'),
  };
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
      removeFileIfExists(req.file.path);
      return res.status(400).json({
        success: false,
        message: 'Only PDF files are allowed',
      });
    }

    let resumeUrl;
    let storedResumeValue;
    let metadata;

    if (shouldUseCloudinaryForResume) {
      try {
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: 'portfolio/resume',
          resource_type: 'raw',
          use_filename: true,
          unique_filename: true,
        });
        resumeUrl = result.secure_url;
        storedResumeValue = resumeUrl;
        metadata = getResumeMetadata(req.file, 'cloudinary');
        removeFileIfExists(req.file.path);
      } catch (error) {
        const stored = storeResumeLocally(req);
        resumeUrl = stored.resumeUrl;
        storedResumeValue = stored.storedResumeValue;
        metadata = stored.metadata;
        console.warn(`Cloudinary resume upload failed, saved locally: ${error.message}`);
      }
    } else {
      const stored = storeResumeLocally(req);
      resumeUrl = stored.resumeUrl;
      storedResumeValue = stored.storedResumeValue;
      metadata = stored.metadata;
    }

    let home = await Home.findOne();
    if (!home) {
      home = await Home.create({ cvLink: storedResumeValue, ...metadata });
    } else {
      removeLocalResume(home.cvLink);
      home.cvLink = storedResumeValue;
      Object.assign(home, metadata);
      await home.save();
    }

    res.status(200).json({
      success: true,
      message: 'Resume uploaded successfully',
      url: resumeUrl,
      data: home,
    });
  } catch (error) {
    removeFileIfExists(req.file?.path);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
