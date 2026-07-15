import crypto from 'crypto';
import ApiKey from '../models/ApiKey.js';
import { DEFAULT_GROQ_MODEL } from './groqApi.js';

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

const hasEncryptedKey = (record) =>
  Boolean(record?.encryptedValue && record?.iv && record?.authTag);

const getEnvironmentModel = () => process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL;

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
  const hasDatabaseKey = hasEncryptedKey(storedKey);
  const hasEnvironmentKey = Boolean(process.env.GROQ_API_KEY);
  const modelName = storedKey?.modelName || getEnvironmentModel();

  if (hasDatabaseKey) {
    return {
      configured: true,
      source: 'database',
      maskedValue: storedKey.maskedValue,
      modelName,
      modelSource: storedKey.modelName ? 'database' : process.env.GROQ_MODEL ? 'environment' : 'default',
      updatedAt: storedKey.updatedAt,
    };
  }

  if (hasEnvironmentKey) {
    return {
      configured: true,
      source: 'environment',
      maskedValue: maskApiKey(process.env.GROQ_API_KEY),
      modelName,
      modelSource: storedKey?.modelName ? 'database' : process.env.GROQ_MODEL ? 'environment' : 'default',
      updatedAt: null,
    };
  }

  return {
    configured: false,
    source: '',
    maskedValue: '',
    modelName,
    modelSource: storedKey?.modelName ? 'database' : process.env.GROQ_MODEL ? 'environment' : 'default',
    updatedAt: storedKey?.updatedAt || null,
  };
};

export const getActiveGroqApiKey = async () => {
  const storedKey = await ApiKey.findOne({ provider: GROQ_PROVIDER }).lean();

  if (hasEncryptedKey(storedKey)) {
    return decryptSecret(storedKey);
  }

  return process.env.GROQ_API_KEY || '';
};

export const getConfiguredGroqModel = async () => {
  const storedKey = await ApiKey.findOne({ provider: GROQ_PROVIDER })
    .select('modelName')
    .lean();

  return storedKey?.modelName || getEnvironmentModel();
};

export const replaceGroqConfig = async ({
  apiKey,
  modelName,
  updatedBy = null,
}) => {
  const cleanKey = typeof apiKey === 'string' ? apiKey.trim() : '';
  const cleanModelName =
    typeof modelName === 'string' ? modelName.trim() : undefined;
  const updatePayload = {
    provider: GROQ_PROVIDER,
    updatedBy,
  };

  if (cleanKey) {
    Object.assign(updatePayload, {
      ...encryptSecret(cleanKey),
      maskedValue: maskApiKey(cleanKey),
    });
  }

  if (cleanModelName !== undefined) {
    updatePayload.modelName = cleanModelName;
  }

  const apiKeyRecord = await ApiKey.findOneAndUpdate(
    { provider: GROQ_PROVIDER },
    updatePayload,
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
    configured: hasEncryptedKey(apiKeyRecord) || Boolean(process.env.GROQ_API_KEY),
    source: hasEncryptedKey(apiKeyRecord)
      ? 'database'
      : process.env.GROQ_API_KEY
        ? 'environment'
        : '',
    maskedValue: hasEncryptedKey(apiKeyRecord)
      ? apiKeyRecord.maskedValue
      : process.env.GROQ_API_KEY
        ? maskApiKey(process.env.GROQ_API_KEY)
        : '',
    modelName: apiKeyRecord.modelName || getEnvironmentModel(),
    modelSource: apiKeyRecord.modelName ? 'database' : process.env.GROQ_MODEL ? 'environment' : 'default',
    updatedAt: apiKeyRecord.updatedAt,
  };
};
