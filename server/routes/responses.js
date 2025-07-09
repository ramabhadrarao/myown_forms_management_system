import express from 'express';
import Response from '../models/Response.js';
import Form from '../models/Form.js';
import { authenticate, requireApproval, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Submit form response
router.post('/', optionalAuth, async (req, res) => {
  try {
    const { formId, answers, respondentEmail, completionTime } = req.body;

    // Get form
    const form = await Form.findById(formId);
    if (!form) {
      return res.status(404).json({ message: 'Form not found' });
    }

    if (!form.isActive) {
      return res.status(400).json({ message: 'Form is no longer active' });
    }

    // Check if user is required to sign in
    if (form.requireSignIn && !req.user) {
      return res.status(401).json({ message: 'Sign in required' });
    }

    // Check for duplicate responses if not allowed
    if (!form.allowMultipleResponses && req.user) {
      const existingResponse = await Response.findOne({
        formId,
        respondentId: req.user._id
      });
      
      if (existingResponse) {
        return res.status(400).json({ message: 'You have already responded to this form' });
      }
    }

    // Create response
    const response = new Response({
      formId,
      answers,
      respondentEmail: respondentEmail || req.user?.email,
      respondentId: req.user?._id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      completionTime
    });

    await response.save();

    // Update form response count
    await Form.findByIdAndUpdate(formId, {
      $inc: { responseCount: 1 }
    });

    res.status(201).json({ 
      message: 'Response submitted successfully',
      responseId: response._id 
    });
  } catch (error) {
    console.error('Submit response error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get responses for a form (form owner only)
router.get('/form/:formId', authenticate, requireApproval, async (req, res) => {
  try {
    const { formId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Check if user owns the form
    const form = await Form.findOne({ 
      _id: formId, 
      createdBy: req.user._id 
    });

    if (!form) {
      return res.status(404).json({ message: 'Form not found' });
    }

    const responses = await Response.find({ formId })
      .populate('respondentId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Response.countDocuments({ formId });

    res.json({
      responses,
      total,
      page,
      pages: Math.ceil(total / limit),
      form: {
        title: form.title,
        description: form.description,
        questions: form.questions
      }
    });
  } catch (error) {
    console.error('Get responses error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get analytics for a form
router.get('/analytics/:formId', authenticate, requireApproval, async (req, res) => {
  try {
    const { formId } = req.params;

    // Check if user owns the form
    const form = await Form.findOne({ 
      _id: formId, 
      createdBy: req.user._id 
    });

    if (!form) {
      return res.status(404).json({ message: 'Form not found' });
    }

    const responses = await Response.find({ formId });
    
    // Basic analytics
    const totalResponses = responses.length;
    const averageCompletionTime = responses.reduce((sum, r) => sum + (r.completionTime || 0), 0) / totalResponses;
    
    // Response distribution by day
    const responsesByDay = responses.reduce((acc, response) => {
      const day = response.createdAt.toISOString().split('T')[0];
      acc[day] = (acc[day] || 0) + 1;
      return acc;
    }, {});

    // Question analytics
    const questionAnalytics = form.questions.map(question => {
      const questionResponses = responses.map(r => 
        r.answers.find(a => a.questionId === question.id)
      ).filter(Boolean);

      const analytics = {
        questionId: question.id,
        question: question.question,
        type: question.type,
        totalResponses: questionResponses.length,
        responses: questionResponses.map(r => r.answer)
      };

      // Add specific analytics based on question type
      if (['radio', 'select'].includes(question.type)) {
        analytics.distribution = questionResponses.reduce((acc, response) => {
          acc[response.answer] = (acc[response.answer] || 0) + 1;
          return acc;
        }, {});
      }

      return analytics;
    });

    res.json({
      totalResponses,
      averageCompletionTime,
      responsesByDay,
      questionAnalytics
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete response
router.delete('/:id', authenticate, requireApproval, async (req, res) => {
  try {
    const response = await Response.findById(req.params.id);
    if (!response) {
      return res.status(404).json({ message: 'Response not found' });
    }

    // Check if user owns the form
    const form = await Form.findOne({ 
      _id: response.formId, 
      createdBy: req.user._id 
    });

    if (!form) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await Response.findByIdAndDelete(req.params.id);

    // Update form response count
    await Form.findByIdAndUpdate(response.formId, {
      $inc: { responseCount: -1 }
    });

    res.json({ message: 'Response deleted successfully' });
  } catch (error) {
    console.error('Delete response error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;