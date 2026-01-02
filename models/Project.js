import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    longDescription: {
      type: String,
      default: '',
    },
    images: [
      {
        type: String,
      },
    ],
    technologies: [
      {
        type: String,
      },
    ],
    githubLink: {
      type: String,
      default: '',
    },
    liveLink: {
      type: String,
      default: '',
    },
    featured: {
      type: Boolean,
      default: false,
    },
    category: {
      type: String,
      default: 'Web Development',
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

export default mongoose.model('Project', projectSchema);