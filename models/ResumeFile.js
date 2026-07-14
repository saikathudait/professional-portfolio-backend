import mongoose from 'mongoose';

const resumeFileSchema = new mongoose.Schema(
  {
    fileName: {
      type: String,
      required: true,
      default: 'resume.pdf',
    },
    mimeType: {
      type: String,
      required: true,
      default: 'application/pdf',
    },
    size: {
      type: Number,
      required: true,
      default: 0,
    },
    data: {
      type: Buffer,
      required: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('ResumeFile', resumeFileSchema);
