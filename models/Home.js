import mongoose from 'mongoose';

const homeSchema = new mongoose.Schema(
  {
    heroTitle: {
      type: String,
      required: true,
      default: "Hi, I'm Saikat",
    },
    heroSubtitle: {
      type: String,
      required: true,
      default: 'Data Analyst & Machine Learning Engineer',
    },
    heroDescription: {
      type: String,
      required: true,
      default:
        'I build intelligent systems, dashboards, and predictive models. Explore my work.',
    },
    heroImage: {
      type: String,
      default: '',
    },
    heroVideo: {
      type: String,
      default: '',
    },
    cvLink: {
      type: String,
      default: '',
    },
    ctaText: {
      type: String,
      default: 'View My Work',
    },
    ctaLink: {
      type: String,
      default: '/projects',
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Home', homeSchema);