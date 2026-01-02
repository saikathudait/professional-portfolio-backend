import About from '../models/About.js';
import User from '../models/User.js';

// @desc    Get about data
// @route   GET /api/about
// @access  Public
export const getAbout = async (req, res) => {
  try {
    let about = await About.findOne();

    if (!about) {
      about = await About.create({
        bio: 'Passionate Data Analyst and Machine Learning Engineer with expertise in building intelligent systems.',
        missionStatement:
          'My mission is to leverage data science and AI to solve real-world problems.',
      });
    }

    const responseData = about.toObject();
    responseData.certifications = responseData.certifications || [];
    responseData.volunteering = responseData.volunteering || [];

    const includeOwnerImage = req.query.includeOwnerImage === 'true';

    if (includeOwnerImage && !responseData.profileImage) {
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

// @desc    Update about data
// @route   PUT /api/about
// @access  Private/Admin
export const updateAbout = async (req, res) => {
  try {
    const { _id, createdAt, updatedAt, __v, ...payload } = req.body;
    let about = await About.findOne();

    if (!about) {
      about = await About.create(payload);
    } else {
      about = await About.findByIdAndUpdate(about._id, payload, {
        new: true,
        runValidators: true,
      });
    }

    res.status(200).json({
      success: true,
      message: 'About updated successfully',
      data: about,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
