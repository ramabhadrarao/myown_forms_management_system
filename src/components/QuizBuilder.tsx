import React, { useState } from 'react';
import axios from 'axios';
import { Plus, Trash2, Save, ArrowLeft, Settings, Type, CheckCircle, Circle, Edit3 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface QuizBuilderProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    isApproved: boolean;
  };
  onBack: () => void;
}

interface Question {
  id: string;
  type: 'multiple-choice' | 'true-false' | 'fill-blank' | 'essay';
  question: string;
  questionLatex?: string;
  options: { id: string; text: string; latex?: string; isCorrect: boolean }[];
  correctAnswer: any;
  explanation?: string;
  explanationLatex?: string;
  points: number;
  timeLimit?: number;
}

interface QuizData {
  title: string;
  description: string;
  questions: Question[];
  isPublic: boolean;
  secretCode: string;
  settings: {
    timeLimit: number;
    showResults: 'immediately' | 'after_submit' | 'manual';
    allowRetake: boolean;
    shuffleQuestions: boolean;
    shuffleOptions: boolean;
    showCorrectAnswers: boolean;
    showExplanations: boolean;
    passingScore: number;
  };
}

const questionTypes = [
  { value: 'multiple-choice', label: 'Multiple Choice', icon: Circle },
  { value: 'true-false', label: 'True/False', icon: CheckCircle },
  { value: 'fill-blank', label: 'Fill in the Blank', icon: Edit3 },
  { value: 'essay', label: 'Essay', icon: Type },
];

