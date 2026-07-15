import {
  getGroqApiKeyStatus,
  replaceGroqApiKey,
} from '../utils/apiKeyVault.js';
import { validateGroqApiKey } from '../utils/groqApi.js';

// @desc    Get Groq API key status
// @route   GET /api/api-keys/groq
// @access  Private/Admin
export const getGroqKeyStatus = async (req, res) => {
  try {
    const status = await getGroqApiKeyStatus();

    res.status(200).json({
      success: true,
      data: status,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
      code: error.code || 'API_KEY_UPDATE_FAILED',
    });
  }
};

// @desc    Replace Groq API key
// @route   PUT /api/api-keys/groq
// @access  Private/Admin
export const updateGroqKey = async (req, res) => {
  try {
    const apiKey = typeof req.body.apiKey === 'string' ? req.body.apiKey : '';
    const cleanKey = apiKey.trim();

    if (!cleanKey) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a Groq API key.',
      });
    }

    if (cleanKey.length < 20) {
      return res.status(400).json({
        success: false,
        message: 'API key looks too short. Please enter a valid Groq key.',
      });
    }

    await validateGroqApiKey(cleanKey);
    const status = await replaceGroqApiKey(cleanKey, req.user?._id || null);

    res.status(200).json({
      success: true,
      message: 'Groq API key updated successfully.',
      data: status,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
