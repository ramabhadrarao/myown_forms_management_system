import express from 'express';
import Form from '../models/Form.js';
import Response from '../models/Response.js';
import { authenticate, requireApproval, optionalAuth } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Get all public forms (for browsing)
router.get('/public', optionalAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const forms = await Form.find({ 
      isPublic: true, 
      isActive: true,
      secretCode: { $exists: false }
    })
      .select('title description createdBy responseCount createdAt')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Form.countDocuments({ 
      isPublic: true, 
      isActive: true,
      secretCode: { $exists: false }
    });

    res.json({
      forms,
      total,
      page,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Get public forms error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's forms
router.get('/my-forms', authenticate, requireApproval, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const forms = await Form.find({ createdBy: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Form.countDocuments({ createdBy: req.user._id });

    res.json({
      forms,
      total,
      page,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Get my forms error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create form
router.post('/', authenticate, requireApproval, async (req, res) => {
  try {
    const { title, description, questions, isPublic, secretCode, settings } = req.body;

    // Generate unique IDs for questions
    const formattedQuestions = questions.map(q => ({
      ...q,
      id: q.id || uuidv4()
    }));

    const form = new Form({
      title,
      description,
      questions: formattedQuestions,
      createdBy: req.user._id,
      isPublic: isPublic !== false,
      secretCode: secretCode || undefined,
      settings: settings || {}
    });

    await form.save();
    await form.populate('createdBy', 'name email');

    res.status(201).json(form);
  } catch (error) {
    console.error('Create form error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get form by ID or secret code
router.get('/:identifier', optionalAuth, async (req, res) => {
  try {
    const { identifier } = req.params;
    const { code } = req.query;

    let form;

    // Try to find by MongoDB ObjectId first
    if (identifier.match(/^[0-9a-fA-F]{24}$/)) {
      form = await Form.findById(identifier)
        .populate('createdBy', 'name email');
    }

    // If not found by ID, try to find by secret code
    if (!form && code) {
      form = await Form.findOne({ secretCode: code })
        .populate('createdBy', 'name email');
    }

    if (!form) {
      return res.status(404).json({ message: 'Form not found' });
    }

    if (!form.isActive) {
      return res.status(400).json({ message: 'Form is no longer active' });
    }

    // Check access permissions
    if (form.secretCode && form.secretCode !== code) {
      return res.status(403).json({ message: 'Secret code required' });
    }

    if (form.requireSignIn && !req.user) {
      return res.status(401).json({ message: 'Sign in required' });
    }

    res.json(form);
  } catch (error) {
    console.error('Get form error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update form
router.put('/:id', authenticate, requireApproval, async (req, res) => {
  try {
    const form = await Form.findOne({ 
      _id: req.params.id, 
      createdBy: req.user._id 
    });

    if (!form) {
      return res.status(404).json({ message: 'Form not found' });
    }

    const { title, description, questions, isPublic, secretCode, settings, isActive } = req.body;

    // Update form fields
    if (title !== undefined) form.title = title;
    if (description !== undefined) form.description = description;
    if (questions !== undefined) {
      form.questions = questions.map(q => ({
        ...q,
        id: q.id || uuidv4()
      }));
    }
    if (isPublic !== undefined) form.isPublic = isPublic;
    if (secretCode !== undefined) form.secretCode = secretCode || undefined;
    if (settings !== undefined) form.settings = { ...form.settings, ...settings };
    if (isActive !== undefined) form.isActive = isActive;

    await form.save();
    await form.populate('createdBy', 'name email');

    res.json(form);
  } catch (error) {
    console.error('Update form error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete form
router.delete('/:id', authenticate, requireApproval, async (req, res) => {
  try {
    const form = await Form.findOne({ 
      _id: req.params.id, 
      createdBy: req.user._id 
    });

    if (!form) {
      return res.status(404).json({ message: 'Form not found' });
    }

    await Form.findByIdAndDelete(req.params.id);
    await Response.deleteMany({ formId: req.params.id });

    res.json({ message: 'Form deleted successfully' });
  } catch (error) {
    console.error('Delete form error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;