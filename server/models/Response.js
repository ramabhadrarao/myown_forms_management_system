import mongoose from 'mongoose';

const answerSchema = new mongoose.Schema({
  questionId: {
    type: String,
    required: true
  },
  question: {
    type: String,
    required: true
  },
  answer: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  questionType: {
    type: String,
    required: true
  }
});

const responseSchema = new mongoose.Schema({
  formId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Form',
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
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  completionTime: {
    type: Number // Time in seconds
  },
  isComplete: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Create indexes
responseSchema.index({ formId: 1, createdAt: -1 });
responseSchema.index({ respondentEmail: 1 });
responseSchema.index({ respondentId: 1 });

export default mongoose.model('Response', responseSchema);