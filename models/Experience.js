import mongoose from 'mongoose';

const experienceSchema = new mongoose.Schema(
  {
    company: {
      type: String,
      required: true,
    },
    position: {
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
    responsibilities: [
      {
        type: String,
      },
    ],
    technologies: [
      {
        type: String,
      },
    ],
    companyLogo: {
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

export default mongoose.model('Experience', experienceSchema);