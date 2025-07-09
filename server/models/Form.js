import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['text', 'textarea', 'select', 'radio', 'checkbox', 'email', 'number', 'date', 'file']
  },
  question: {
    type: String,
    required: true
  },
  required: {
    type: Boolean,
    default: false
  },
  options: [{
    value: String,
    label: String
  }],
  validation: {
    min: Number,
    max: Number,
    pattern: String
  }
});

const formSchema = new mongoose.Schema({
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
  allowMultipleResponses: {
    type: Boolean,
    default: true
  },
  collectEmail: {
    type: Boolean,
    default: false
  },
  requireSignIn: {
    type: Boolean,
    default: false
  },
  responseCount: {
    type: Number,
    default: 0
  },
  settings: {
    showProgressBar: {
      type: Boolean,
      default: true
    },
    shuffleQuestions: {
      type: Boolean,
      default: false
    },
    confirmationMessage: {
      type: String,
      default: 'Thank you for your response!'
    }
  }
}, {
  timestamps: true
});

// Create indexes
formSchema.index({ createdBy: 1, isActive: 1 });
formSchema.index({ isPublic: 1, isActive: 1 });
formSchema.index({ secretCode: 1 });

export default mongoose.model('Form', formSchema);