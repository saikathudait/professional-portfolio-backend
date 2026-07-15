const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
export const GROQ_CHAT_URL = `${GROQ_BASE_URL}/chat/completions`;
export const GROQ_MODELS_URL = `${GROQ_BASE_URL}/models`;
export const DEFAULT_GROQ_MODEL = 'llama-3.1-8b-instant';

export const getGroqModel = () =>
  process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL;

export const parseGroqError = (status, data = {}) => {
  const rawMessage =
    data?.error?.message ||
    data?.message ||
    (typeof data === 'string' ? data : '') ||
    'Groq request failed.';
  const lowerMessage = rawMessage.toLowerCase();

  if (status === 401 || status === 403) {
    return {
      code: 'GROQ_AUTH_FAILED',
      logMessage: rawMessage,
      publicMessage:
        'The chatbot API key could not be verified. Please update the Groq key in the admin panel.',
    };
  }

  if (status === 429) {
    return {
      code: 'GROQ_RATE_LIMITED',
      logMessage: rawMessage,
      publicMessage:
        'The AI assistant is temporarily rate limited. Please try again in a moment.',
    };
  }

  if (lowerMessage.includes('model')) {
    return {
      code: 'GROQ_MODEL_UNAVAILABLE',
      logMessage: rawMessage,
      publicMessage:
        'The selected AI model is unavailable right now. Please check the Groq model setting.',
    };
  }

  return {
    code: 'GROQ_REQUEST_FAILED',
    logMessage: rawMessage,
    publicMessage:
      'The AI assistant is unavailable right now. Please try again soon.',
  };
};

export const validateGroqApiKey = async (apiKey) => {
  const response = await fetch(GROQ_MODELS_URL, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const parsedError = parseGroqError(response.status, data);
    const error = new Error(parsedError.publicMessage);
    error.statusCode = response.status === 401 || response.status === 403 ? 400 : 502;
    error.code = parsedError.code;
    error.logMessage = parsedError.logMessage;
    throw error;
  }

  return {
    ok: true,
    modelCount: Array.isArray(data?.data) ? data.data.length : 0,
  };
};
