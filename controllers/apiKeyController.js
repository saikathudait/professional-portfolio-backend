import {
  getGroqApiKeyStatus,
  getActiveGroqApiKey,
  replaceGroqConfig,
} from '../utils/apiKeyVault.js';
import { listAvailableGroqModels, validateGroqApiKey } from '../utils/groqApi.js';

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
    const modelName =
      typeof req.body.modelName === 'string' ? req.body.modelName : '';
    const cleanKey = apiKey.trim();
    const cleanModelName = modelName.trim();

    if (!cleanKey && !cleanModelName) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a Groq API key or model name.',
      });
    }

    if (cleanKey.length < 20) {
      return res.status(400).json({
        success: false,
        message: 'API key looks too short. Please enter a valid Groq key.',
      });
    }

    if (cleanKey) {
      await validateGroqApiKey(cleanKey);
    }

    if (cleanModelName) {
      const activeKey = cleanKey || (await getActiveGroqApiKey());
      if (activeKey) {
        const availableModels = await listAvailableGroqModels(activeKey);
        if (!availableModels.includes(cleanModelName)) {
          return res.status(400).json({
            success: false,
            code: 'GROQ_MODEL_UNAVAILABLE',
            message:
              'This model is not available for the saved Groq account. Try openai/gpt-oss-20b or choose a model listed in your Groq console.',
          });
        }
      }
    }

    const status = await replaceGroqConfig({
      apiKey: cleanKey,
      modelName: cleanModelName,
      updatedBy: req.user?._id || null,
    });

    res.status(200).json({
      success: true,
      message: 'Groq chatbot settings updated successfully.',
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
