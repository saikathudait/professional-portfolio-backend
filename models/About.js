import mongoose from 'mongoose';

const aboutSchema = new mongoose.Schema(
  {
    bio: {
      type: String,
      required: true,
      default: 'Passionate Data Analyst and Machine Learning Engineer...',
    },
    missionStatement: {
      type: String,
      required: true,
      default: 'My mission is to leverage data science and AI...',
    },
    profileImage: {
      type: String,
      default: '',
    },
    certifications: [
      {
        name: String,
        issuer: String,
        date: String,
        credentialUrl: String,
      },
    ],
    volunteering: [
      {
        organization: String,
        role: String,
        description: String,
        startDate: String,
        endDate: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('About', aboutSchema);