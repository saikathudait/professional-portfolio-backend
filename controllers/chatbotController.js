import Home from '../models/Home.js';
import About from '../models/About.js';
import Project from '../models/Project.js';
import Skill from '../models/Skill.js';
import Experience from '../models/Experience.js';
import Education from '../models/Education.js';
import Blog from '../models/Blog.js';
import Book from '../models/Book.js';
import CoverLetter from '../models/CoverLetter.js';
import {
  getActiveGroqApiKey,
  getConfiguredGroqModel,
} from '../utils/apiKeyVault.js';
import {
  GROQ_CHAT_URL,
  parseGroqError,
  resolveGroqChatModel,
} from '../utils/groqApi.js';

const MAX_USER_MESSAGE_LENGTH = 900;
const MAX_HISTORY_ITEMS = 8;
const CONTEXT_CACHE_MS = 60 * 1000;
const PUBLIC_SOCIAL_LINKS = [
  'GitHub: https://github.com/saikathudait',
  'LinkedIn: https://www.linkedin.com/in/saikat-hudait/',
  'Email: mailto:saikathudait2001@gmail.com',
];
const PUBLIC_CONTACT_DETAILS = [
  'Email: saikathudait2001@gmail.com',
  'Phone: +91 7479309346',
  'Location: Kolkata, India',
  'Contact page: /contact',
];
let portfolioContextCache = {
  expiresAt: 0,
  value: '',
  data: null,
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

const formatFileSize = (bytes = 0) => {
  if (!bytes) return 'Not recorded';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(2)} MB`;
  return `${Math.max(bytes / 1024, 1).toFixed(0)} KB`;
};

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

const buildPortfolioSnapshot = async () => {
  if (
    portfolioContextCache.data &&
    portfolioContextCache.expiresAt > Date.now()
  ) {
    return portfolioContextCache.data;
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
    coverLetter,
  ] = await Promise.all([
    Home.findOne()
      .select(
        'heroTitle heroSubtitle heroDescription heroImage heroVideo cvLink cvFileName cvFileSize cvMimeType cvUploadedAt cvPageCount cvStorage ctaText ctaLink updatedAt'
      )
      .lean(),
    About.findOne()
      .select('bio missionStatement profileImage certifications volunteering updatedAt')
      .lean(),
    Project.find()
      .sort({ featured: -1, order: 1, createdAt: -1 })
      .select(
        'title description longDescription images technologies githubLink liveLink featured category order updatedAt'
      )
      .lean(),
    Skill.find()
      .sort({ category: 1, order: 1, level: -1 })
      .select('name level category icon order updatedAt')
      .lean(),
    Experience.find()
      .sort({ order: 1, createdAt: -1 })
      .select(
        'company position location startDate endDate responsibilities technologies companyLogo order updatedAt'
      )
      .lean(),
    Education.find()
      .sort({ order: 1, createdAt: -1 })
      .select(
        'degree institution location startDate endDate grade description order updatedAt'
      )
      .lean(),
    Blog.find({ published: true })
      .sort({ createdAt: -1 })
      .select('title slug excerpt content featuredImage category tags views updatedAt')
      .lean(),
    Book.find()
      .sort({ order: 1, createdAt: -1 })
      .select('title author description platform link coverImage order updatedAt')
      .lean(),
    CoverLetter.findOne()
      .sort({ updatedAt: -1 })
      .select('title content updatedAt')
      .lean(),
  ]);

  const snapshot = {
    home,
    about,
    projects,
    skills,
    experiences,
    education,
    blogs,
    books,
    coverLetter,
    ownerName: process.env.PORTFOLIO_OWNER_NAME || 'Saikat Hudait',
    ownerEmail:
      process.env.PORTFOLIO_OWNER_EMAIL || 'saikathudait2001@gmail.com',
    ownerLocation: process.env.PORTFOLIO_OWNER_LOCATION || 'Kolkata, India',
  };

  portfolioContextCache = {
    ...portfolioContextCache,
    data: snapshot,
    expiresAt: Date.now() + CONTEXT_CACHE_MS,
  };

  return snapshot;
};

const buildPortfolioContext = async () => {
  if (
    portfolioContextCache.value &&
    portfolioContextCache.expiresAt > Date.now()
  ) {
    return portfolioContextCache.value;
  }

  const {
    home,
    about,
    projects,
    skills,
    experiences,
    education,
    blogs,
    books,
    coverLetter,
    ownerName,
    ownerEmail,
    ownerLocation,
  } = await buildPortfolioSnapshot();

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
- Public pages available to answer from: /, /about, /education, /experience, /skills, /projects, /books, /blog, /contact, /resume

Allowed data policy:
- Use only public portfolio content listed in this context.
- Do not access or reveal admin users, passwords, JWTs, API keys, encrypted keys, private contact submissions/messages, analytics visitor IDs, raw resume binary data, database internals, or any backend secrets.
- If a visitor asks for private/sensitive data, refuse briefly and offer public contact or portfolio information instead.

Home:
- Title: ${home?.heroTitle || ownerName}
- Subtitle: ${home?.heroSubtitle || ownerRole}
- Summary: ${truncate(home?.heroDescription || about?.bio, 650)}
- Hero image: ${home?.heroImage || 'Not listed'}
- Hero video: ${home?.heroVideo || 'Not listed'}
- CTA: ${home?.ctaText || 'View My Work'} ${home?.ctaLink || '/projects'}

About:
- Bio: ${truncate(about?.bio, 800)}
- Mission: ${truncate(about?.missionStatement, 500)}
- Profile image: ${about?.profileImage || 'Not listed'}
- Certifications: ${listItems(about?.certifications || [], (cert) =>
    `${cert.name || 'Certification'}${cert.issuer ? ` by ${cert.issuer}` : ''}${
      cert.date ? ` (${cert.date})` : ''
    }${cert.credentialUrl ? `. Credential: ${cert.credentialUrl}` : ''}`
  )}
- Volunteering: ${listItems(about?.volunteering || [], (item) =>
    `${item.role || 'Role'} at ${item.organization || 'Organization'}${
      item.startDate || item.endDate ? ` (${item.startDate || ''} - ${item.endDate || 'Present'})` : ''
    }. ${truncate(item.description, 220)}`
  )}

Projects:
${listItems(projects, (project) =>
  `${project.title} - ${truncate(project.description, 260)} Long details: ${truncate(
    project.longDescription,
    500
  )} Tools: ${
    project.technologies?.join(', ') || 'Not listed'
  }. Category: ${project.category || 'Not listed'}${
    project.githubLink ? `. GitHub: ${project.githubLink}` : ''
  }${project.liveLink ? `. Live: ${project.liveLink}` : ''}${
    project.images?.length ? `. Images: ${project.images.join(', ')}` : ''
  }`
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
    700
  )}. Technologies: ${experience.technologies?.join(', ') || 'Not listed'}${
    experience.companyLogo ? `. Company logo: ${experience.companyLogo}` : ''
  }`
)}

