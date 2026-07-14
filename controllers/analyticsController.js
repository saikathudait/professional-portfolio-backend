import Analytics from '../models/Analytics.js';
import Project from '../models/Project.js';
import Blog from '../models/Blog.js';
import Skill from '../models/Skill.js';
import Contact from '../models/Contact.js';

const getVisitorKey = (req) => {
  const providedVisitorId =
    typeof req.body?.visitorId === 'string' ? req.body.visitorId.trim() : '';
  if (providedVisitorId) {
    return providedVisitorId.slice(0, 128);
  }

  const forwardedFor = req.headers['x-forwarded-for'];
  const ip = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : forwardedFor?.split(',')[0]?.trim() || req.ip || '';
  const userAgent = req.get('user-agent') || '';

  return [ip, userAgent].filter(Boolean).join('|').slice(0, 256);
};

const normalizePath = (value = '') => {
  const rawPath = typeof value === 'string' ? value.trim() : '';
  if (!rawPath) return '/';

  try {
    const parsed = new URL(rawPath);
    return `${parsed.pathname}${parsed.search}`.slice(0, 256) || '/';
  } catch {
    const normalized = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
    return normalized.slice(0, 256);
  }
};

const getDateRangeQuery = (query = {}) => {
  const range = {};

  if (query.startDate) {
    const start = new Date(query.startDate);
    if (!Number.isNaN(start.getTime())) {
      start.setUTCHours(0, 0, 0, 0);
      range.$gte = start;
    }
  }

  if (query.endDate) {
    const end = new Date(query.endDate);
    if (!Number.isNaN(end.getTime())) {
      end.setUTCHours(23, 59, 59, 999);
      range.$lte = end;
    }
  }

  return Object.keys(range).length > 0 ? { date: range } : {};
};

const formatDateKey = (date) => new Date(date).toISOString().slice(0, 10);

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

// @desc    Get date-filtered analysis stats
// @route   GET /api/analytics/analysis
// @access  Private/Admin
export const getAnalysisStats = async (req, res) => {
  try {
    const analytics = await Analytics.find(getDateRangeQuery(req.query))
      .sort({ date: 1 })
      .lean();
    const uniqueVisitorIds = new Set();
    const pageMap = new Map();

    const totalPageViews = analytics.reduce((sum, record) => {
      (record.visitorIds || []).forEach((visitorId) => {
        if (visitorId) uniqueVisitorIds.add(visitorId);
      });

      (record.pageStats || []).forEach((page) => {
        const path = normalizePath(page.path || '/');
        const pageData =
          pageMap.get(path) || {
            path,
            pageViews: 0,
            visitorIds: new Set(),
            lastViewedAt: null,
          };

        pageData.pageViews += page.pageViews || 0;
        (page.visitorIds || []).forEach((visitorId) => {
          if (visitorId) pageData.visitorIds.add(visitorId);
        });

        if (
          page.lastViewedAt &&
          (!pageData.lastViewedAt ||
            new Date(page.lastViewedAt) > new Date(pageData.lastViewedAt))
        ) {
          pageData.lastViewedAt = page.lastViewedAt;
        }

        pageMap.set(path, pageData);
      });

      return sum + (record.pageViews || 0);
    }, 0);

    const dailyViews = analytics.map((record) => ({
      date: formatDateKey(record.date),
      pageViews: record.pageViews || 0,
      uniqueVisitors: record.visitorIds?.length || record.uniqueVisitors || 0,
    }));

    const topPages = Array.from(pageMap.values())
      .map((page) => ({
        path: page.path,
        pageViews: page.pageViews,
        uniqueVisitors: page.visitorIds.size,
        lastViewedAt: page.lastViewedAt,
      }))
      .sort((a, b) => b.pageViews - a.pageViews)
      .slice(0, 5);

    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalPageViews,
          totalUniqueVisitors: uniqueVisitorIds.size,
          trackedDays: analytics.length,
        },
        dailyViews,
        topPages,
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
    today.setUTCHours(0, 0, 0, 0);
    const visitorKey = getVisitorKey(req);
    const path = normalizePath(req.body?.path || req.get('referer') || '/');

    let analytics = await Analytics.findOne({ date: today });

    if (!analytics) {
      analytics = await Analytics.create({
        date: today,
        pageViews: 0,
        uniqueVisitors: 0,
        visitorIds: [],
        pageStats: [],
      });
    }

    analytics.visitorIds = analytics.visitorIds || [];
    analytics.pageStats = analytics.pageStats || [];
    analytics.pageViews += 1;

    if (visitorKey && !analytics.visitorIds.includes(visitorKey)) {
      analytics.visitorIds.push(visitorKey);
      analytics.uniqueVisitors += 1;
    }

    let pageStat = analytics.pageStats.find((page) => page.path === path);
    if (!pageStat) {
      analytics.pageStats.push({
        path,
        pageViews: 0,
        uniqueVisitors: 0,
        visitorIds: [],
        lastViewedAt: new Date(),
      });
      pageStat = analytics.pageStats[analytics.pageStats.length - 1];
    }

    pageStat.pageViews += 1;
    pageStat.lastViewedAt = new Date();
    pageStat.visitorIds = pageStat.visitorIds || [];

    if (visitorKey && !pageStat.visitorIds.includes(visitorKey)) {
      pageStat.visitorIds.push(visitorKey);
      pageStat.uniqueVisitors += 1;
    }

    await analytics.save();

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