export function QuizBuilder({ user, onBack }: QuizBuilderProps) {
  const [quizData, setQuizData] = useState<QuizData>({
    title: '',
    description: '',
    questions: [],
    isPublic: true,
    secretCode: '',
    settings: {
      timeLimit: 30,
      showResults: 'after_submit',
      allowRetake: true,
      shuffleQuestions: false,
      shuffleOptions: false,
      showCorrectAnswers: true,
      showExplanations: true,
      passingScore: 60
    }
  });

  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'questions' | 'settings'>('questions');

  const addQuestion = (type: Question['type']) => {
    const newQuestion: Question = {
      id: uuidv4(),
      type,
      question: '',
      options: type === 'multiple-choice' ? [
        { id: uuidv4(), text: '', isCorrect: false },
        { id: uuidv4(), text: '', isCorrect: false }
      ] : type === 'true-false' ? [
        { id: uuidv4(), text: 'True', isCorrect: false },
        { id: uuidv4(), text: 'False', isCorrect: false }
      ] : [],
      correctAnswer: type === 'fill-blank' ? '' : type === 'true-false' ? 'True' : '',
      points: 1
    };

    setQuizData(prev => ({
      ...prev,
      questions: [...prev.questions, newQuestion]
    }));
  };

  const updateQuestion = (questionId: string, updates: Partial<Question>) => {
    setQuizData(prev => ({
      ...prev,
      questions: prev.questions.map(q => 
        q.id === questionId ? { ...q, ...updates } : q
      )
    }));
  };

  const deleteQuestion = (questionId: string) => {
    setQuizData(prev => ({
      ...prev,
      questions: prev.questions.filter(q => q.id !== questionId)
    }));
  };

  const addOption = (questionId: string) => {
    const question = quizData.questions.find(q => q.id === questionId);
    if (question && question.type === 'multiple-choice') {
      const newOption = {
        id: uuidv4(),
        text: '',
        isCorrect: false
      };
      updateQuestion(questionId, {
        options: [...question.options, newOption]
      });
    }
  };

  const updateOption = (questionId: string, optionId: string, updates: Partial<{ text: string; latex: string; isCorrect: boolean }>) => {
    const question = quizData.questions.find(q => q.id === questionId);
    if (question) {
      const newOptions = question.options.map(option => 
        option.id === optionId ? { ...option, ...updates } : option
      );
      updateQuestion(questionId, { options: newOptions });

      // Update correct answer if this is a multiple choice question
      if (question.type === 'multiple-choice' && updates.isCorrect) {
        // Make sure only one option is correct
        const correctedOptions = newOptions.map(option => ({
          ...option,
          isCorrect: option.id === optionId
        }));
        updateQuestion(questionId, { 
          options: correctedOptions,
          correctAnswer: optionId
        });
      }
    }
  };

  const deleteOption = (questionId: string, optionId: string) => {
    const question = quizData.questions.find(q => q.id === questionId);
    if (question && question.options.length > 2) {
      updateQuestion(questionId, {
        options: question.options.filter(option => option.id !== optionId)
      });
    }
  };

  const handleSave = async () => {
    if (!quizData.title || quizData.questions.length === 0) {
      alert('Please provide a title and at least one question');
      return;
    }

    // Validate questions
    for (const question of quizData.questions) {
      if (!question.question.trim()) {
        alert('All questions must have text');
        return;
      }

      if (question.type === 'multiple-choice') {
        if (question.options.length < 2) {
          alert('Multiple choice questions must have at least 2 options');
          return;
        }
        if (!question.options.some(opt => opt.isCorrect)) {
          alert('Multiple choice questions must have a correct answer');
          return;
        }
      }

      if (question.type === 'true-false' && !question.correctAnswer) {
        alert('True/False questions must have a correct answer');
        return;
      }

      if (question.type === 'fill-blank' && !question.correctAnswer.trim()) {
        alert('Fill in the blank questions must have a correct answer');
        return;
      }
    }

    setSaving(true);
    try {
      await axios.post('/quizzes', quizData);
      alert('Quiz created successfully!');
      onBack();
    } catch (error) {
      console.error('Error saving quiz:', error);
      alert('Error saving quiz. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const renderLatexPreview = (text: string, latex?: string) => {
    if (latex) {
      return (
        <div className="mt-2 p-2 bg-gray-50 border rounded">
          <div className="text-xs text-gray-500 mb-1">LaTeX Preview:</div>
          <div dangerouslySetInnerHTML={{ __html: `$${latex}$` }} />
        </div>
      );
    }
    return null;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Quiz Builder</h1>
        <p className="mt-2 text-gray-600">Create a new quiz with auto-grading</p>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-gray-200">
        {/* Quiz Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quiz Title *
              </label>
              <input
                type="text"
                value={quizData.title}
                onChange={(e) => setQuizData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter quiz title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={quizData.description}
                onChange={(e) => setQuizData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="Describe your quiz"
              />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('questions')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'questions'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Questions
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'settings'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Settings
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'questions' && (
            <div className="space-y-6">
              {/* Question Types */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Add Question</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {questionTypes.map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      onClick={() => addQuestion(value as Question['type'])}
                      className="flex items-center space-x-2 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Icon className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Questions List */}
              <div className="space-y-6">
                {quizData.questions.map((question, index) => (
                  <div key={question.id} className="border border-gray-200 rounded-lg p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-700">
                          Question {index + 1} ({questionTypes.find(t => t.value === question.type)?.label})
                        </span>
                      </div>
                      <button
                        onClick={() => deleteQuestion(question.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      {/* Question Text */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Question Text *
                        </label>
                        <textarea
                          value={question.question}
                          onChange={(e) => updateQuestion(question.id, { question: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          rows={2}
                          placeholder="Enter your question"
                        />
                      </div>

                      {/* LaTeX Support */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          LaTeX (Optional)
                        </label>
                        <input
                          type="text"
                          value={question.questionLatex || ''}
                          onChange={(e) => updateQuestion(question.id, { questionLatex: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter LaTeX for mathematical expressions"
                        />
                        {renderLatexPreview(question.question, question.questionLatex)}
                      </div>

                      {/* Question Type Specific Fields */}
                      {question.type === 'multiple-choice' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Options
                          </label>
                          <div className="space-y-2">
                            {question.options.map((option, optionIndex) => (
                              <div key={option.id} className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  name={`correct-${question.id}`}
                                  checked={option.isCorrect}
                                  onChange={() => updateOption(question.id, option.id, { isCorrect: true })}
                                  className="text-blue-600 focus:ring-blue-500"
                                />
                                <input
                                  type="text"
                                  value={option.text}
                                  onChange={(e) => updateOption(question.id, option.id, { text: e.target.value })}
                                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  placeholder={`Option ${optionIndex + 1}`}
                                />
                                <button
                                  onClick={() => deleteOption(question.id, option.id)}
                                  className="text-red-500 hover:text-red-700"
                                  disabled={question.options.length === 2}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                            <button
                              onClick={() => addOption(question.id)}
                              className="flex items-center space-x-2 text-blue-600 hover:text-blue-700"
                            >
                              <Plus className="w-4 h-4" />
                              <span>Add Option</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {question.type === 'true-false' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Correct Answer
                          </label>
                          <div className="flex space-x-4">
                            <label className="flex items-center">
                              <input
                                type="radio"
                                name={`tf-${question.id}`}
                                value="True"
                                checked={question.correctAnswer === 'True'}
                                onChange={(e) => updateQuestion(question.id, { correctAnswer: e.target.value })}
                                className="mr-2 text-blue-600 focus:ring-blue-500"
                              />
                              True
                            </label>
                            <label className="flex items-center">
                              <input
                                type="radio"
                                name={`tf-${question.id}`}
                                value="False"
                                checked={question.correctAnswer === 'False'}
                                onChange={(e) => updateQuestion(question.id, { correctAnswer: e.target.value })}
                                className="mr-2 text-blue-600 focus:ring-blue-500"
                              />
                              False
                            </label>
                          </div>
                        </div>
                      )}

                      {question.type === 'fill-blank' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Correct Answer
                          </label>
                          <input
                            type="text"
                            value={question.correctAnswer || ''}
                            onChange={(e) => updateQuestion(question.id, { correctAnswer: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Enter the correct answer"
                          />
                        </div>
                      )}

                      {/* Points and Explanation */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Points
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={question.points}
                            onChange={(e) => updateQuestion(question.id, { points: parseInt(e.target.value) || 1 })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Time Limit (seconds)
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={question.timeLimit || ''}
                            onChange={(e) => updateQuestion(question.id, { timeLimit: parseInt(e.target.value) || undefined })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="No limit"
                          />
                        </div>
                      </div>

                      {/* Explanation */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Explanation (Optional)
                        </label>
                        <textarea
                          value={question.explanation || ''}
                          onChange={(e) => updateQuestion(question.id, { explanation: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          rows={2}
                          placeholder="Explain the correct answer"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {quizData.questions.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <Circle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p>No questions added yet. Choose a question type to get started.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Quiz Settings</h3>
                
                <div className="space-y-6">
                  {/* Basic Settings */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Time Limit (minutes)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={quizData.settings.timeLimit}
                        onChange={(e) => setQuizData(prev => ({
                          ...prev,
                          settings: { ...prev.settings, timeLimit: parseInt(e.target.value) || 30 }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Passing Score (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={quizData.settings.passingScore}
                        onChange={(e) => setQuizData(prev => ({
                          ...prev,
                          settings: { ...prev.settings, passingScore: parseInt(e.target.value) || 60 }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Show Results */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Show Results
                    </label>
                    <select
                      value={quizData.settings.showResults}
                      onChange={(e) => setQuizData(prev => ({
                        ...prev,
                        settings: { ...prev.settings, showResults: e.target.value as any }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="immediately">Immediately after each question</option>
                      <option value="after_submit">After quiz submission</option>
                      <option value="manual">Manual release by instructor</option>
                    </select>
                  </div>

                  {/* Privacy Settings */}
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={quizData.isPublic}
                        onChange={(e) => setQuizData(prev => ({ ...prev, isPublic: e.target.checked }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Make quiz public</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Secret Code (optional)
                    </label>
                    <input
                      type="text"
                      value={quizData.secretCode}
                      onChange={(e) => setQuizData(prev => ({ ...prev, secretCode: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter secret code for private access"
                    />
                  </div>

                  {/* Quiz Behavior */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-700">Quiz Behavior</h4>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={quizData.settings.allowRetake}
                        onChange={(e) => setQuizData(prev => ({
                          ...prev,
                          settings: { ...prev.settings, allowRetake: e.target.checked }
                        }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Allow retaking quiz</span>
                    </label>

                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={quizData.settings.shuffleQuestions}
                        onChange={(e) => setQuizData(prev => ({
                          ...prev,
                          settings: { ...prev.settings, shuffleQuestions: e.target.checked }
                        }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Shuffle questions</span>
                    </label>

                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={quizData.settings.shuffleOptions}
                        onChange={(e) => setQuizData(prev => ({
                          ...prev,
                          settings: { ...prev.settings, shuffleOptions: e.target.checked }
                        }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Shuffle answer options</span>
                    </label>

                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={quizData.settings.showCorrectAnswers}
                        onChange={(e) => setQuizData(prev => ({
                          ...prev,
                          settings: { ...prev.settings, showCorrectAnswers: e.target.checked }
                        }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Show correct answers in results</span>
                    </label>

                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={quizData.settings.showExplanations}
                        onChange={(e) => setQuizData(prev => ({
                          ...prev,
                          settings: { ...prev.settings, showExplanations: e.target.checked }
                        }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Show explanations in results</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="p-6 border-t border-gray-200">
          <div className="flex justify-end space-x-3">
            <button
              onClick={onBack}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !quizData.title || quizData.questions.length === 0}
              className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{saving ? 'Saving...' : 'Save Quiz'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}