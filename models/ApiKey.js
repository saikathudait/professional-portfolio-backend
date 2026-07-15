import mongoose from 'mongoose';

const apiKeySchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      required: true,
      unique: true,
      enum: ['groq'],
    },
    encryptedValue: {
      type: String,
      default: '',
    },
    iv: {
      type: String,
      default: '',
    },
    authTag: {
      type: String,
      default: '',
    },
    maskedValue: {
      type: String,
      default: '',
    },
    modelName: {
      type: String,
      trim: true,
      default: '',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('ApiKey', apiKeySchema);
