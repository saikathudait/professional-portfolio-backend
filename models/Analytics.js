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
    visitorIds: [
      {
        type: String,
      },
    ],
    pageStats: [
      {
        path: {
          type: String,
          required: true,
          trim: true,
        },
        pageViews: {
          type: Number,
          default: 0,
        },
        uniqueVisitors: {
          type: Number,
          default: 0,
        },
        visitorIds: [
          {
            type: String,
          },
        ],
        lastViewedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
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
