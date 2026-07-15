import crypto from 'crypto';
import ApiKey from '../models/ApiKey.js';

const ALGORITHM = 'aes-256-gcm';
const GROQ_PROVIDER = 'groq';

const getEncryptionSecret = () =>
  process.env.API_KEY_ENCRYPTION_SECRET || process.env.JWT_SECRET || '';

const getEncryptionKey = () => {
  const secret = getEncryptionSecret();
  if (!secret) {
    throw new Error('API key encryption secret is not configured');
  }
  return crypto.createHash('sha256').update(secret).digest();
};

const maskApiKey = (apiKey = '') => {
  const cleanKey = apiKey.trim();
  if (cleanKey.length <= 8) return '********';
  return `${cleanKey.slice(0, 4)}...${cleanKey.slice(-4)}`;
};

export const encryptSecret = (plainValue) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plainValue, 'utf8'),
    cipher.final(),
  ]);

  return {
    encryptedValue: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64'),
  };
};

export const decryptSecret = ({ encryptedValue, iv, authTag }) => {
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    getEncryptionKey(),
    Buffer.from(iv, 'base64')
  );

  decipher.setAuthTag(Buffer.from(authTag, 'base64'));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, 'base64')),
    decipher.final(),
  ]).toString('utf8');
};

export const getGroqApiKeyStatus = async () => {
  const storedKey = await ApiKey.findOne({ provider: GROQ_PROVIDER }).lean();

  if (storedKey) {
    return {
      configured: true,
      source: 'database',
      maskedValue: storedKey.maskedValue,
      updatedAt: storedKey.updatedAt,
    };
  }

  if (process.env.GROQ_API_KEY) {
    return {
      configured: true,
      source: 'environment',
      maskedValue: maskApiKey(process.env.GROQ_API_KEY),
      updatedAt: null,
    };
  }

  return {
    configured: false,
    source: '',
    maskedValue: '',
    updatedAt: null,
  };
};

export const getActiveGroqApiKey = async () => {
  const storedKey = await ApiKey.findOne({ provider: GROQ_PROVIDER }).lean();

  if (storedKey) {
    return decryptSecret(storedKey);
  }

  return process.env.GROQ_API_KEY || '';
};

export const replaceGroqApiKey = async (apiKey, updatedBy = null) => {
  const cleanKey = apiKey.trim();
  const encryptedPayload = encryptSecret(cleanKey);

  const apiKeyRecord = await ApiKey.findOneAndUpdate(
    { provider: GROQ_PROVIDER },
    {
      provider: GROQ_PROVIDER,
      ...encryptedPayload,
      maskedValue: maskApiKey(cleanKey),
      updatedBy,
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );

  await ApiKey.deleteMany({
    provider: GROQ_PROVIDER,
    _id: { $ne: apiKeyRecord._id },
  });

  return {
    configured: true,
    source: 'database',
    maskedValue: apiKeyRecord.maskedValue,
    updatedAt: apiKeyRecord.updatedAt,
  };
};
