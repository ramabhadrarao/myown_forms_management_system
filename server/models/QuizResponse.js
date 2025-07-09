import mongoose from 'mongoose';

const answerSchema = new mongoose.Schema({
  questionId: {
    type: String,
    required: true
  },
  answer: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  isCorrect: {
    type: Boolean,
    default: false
  },
  pointsEarned: {
    type: Number,
    default: 0
  },
  timeSpent: {
    type: Number // Time spent on this question in seconds
  }
});

const quizResponseSchema = new mongoose.Schema({
  quizId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true
  },
  respondentEmail: {
    type: String,
    lowercase: true,
    trim: true
  },
  respondentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  answers: [answerSchema],
  score: {
    type: Number,
    default: 0
  },
  totalPoints: {
    type: Number,
    default: 0
  },
  percentage: {
    type: Number,
    default: 0
  },
  passed: {
    type: Boolean,
    default: false
  },
  completionTime: {
    type: Number // Total time taken in seconds
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  submittedAt: {
    type: Date
  },
  isComplete: {
    type: Boolean,
    default: false
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  }
}, {
  timestamps: true
});

// Calculate score before saving
quizResponseSchema.pre('save', function(next) {
  this.score = this.answers.reduce((sum, answer) => sum + (answer.pointsEarned || 0), 0);
  
  if (this.totalPoints > 0) {
    this.percentage = Math.round((this.score / this.totalPoints) * 100);
  }
  
  next();
});

// Create indexes
quizResponseSchema.index({ quizId: 1, createdAt: -1 });
quizResponseSchema.index({ respondentEmail: 1 });
quizResponseSchema.index({ respondentId: 1 });

export default mongoose.model('QuizResponse', quizResponseSchema);