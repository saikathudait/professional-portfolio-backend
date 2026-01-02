import Analytics from '../models/Analytics.js';
import Project from '../models/Project.js';
import Blog from '../models/Blog.js';
import Skill from '../models/Skill.js';
import Contact from '../models/Contact.js';

// @desc    Get dashboard stats
// @route   GET /api/analytics/dashboard
// @access  Private/Admin
export const getDashboardStats = async (req, res) => {
  try {
    // Get counts
    const projectCount = await Project.countDocuments();
    const blogCount = await Blog.countDocuments();
    const skillCount = await Skill.countDocuments();
    const contactCount = await Contact.countDocuments({ read: false });

    // Get total page views
    const analytics = await Analytics.find();
    const totalPageViews = analytics.reduce(
      (sum, record) => sum + record.pageViews,
      0
    );
    const totalUniqueVisitors = analytics.reduce(
      (sum, record) => sum + record.uniqueVisitors,
      0
    );

    // Get recent blogs
    const recentBlogs = await Blog.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title views createdAt');

    // Get recent contacts
    const recentContacts = await Contact.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name email message read createdAt');

    res.status(200).json({
      success: true,
      data: {
        stats: {
          projects: projectCount,
          blogs: blogCount,
          skills: skillCount,
          unreadMessages: contactCount,
          totalPageViews,
          totalUniqueVisitors,
        },
        recentBlogs,
        recentContacts,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Track page view
// @route   POST /api/analytics/pageview
// @access  Public
export const trackPageView = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let analytics = await Analytics.findOne({ date: today });

    if (!analytics) {
      analytics = await Analytics.create({
        date: today,
        pageViews: 1,
        uniqueVisitors: 1,
      });
    } else {
      analytics.pageViews += 1;
      await analytics.save();
    }

    res.status(200).json({
      success: true,
      message: 'Page view tracked',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};