Education:
${listItems(education, (item) =>
  `${item.degree} at ${item.institution}, ${item.location || 'location not listed'} (${item.startDate} - ${
    item.endDate || 'Present'
  })${item.grade ? `. Grade: ${item.grade}` : ''}. ${truncate(item.description, 500)}`
)}

Blog:
${listItems(blogs, (blog) =>
  `${blog.title} (${blog.category || 'General'}) - Excerpt: ${truncate(
    blog.excerpt,
    260
  )}. Content: ${truncate(blog.content, 1400)} Tags: ${
    blog.tags?.join(', ') || 'Not listed'
  }. Public path: /blog/${blog.slug}`
)}

Books:
${listItems(books, (book) =>
  `${book.title}${book.author ? ` by ${book.author}` : ''} - ${truncate(
    book.description,
    420
  )}. Platform: ${book.platform || 'Not listed'}${
    book.link ? `. Link: ${book.link}` : ''
  }${book.coverImage ? `. Cover image: ${book.coverImage}` : ''}`
)}

Contact and social:
${PUBLIC_CONTACT_DETAILS.join('\n')}
${PUBLIC_SOCIAL_LINKS.join('\n')}

Resume:
- Public resume page: /resume
- Resume file name: ${home?.cvFileName || 'Not uploaded'}
- Resume file size: ${formatFileSize(home?.cvFileSize)}
- Resume MIME type: ${home?.cvMimeType || 'Not recorded'}
- Resume uploaded at: ${home?.cvUploadedAt || 'Not recorded'}
- Resume page count: ${home?.cvPageCount || 'Not recorded'}
- Resume storage: ${home?.cvStorage || 'Not recorded'}
- Public resume route: ${home?.cvLink || '/api/home/cv/file'}

