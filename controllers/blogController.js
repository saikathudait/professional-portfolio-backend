import Blog from '../models/Blog.js';

// Generate slug from title
const generateSlug = (title) => {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .trim();
};

// @desc    Get all blogs
// @route   GET /api/blogs
// @access  Public
export const getBlogs = async (req, res) => {
  try {
    const { category, search, published } = req.query;
    let query = {};

    if (category) {
      query.category = category;
    }

    if (published !== undefined) {
      query.published = published === 'true';
    } else {
      // By default, only show published posts for public
      query.published = true;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { excerpt: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } },
      ];
    }

    const blogs = await Blog.find(query)
      .populate('author', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: blogs.length,
      data: blogs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get single blog by slug
// @route   GET /api/blogs/slug/:slug
// @access  Public
export const getBlogBySlug = async (req, res) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug }).populate(
      'author',
      'name email profileImage'
    );

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found',
      });
    }

    // Increment views
    blog.views += 1;
    await blog.save();

    res.status(200).json({
      success: true,
      data: blog,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get single blog by ID
// @route   GET /api/blogs/:id
// @access  Public
export const getBlogById = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id).populate(
      'author',
      'name email profileImage'
    );

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found',
      });
    }

    res.status(200).json({
      success: true,
      data: blog,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Create blog
// @route   POST /api/blogs
// @access  Private/Admin
export const createBlog = async (req, res) => {
  try {
    // Generate slug from title
    const slug = generateSlug(req.body.title);

    // Check if slug already exists
    const existingBlog = await Blog.findOne({ slug });
    if (existingBlog) {
      return res.status(400).json({
        success: false,
        message: 'Blog with this title already exists',
      });
    }

    const blog = await Blog.create({
      ...req.body,
      slug,
      author: req.user.id,
    });

    res.status(201).json({
      success: true,
      message: 'Blog created successfully',
      data: blog,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update blog
// @route   PUT /api/blogs/:id
// @access  Private/Admin
export const updateBlog = async (req, res) => {
  try {
    let blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found',
      });
    }

    // If title is being updated, regenerate slug
    if (req.body.title && req.body.title !== blog.title) {
      const newSlug = generateSlug(req.body.title);
      
      // Check if new slug already exists
      const existingBlog = await Blog.findOne({ 
        slug: newSlug, 
        _id: { $ne: req.params.id } 
      });
      
      if (existingBlog) {
        return res.status(400).json({
          success: false,
          message: 'Blog with this title already exists',
        });
      }
      
      req.body.slug = newSlug;
    }

    blog = await Blog.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: 'Blog updated successfully',
      data: blog,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Delete blog
// @route   DELETE /api/blogs/:id
// @access  Private/Admin
export const deleteBlog = async (req, res) => {
  try {
    const blog = await Blog.findByIdAndDelete(req.params.id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Blog deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get blog categories
// @route   GET /api/blogs/categories/all
// @access  Public
export const getBlogCategories = async (req, res) => {
  try {
    const categories = await Blog.distinct('category');

    res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get blog tags
// @route   GET /api/blogs/tags/all
// @access  Public
export const getBlogTags = async (req, res) => {
  try {
    const blogs = await Blog.find({ published: true });
    const allTags = blogs.reduce((tags, blog) => {
      return tags.concat(blog.tags);
    }, []);
    const uniqueTags = [...new Set(allTags)];

    res.status(200).json({
      success: true,
      data: uniqueTags,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};