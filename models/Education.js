import mongoose from 'mongoose';

const educationSchema = new mongoose.Schema(
  {
    degree: {
      type: String,
      required: true,
    },
    institution: {
      type: String,
      required: true,
    },
    location: {
      type: String,
      default: '',
    },
    startDate: {
      type: String,
      required: true,
    },
    endDate: {
      type: String,
      default: 'Present',
    },
    grade: {
      type: String,
      default: '',
    },
    description: {
      type: String,
      default: '',
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Education', educationSchema);