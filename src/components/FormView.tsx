import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ArrowLeft, Send, Lock, Clock, User, CheckCircle } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';

interface FormViewProps {
  formId: string;
  onBack: () => void;
}

interface Question {
  id: string;
  type: 'text' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'email' | 'number' | 'date' | 'file';
  question: string;
  required: boolean;
  options: { value: string; label: string }[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

interface Form {
  _id: string;
  title: string;
  description: string;
  questions: Question[];
  isPublic: boolean;
  secretCode?: string;
  settings: {
    showProgressBar: boolean;
    shuffleQuestions: boolean;
    confirmationMessage: string;
  };
  createdBy: {
    name: string;
    email: string;
  };
  responseCount: number;
  createdAt: string;
}

export function FormView({ formId, onBack }: FormViewProps) {
  const [form, setForm] = useState<Form | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [secretCode, setSecretCode] = useState('');
  const [showSecretInput, setShowSecretInput] = useState(false);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    fetchForm();
  }, [formId]);

  const fetchForm = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      
      let url = `/forms/${formId}`;
      if (code) {
        url += `?code=${code}`;
      }

      const response = await axios.get(url);
      setForm(response.data);
      setError('');
    } catch (error: any) {
      console.error('Error fetching form:', error);
      
      if (error.response?.status === 403) {
        setShowSecretInput(true);
        setError('This form requires a secret code');
      } else {
        setError(error.response?.data?.message || 'Form not found');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSecretCodeSubmit = async () => {
    if (!secretCode.trim()) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.get(`/forms/${formId}?code=${secretCode}`);
      setForm(response.data);
      setShowSecretInput(false);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Invalid secret code');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form) return;

    // Validate required fields
    const missingRequired = form.questions.filter(q => 
      q.required && (!answers[q.id] || (Array.isArray(answers[q.id]) && answers[q.id].length === 0))
    );

    if (missingRequired.length > 0) {
      setError(`Please fill in all required fields: ${missingRequired.map(q => q.question).join(', ')}`);
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const formattedAnswers = form.questions.map(question => ({
        questionId: question.id,
        question: question.question,
        answer: answers[question.id] || '',
        questionType: question.type
      }));

      const completionTime = Math.floor((Date.now() - startTime) / 1000);

      await axios.post('/responses', {
        formId: form._id,
        answers: formattedAnswers,
        completionTime
      });

      setSubmitted(true);
    } catch (error: any) {
      console.error('Error submitting response:', error);
      setError(error.response?.data?.message || 'Error submitting response');
    } finally {
      setSubmitting(false);
    }
  };

  const renderQuestion = (question: Question, index: number) => {
    const value = answers[question.id] || '';

    switch (question.type) {
      case 'text':
      case 'email':
      case 'number':
        return (
          <input
            type={question.type}
            value={value}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required={question.required}
          />
        );

      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={4}
            required={question.required}
          />
        );

      case 'date':
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required={question.required}
          />
        );

      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required={question.required}
          >
            <option value="">Select an option</option>
            {question.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'radio':
        return (
          <div className="space-y-2">
            {question.options.map((option) => (
              <label key={option.value} className="flex items-center">
                <input
                  type="radio"
                  name={question.id}
                  value={option.value}
                  checked={value === option.value}
                  onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                  className="mr-2 text-blue-600 focus:ring-blue-500"
                  required={question.required}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        );

      case 'checkbox':
        return (
          <div className="space-y-2">
            {question.options.map((option) => (
              <label key={option.value} className="flex items-center">
                <input
                  type="checkbox"
                  value={option.value}
                  checked={Array.isArray(value) && value.includes(option.value)}
                  onChange={(e) => {
                    const currentValue = Array.isArray(value) ? value : [];
                    if (e.target.checked) {
                      handleAnswerChange(question.id, [...currentValue, option.value]);
                    } else {
                      handleAnswerChange(question.id, currentValue.filter(v => v !== option.value));
                    }
                  }}
                  className="mr-2 text-blue-600 focus:ring-blue-500"
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (showSecretInput) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 border border-gray-200">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-yellow-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Secret Code Required</h2>
            <p className="text-gray-600">This form requires a secret code to access.</p>
          </div>

          <div className="space-y-4">
            <input
              type="text"
              value={secretCode}
              onChange={(e) => setSecretCode(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter secret code"
              onKeyPress={(e) => e.key === 'Enter' && handleSecretCodeSubmit()}
            />

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <button
              onClick={handleSecretCodeSubmit}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Access Form
            </button>

            <button
              onClick={onBack}
              className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (error && !form) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 border border-gray-200 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Form Not Found</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={onBack}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 border border-gray-200 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Response Submitted</h2>
          <p className="text-gray-600 mb-6">
            {form?.settings.confirmationMessage || 'Thank you for your response!'}
          </p>
          <button
            onClick={onBack}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!form) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          {/* Form Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-8">
            <h1 className="text-3xl font-bold mb-2">{form.title}</h1>
            {form.description && (
              <p className="text-blue-100 mb-4">{form.description}</p>
            )}
            
            <div className="flex items-center space-x-6 text-sm text-blue-100">
              <span className="flex items-center">
                <User className="w-4 h-4 mr-1" />
                by {form.createdBy.name}
              </span>
              <span className="flex items-center">
                <Clock className="w-4 h-4 mr-1" />
                {form.responseCount} responses
              </span>
            </div>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="p-8">
            {/* Progress Bar */}
            {form.settings.showProgressBar && (
              <div className="mb-8">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Progress</span>
                  <span>{Math.round(((Object.keys(answers).length) / form.questions.length) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(Object.keys(answers).length / form.questions.length) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Questions */}
            <div className="space-y-8">
              {form.questions.map((question, index) => (
                <div key={question.id} className="space-y-3">
                  <label className="block text-lg font-medium text-gray-900">
                    {question.question}
                    {question.required && (
                      <span className="text-red-500 ml-1">*</span>
                    )}
                  </label>
                  
                  {renderQuestion(question, index)}
                </div>
              ))}
            </div>

            {/* Error Message */}
            {error && (
              <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span>Submit Response</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}