Cover letter:
- Title: ${coverLetter?.title || 'Not published yet'}
- Last updated: ${coverLetter?.updatedAt || 'Not recorded'}
- Content: ${truncate(coverLetter?.content, 4000)}
`.trim();

  portfolioContextCache = {
    ...portfolioContextCache,
    value: context,
    expiresAt: Date.now() + CONTEXT_CACHE_MS,
  };

  return context;
};

const buildSystemPrompt = (portfolioContext) => `
You are the AI assistant for Saikat Hudait's professional portfolio website.
Use only the portfolio context below and normal conversational guidance.
Do not invent achievements, links, employers, degrees, certifications, or metrics.
Never reveal or request sensitive data such as API keys, passwords, tokens, admin data, private contact messages, analytics visitor IDs, database records, or raw stored files.
If the answer is not available in the portfolio context, say that it is not listed on the website yet and suggest using the contact page or email.
Keep answers clear, friendly, professional, and concise. Prefer 2-5 short sentences.
When relevant, guide visitors to pages such as /projects, /resume, /skills, /blog, or /contact.

Portfolio context:
${portfolioContext}
`.trim();

const getLocalPortfolioAnswer = (message = '', snapshot = {}) => {
  const cleanMessage = message.toLowerCase();
  const { home, projects = [], skills = [], coverLetter } = snapshot;
  const resumeName = home?.cvFileName || 'the uploaded resume PDF';
  const resumeSize = formatFileSize(home?.cvFileSize);
  const resumePages = home?.cvPageCount
    ? `${home.cvPageCount} ${home.cvPageCount === 1 ? 'page' : 'pages'}`
    : 'page count not recorded';

  if (
    /\b(contact|email|mail|phone|call|connect|reach|social|linkedin|github)\b/.test(
      cleanMessage
    )
  ) {
    return [
      'You can contact Saikat Hudait through the public contact page: /contact.',
      'Email: saikathudait2001@gmail.com',
      'Phone: +91 7479309346',
      'GitHub: https://github.com/saikathudait',
      'LinkedIn: https://www.linkedin.com/in/saikat-hudait/',
    ].join('\n');
  }

  if (/\b(resume|cv|download|pdf)\b/.test(cleanMessage)) {
    return [
      `Saikat's resume is available on /resume.`,
      `Current file: ${resumeName}.`,
      `File size: ${resumeSize}.`,
      `Pages: ${resumePages}.`,
      'Use the Resume page to view or download the latest PDF.',
    ].join('\n');
  }

  if (/\b(cover letter|coverletter)\b/.test(cleanMessage)) {
    if (!coverLetter?.content) {
      return 'The cover letter is not published yet. Please check /resume later or contact Saikat directly.';
    }

    return `Saikat's cover letter is available on /resume under "${coverLetter.title || 'Cover Letter'}". Latest update: ${
      coverLetter.updatedAt || 'not recorded'
    }.`;
  }

  if (/\b(skill|skills|technology|technologies|tools|stack)\b/.test(cleanMessage)) {
    const topSkills = skills
      .slice(0, 10)
      .map((skill) => skill.name)
      .filter(Boolean);

    if (!topSkills.length) {
      return 'Saikat has not added public skill data yet. Please check /skills later.';
    }

    return `Saikat's public skills include ${topSkills.join(', ')}. You can explore the full skills page at /skills.`;
  }

  if (/\b(project|projects|work|case stud|portfolio)\b/.test(cleanMessage)) {
    const topProjects = projects
      .slice(0, 5)
      .map((project) => project.title)
      .filter(Boolean);

    if (!topProjects.length) {
      return 'Saikat has not added public project data yet. Please check /projects later.';
    }

    return `Some public projects are ${topProjects.join(', ')}. Visit /projects for details, tools, GitHub links, and live links where available.`;
  }

  return '';
};

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

    const snapshot = await buildPortfolioSnapshot();
    const localAnswer = getLocalPortfolioAnswer(cleanMessage, snapshot);

    if (localAnswer) {
      return res.status(200).json({
        success: true,
        data: {
          reply: localAnswer,
          model: 'local-portfolio',
        },
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
    const configuredModel = await getConfiguredGroqModel();
    const model = await resolveGroqChatModel(groqApiKey, configuredModel);
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
        model,
        messages,
        temperature: 0.35,
        max_completion_tokens: 450,
      }),
    });

    const groqData = await groqResponse.json().catch(() => ({}));

    if (!groqResponse.ok) {
      const parsedError = parseGroqError(groqResponse.status, groqData);

      console.error('Groq chatbot request failed:', {
        status: groqResponse.status,
        code: parsedError.code,
        message: parsedError.logMessage || groqResponse.statusText,
      });

      return res.status(502).json({
        success: false,
        message: parsedError.publicMessage,
        code: parsedError.code,
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
