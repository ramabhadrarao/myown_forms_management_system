import express from 'express';
import Quiz from '../models/Quiz.js';
import QuizResponse from '../models/QuizResponse.js';
import { authenticate, requireApproval, optionalAuth } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Get all public quizzes
router.get('/public', optionalAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const quizzes = await Quiz.find({ 
      isPublic: true, 
      isActive: true,
      secretCode: { $exists: false }
    })
      .select('title description createdBy responseCount totalPoints settings.timeLimit createdAt')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Quiz.countDocuments({ 
      isPublic: true, 
      isActive: true,
      secretCode: { $exists: false }
    });

    res.json({
      quizzes,
      total,
      page,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Get public quizzes error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's quizzes
router.get('/my-quizzes', authenticate, requireApproval, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const quizzes = await Quiz.find({ createdBy: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Quiz.countDocuments({ createdBy: req.user._id });

    res.json({
      quizzes,
      total,
      page,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Get my quizzes error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create quiz
router.post('/', authenticate, requireApproval, async (req, res) => {
  try {
    const { title, description, questions, isPublic, secretCode, settings } = req.body;

    // Generate unique IDs for questions
    const formattedQuestions = questions.map(q => ({
      ...q,
      id: q.id || uuidv4()
    }));

    const quiz = new Quiz({
      title,
      description,
      questions: formattedQuestions,
      createdBy: req.user._id,
      isPublic: isPublic !== false,
      secretCode: secretCode || undefined,
      settings: settings || {}
    });

    await quiz.save();
    await quiz.populate('createdBy', 'name email');

    res.status(201).json(quiz);
  } catch (error) {
    console.error('Create quiz error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get quiz by ID or secret code
router.get('/:identifier', optionalAuth, async (req, res) => {
  try {
    const { identifier } = req.params;
    const { code } = req.query;

    let quiz;

    // Try to find by MongoDB ObjectId first
    if (identifier.match(/^[0-9a-fA-F]{24}$/)) {
      quiz = await Quiz.findById(identifier)
        .populate('createdBy', 'name email');
    }

    // If not found by ID, try to find by secret code
    if (!quiz && code) {
      quiz = await Quiz.findOne({ secretCode: code })
        .populate('createdBy', 'name email');
    }

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    if (!quiz.isActive) {
      return res.status(400).json({ message: 'Quiz is no longer active' });
    }

    // Check access permissions
    if (quiz.secretCode && quiz.secretCode !== code) {
      return res.status(403).json({ message: 'Secret code required' });
    }

    // Remove correct answers from questions if not the owner
    if (!req.user || quiz.createdBy._id.toString() !== req.user._id.toString()) {
      quiz.questions = quiz.questions.map(question => {
        const { correctAnswer, ...questionWithoutAnswer } = question.toObject();
        // Also remove isCorrect from options
        if (questionWithoutAnswer.options) {
          questionWithoutAnswer.options = questionWithoutAnswer.options.map(option => {
            const { isCorrect, ...optionWithoutCorrect } = option;
            return optionWithoutCorrect;
          });
        }
        return questionWithoutAnswer;
      });
    }

    res.json(quiz);
  } catch (error) {
    console.error('Get quiz error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Submit quiz response
router.post('/:id/submit', optionalAuth, async (req, res) => {
  try {
    const { answers, completionTime, respondentEmail } = req.body;
    const quizId = req.params.id;

    // Get the full quiz with correct answers
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    if (!quiz.isActive) {
      return res.status(400).json({ message: 'Quiz is no longer active' });
    }

    // Check for duplicate responses if not allowed
    if (!quiz.settings.allowRetake && req.user) {
      const existingResponse = await QuizResponse.findOne({
        quizId,
        respondentId: req.user._id
      });
      
      if (existingResponse) {
        return res.status(400).json({ message: 'You have already taken this quiz' });
      }
    }

    // Grade the quiz
    const gradedAnswers = answers.map(userAnswer => {
      const question = quiz.questions.find(q => q.id === userAnswer.questionId);
      if (!question) return userAnswer;

      let isCorrect = false;
      let pointsEarned = 0;

      switch (question.type) {
        case 'multiple-choice':
          isCorrect = userAnswer.answer === question.correctAnswer;
          break;
        case 'true-false':
          isCorrect = userAnswer.answer === question.correctAnswer;
          break;
        case 'fill-blank':
          // Case-insensitive comparison for fill-in-the-blank
          const userAnswerLower = userAnswer.answer.toLowerCase().trim();
          const correctAnswerLower = question.correctAnswer.toLowerCase().trim();
          isCorrect = userAnswerLower === correctAnswerLower;
          break;
        case 'essay':
          // Essays need manual grading
          isCorrect = false;
          break;
      }

      if (isCorrect) {
        pointsEarned = question.points || 1;
      }

      return {
        ...userAnswer,
        isCorrect,
        pointsEarned
      };
    });

    // Create response
    const response = new QuizResponse({
      quizId,
      answers: gradedAnswers,
      respondentEmail: respondentEmail || req.user?.email,
      respondentId: req.user?._id,
      totalPoints: quiz.totalPoints,
      completionTime,
      submittedAt: new Date(),
      isComplete: true,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Check if passed
    response.passed = response.percentage >= (quiz.settings.passingScore || 60);

    await response.save();

    // Update quiz response count
    await Quiz.findByIdAndUpdate(quizId, {
      $inc: { responseCount: 1 }
    });

    // Prepare response based on quiz settings
    let responseData = {
      responseId: response._id,
      message: 'Quiz submitted successfully'
    };

    if (quiz.settings.showResults === 'immediately' || quiz.settings.showResults === 'after_submit') {
      responseData.results = {
        score: response.score,
        totalPoints: response.totalPoints,
        percentage: response.percentage,
        passed: response.passed,
        completionTime: response.completionTime
      };

      if (quiz.settings.showCorrectAnswers || quiz.settings.showExplanations) {
        responseData.detailedResults = gradedAnswers.map(answer => {
          const question = quiz.questions.find(q => q.id === answer.questionId);
          const result = {
            questionId: answer.questionId,
            userAnswer: answer.answer,
            isCorrect: answer.isCorrect,
            pointsEarned: answer.pointsEarned
          };

          if (quiz.settings.showCorrectAnswers) {
            result.correctAnswer = question.correctAnswer;
          }

          if (quiz.settings.showExplanations && question.explanation) {
            result.explanation = question.explanation;
            result.explanationLatex = question.explanationLatex;
          }

          return result;
        });
      }
    }

    res.status(201).json(responseData);
  } catch (error) {
    console.error('Submit quiz response error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get quiz responses (owner only)
router.get('/:id/responses', authenticate, requireApproval, async (req, res) => {
  try {
    const quizId = req.params.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Check if user owns the quiz
    const quiz = await Quiz.findOne({ 
      _id: quizId, 
      createdBy: req.user._id 
    });

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    const responses = await QuizResponse.find({ quizId })
      .populate('respondentId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await QuizResponse.countDocuments({ quizId });

    res.json({
      responses,
      total,
      page,
      pages: Math.ceil(total / limit),
      quiz: {
        title: quiz.title,
        description: quiz.description,
        questions: quiz.questions,
        totalPoints: quiz.totalPoints,
        settings: quiz.settings
      }
    });
  } catch (error) {
    console.error('Get quiz responses error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update quiz
router.put('/:id', authenticate, requireApproval, async (req, res) => {
  try {
    const quiz = await Quiz.findOne({ 
      _id: req.params.id, 
      createdBy: req.user._id 
    });

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    const { title, description, questions, isPublic, secretCode, settings, isActive } = req.body;

    // Update quiz fields
    if (title !== undefined) quiz.title = title;
    if (description !== undefined) quiz.description = description;
    if (questions !== undefined) {
      quiz.questions = questions.map(q => ({
        ...q,
        id: q.id || uuidv4()
      }));
    }
    if (isPublic !== undefined) quiz.isPublic = isPublic;
    if (secretCode !== undefined) quiz.secretCode = secretCode || undefined;
    if (settings !== undefined) quiz.settings = { ...quiz.settings, ...settings };
    if (isActive !== undefined) quiz.isActive = isActive;

    await quiz.save();
    await quiz.populate('createdBy', 'name email');

    res.json(quiz);
  } catch (error) {
    console.error('Update quiz error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete quiz
router.delete('/:id', authenticate, requireApproval, async (req, res) => {
  try {
    const quiz = await Quiz.findOne({ 
      _id: req.params.id, 
      createdBy: req.user._id 
    });

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    await Quiz.findByIdAndDelete(req.params.id);
    await QuizResponse.deleteMany({ quizId: req.params.id });

    res.json({ message: 'Quiz deleted successfully' });
  } catch (error) {
    console.error('Delete quiz error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;