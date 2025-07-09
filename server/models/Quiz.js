import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['multiple-choice', 'true-false', 'fill-blank', 'essay']
  },
  question: {
    type: String,
    required: true
  },
  questionLatex: {
    type: String // For LaTeX formatted questions
  },
  options: [{
    id: String,
    text: String,
    latex: String, // For LaTeX formatted options
    isCorrect: {
      type: Boolean,
      default: false
    }
  }],
  correctAnswer: {
    type: mongoose.Schema.Types.Mixed // Can be string, array, or object
  },
  explanation: {
    type: String
  },
  explanationLatex: {
    type: String
  },
  points: {
    type: Number,
    default: 1
  },
  timeLimit: {
    type: Number // Time limit in seconds for this question
  }
});

const quizSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  questions: [questionSchema],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  secretCode: {
    type: String,
    sparse: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  settings: {
    timeLimit: {
      type: Number, // Total time limit in minutes
      default: 30
    },
    showResults: {
      type: String,
      enum: ['immediately', 'after_submit', 'manual'],
      default: 'after_submit'
    },
    allowRetake: {
      type: Boolean,
      default: true
    },
    shuffleQuestions: {
      type: Boolean,
      default: false
    },
    shuffleOptions: {
      type: Boolean,
      default: false
    },
    showCorrectAnswers: {
      type: Boolean,
      default: true
    },
    showExplanations: {
      type: Boolean,
      default: true
    },
    passingScore: {
      type: Number,
      default: 60 // Percentage
    }
  },
  totalPoints: {
    type: Number,
    default: 0
  },
  responseCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Calculate total points before saving
quizSchema.pre('save', function(next) {
  this.totalPoints = this.questions.reduce((sum, question) => sum + (question.points || 1), 0);
  next();
});

// Create indexes
quizSchema.index({ createdBy: 1, isActive: 1 });
quizSchema.index({ isPublic: 1, isActive: 1 });
quizSchema.index({ secretCode: 1 });

export default mongoose.model('Quiz', quizSchema);