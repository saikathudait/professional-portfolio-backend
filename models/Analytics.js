import mongoose from 'mongoose';

const analyticsSchema = new mongoose.Schema(
  {
    pageViews: {
      type: Number,
      default: 0,
    },
    uniqueVisitors: {
      type: Number,
      default: 0,
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Analytics', analyticsSchema);