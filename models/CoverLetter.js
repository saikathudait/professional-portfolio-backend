import mongoose from 'mongoose';

const coverLetterSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
      default: 'Cover Letter',
      maxlength: 120,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 12000,
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

export default mongoose.model('CoverLetter', coverLetterSchema);
