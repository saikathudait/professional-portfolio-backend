import Home from '../models/Home.js';
import About from '../models/About.js';
import Project from '../models/Project.js';
import Skill from '../models/Skill.js';
import Experience from '../models/Experience.js';
import Education from '../models/Education.js';
import Blog from '../models/Blog.js';
import Book from '../models/Book.js';
import { getActiveGroqApiKey } from '../utils/apiKeyVault.js';

const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_GROQ_MODEL = 'llama-3.1-8b-instant';
const MAX_USER_MESSAGE_LENGTH = 900;
const MAX_HISTORY_ITEMS = 8;
const CONTEXT_CACHE_MS = 60 * 1000;
let portfolioContextCache = {
  expiresAt: 0,
  value: '',
};

const normalizeText = (value) => (typeof value === 'string' ? value : '');

const stripHtml = (value = '') =>
  normalizeText(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const truncate = (value = '', limit = 500) => {
  const cleanValue = stripHtml(value);
  if (cleanValue.length <= limit) return cleanValue;
  return `${cleanValue.slice(0, limit).trim()}...`;
};

const listItems = (items = [], formatter) =>
  items.length
    ? items.map((item, index) => `${index + 1}. ${formatter(item)}`).join('\n')
    : 'No public data added yet.';

const normalizeHistory = (history = []) => {
  if (!Array.isArray(history)) return [];

  return history
    .filter((item) => ['user', 'assistant'].includes(item?.role))
    .slice(-MAX_HISTORY_ITEMS)
    .map((item) => ({
      role: item.role,
      content: truncate(item.content, 700),
    }))
    .filter((item) => item.content);
};

const buildPortfolioContext = async () => {
  if (
    portfolioContextCache.value &&
    portfolioContextCache.expiresAt > Date.now()
  ) {
    return portfolioContextCache.value;
  }

  const [
    home,
    about,
    projects,
    skills,
    experiences,
    education,
    blogs,
    books,
  ] = await Promise.all([
    Home.findOne().lean(),
    About.findOne().lean(),
    Project.find().sort({ featured: -1, order: 1, createdAt: -1 }).limit(8).lean(),
    Skill.find().sort({ category: 1, order: 1, level: -1 }).limit(20).lean(),
    Experience.find().sort({ order: 1, createdAt: -1 }).limit(6).lean(),
    Education.find().sort({ order: 1, createdAt: -1 }).limit(6).lean(),
    Blog.find({ published: true })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title excerpt category tags slug')
      .lean(),
    Book.find().sort({ order: 1, createdAt: -1 }).limit(5).lean(),
  ]);

  const ownerName = process.env.PORTFOLIO_OWNER_NAME || 'Saikat Hudait';
  const ownerEmail =
    process.env.PORTFOLIO_OWNER_EMAIL || 'saikathudait2001@gmail.com';
  const ownerLocation = process.env.PORTFOLIO_OWNER_LOCATION || 'Kolkata, India';
  const ownerRole =
    home?.heroSubtitle ||
    'Data Analyst | Data Visualization | AI/ML Specialist';

  const context = `
Portfolio owner:
- Name: ${ownerName}
- Role: ${ownerRole}
- Email: ${ownerEmail}
- Location: ${ownerLocation}
- Resume page: /resume
- Projects page: /projects
- Contact page: /contact

Home:
- Title: ${home?.heroTitle || ownerName}
- Summary: ${truncate(home?.heroDescription || about?.bio, 650)}
- CTA: ${home?.ctaText || 'View My Work'} ${home?.ctaLink || '/projects'}

About:
- Bio: ${truncate(about?.bio, 800)}
- Mission: ${truncate(about?.missionStatement, 500)}
- Certifications: ${listItems(about?.certifications || [], (cert) =>
    `${cert.name || 'Certification'}${cert.issuer ? ` by ${cert.issuer}` : ''}${
      cert.date ? ` (${cert.date})` : ''
    }`
  )}

Projects:
${listItems(projects, (project) =>
  `${project.title} - ${truncate(project.description, 220)} Tools: ${
    project.technologies?.join(', ') || 'Not listed'
  }. Category: ${project.category || 'Not listed'}${
    project.githubLink ? `. GitHub: ${project.githubLink}` : ''
  }${project.liveLink ? `. Live: ${project.liveLink}` : ''}`
)}

Skills:
${listItems(skills, (skill) =>
  `${skill.name} (${skill.category || 'Other'}${
    Number.isFinite(skill.level) ? `, level ${skill.level}/100` : ''
  })`
)}

Experience:
${listItems(experiences, (experience) =>
  `${experience.position} at ${experience.company}, ${experience.location || 'location not listed'} (${experience.startDate} - ${
    experience.endDate || 'Present'
  }). Responsibilities: ${truncate(
    (experience.responsibilities || []).join('; '),
    280
  )}`
)}

Education:
${listItems(education, (item) =>
  `${item.degree} at ${item.institution}, ${item.location || 'location not listed'} (${item.startDate} - ${
    item.endDate || 'Present'
  })${item.grade ? `. Grade: ${item.grade}` : ''}`
)}

Recent blog posts:
${listItems(blogs, (blog) =>
  `${blog.title} (${blog.category || 'General'}) - ${truncate(blog.excerpt, 200)}`
)}

Books:
${listItems(books, (book) =>
  `${book.title}${book.author ? ` by ${book.author}` : ''} - ${truncate(
    book.description,
    180
  )}`
)}
`.trim();

  portfolioContextCache = {
    value: context,
    expiresAt: Date.now() + CONTEXT_CACHE_MS,
  };

  return context;
};

const buildSystemPrompt = (portfolioContext) => `
You are the AI assistant for Saikat Hudait's professional portfolio website.
Use only the portfolio context below and normal conversational guidance.
Do not invent achievements, links, employers, degrees, certifications, or metrics.
If the answer is not available in the portfolio context, say that it is not listed on the website yet and suggest using the contact page or email.
Keep answers clear, friendly, professional, and concise. Prefer 2-5 short sentences.
When relevant, guide visitors to pages such as /projects, /resume, /skills, /blog, or /contact.

Portfolio context:
${portfolioContext}
`.trim();

// @desc    Send a public chatbot message to Groq
// @route   POST /api/chatbot/message
// @access  Public
export const sendChatMessage = async (req, res) => {
  try {
    const { message, history, page } = req.body;
    const cleanMessage = truncate(message, MAX_USER_MESSAGE_LENGTH);

    if (!cleanMessage) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a message.',
      });
    }

    const groqApiKey = await getActiveGroqApiKey();

    if (!groqApiKey) {
      return res.status(503).json({
        success: false,
        message:
          'Chatbot is not configured yet. Please add a Groq API key in the admin panel.',
      });
    }

    const portfolioContext = await buildPortfolioContext();
    const messages = [
      {
        role: 'system',
        content: buildSystemPrompt(portfolioContext),
      },
      ...normalizeHistory(history),
      {
        role: 'user',
        content: `Current page: ${truncate(page || '/', 120)}\nQuestion: ${cleanMessage}`,
      },
    ];

    const groqResponse = await fetch(GROQ_CHAT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL,
        messages,
        temperature: 0.35,
        max_completion_tokens: 450,
      }),
    });

    const groqData = await groqResponse.json().catch(() => ({}));

    if (!groqResponse.ok) {
      console.error('Groq chatbot request failed:', {
        status: groqResponse.status,
        message: groqData?.error?.message || groqResponse.statusText,
      });

      return res.status(502).json({
        success: false,
        message:
          'The AI assistant is unavailable right now. Please try again soon.',
      });
    }

    const reply = groqData?.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      return res.status(502).json({
        success: false,
        message: 'The AI assistant returned an empty response.',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        reply,
        model: groqData.model,
      },
    });
  } catch (error) {
    console.error(`Chatbot error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to process chatbot message.',
    });
  }
};
