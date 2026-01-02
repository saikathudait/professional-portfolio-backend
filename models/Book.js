import mongoose from 'mongoose';

const bookSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    author: {
      type: String,
      default: '',
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    platform: {
      type: String,
      enum: ['Amazon', 'Flipkart', 'Other'],
      default: 'Other',
    },
    link: {
      type: String,
      required: true,
      trim: true,
    },
    coverImage: {
      type: String,
      default: '',
      trim: true,
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

export default mongoose.model('Book', bookSchema);
