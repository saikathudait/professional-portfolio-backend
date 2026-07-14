import CoverLetter from '../models/CoverLetter.js';

const normalizeCoverLetter = (coverLetter) => {
  if (!coverLetter) return null;

  const data = coverLetter.toObject();
  return {
    _id: data._id,
    title: data.title || 'Cover Letter',
    content: data.content || '',
    updatedAt: data.updatedAt,
    createdAt: data.createdAt,
  };
};

const findLatestCoverLetter = () =>
  CoverLetter.findOne().sort({ createdAt: -1, _id: -1 });

// @desc    Get latest cover letter
// @route   GET /api/cover-letter
// @access  Public
export const getCoverLetter = async (req, res) => {
  try {
    const coverLetter = await findLatestCoverLetter();

    res.status(200).json({
      success: true,
      data: normalizeCoverLetter(coverLetter),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Save latest cover letter and delete older records
// @route   PUT /api/cover-letter
// @access  Private/Admin
export const updateCoverLetter = async (req, res) => {
  try {
    const title = (req.body.title || 'Cover Letter').trim();
    const content = (req.body.content || '').trim();

    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'Cover letter text is required',
      });
    }

    const coverLetter = await CoverLetter.create({
      title: title || 'Cover Letter',
      content,
      updatedBy: req.user?._id || null,
    });

    await CoverLetter.deleteMany({ _id: { $ne: coverLetter._id } });

    res.status(200).json({
      success: true,
      message: 'Cover letter updated successfully',
      data: normalizeCoverLetter(coverLetter),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Delete current cover letter
// @route   DELETE /api/cover-letter
// @access  Private/Admin
export const deleteCoverLetter = async (req, res) => {
  try {
    await CoverLetter.deleteMany({});

    res.status(200).json({
      success: true,
      message: 'Cover letter deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
