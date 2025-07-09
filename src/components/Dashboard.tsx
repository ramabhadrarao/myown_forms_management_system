import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, FileText, Users, BarChart3, Settings, Eye, Edit, Trash2, Share2, Lock, PieChart, Brain, Award } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';

interface DashboardProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    isApproved: boolean;
  };
  onViewChange: (view: string) => void;
}

interface Form {
  _id: string;
  title: string;
  description: string;
  isPublic: boolean;
  secretCode?: string;
  isActive: boolean;
  responseCount: number;
  createdAt: string;
  updatedAt: string;
}

interface Quiz {
  _id: string;
  title: string;
  description: string;
  isPublic: boolean;
  secretCode?: string;
  isActive: boolean;
  responseCount: number;
  totalPoints: number;
  settings: {
    timeLimit: number;
    passingScore: number;
  };
  createdAt: string;
  updatedAt: string;
}

export function Dashboard({ user, onViewChange }: DashboardProps) {
  const [forms, setForms] = useState<Form[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalForms: 0, totalResponses: 0 });
  const [activeTab, setActiveTab] = useState<'forms' | 'quizzes'>('forms');

  useEffect(() => {
    fetchForms();
    fetchQuizzes();
    fetchStats();
  }, []);

  const fetchForms = async () => {
    try {
      const response = await axios.get('/forms/my-forms');
      setForms(response.data.forms);
    } catch (error) {
      console.error('Error fetching forms:', error);
    }
  };

  const fetchQuizzes = async () => {
    try {
      const response = await axios.get('/quizzes/my-quizzes');
      setQuizzes(response.data.quizzes);
    } catch (error) {
      console.error('Error fetching quizzes:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get('/users/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleDeleteForm = async (formId: string) => {
    if (!confirm('Are you sure you want to delete this form? This action cannot be undone.')) {
      return;
    }

    try {
      await axios.delete(`/forms/${formId}`);
      setForms(forms.filter(form => form._id !== formId));
    } catch (error) {
      console.error('Error deleting form:', error);
    }
  };

  const handleDeleteQuiz = async (quizId: string) => {
    if (!confirm('Are you sure you want to delete this quiz? This action cannot be undone.')) {
      return;
    }

    try {
      await axios.delete(`/quizzes/${quizId}`);
      setQuizzes(quizzes.filter(quiz => quiz._id !== quizId));
    } catch (error) {
      console.error('Error deleting quiz:', error);
    }
  };

  const toggleFormStatus = async (formId: string, isActive: boolean) => {
    try {
      await axios.put(`/forms/${formId}`, { isActive: !isActive });
      setForms(forms.map(form => 
        form._id === formId ? { ...form, isActive: !isActive } : form
      ));
    } catch (error) {
      console.error('Error updating form status:', error);
    }
  };

  const toggleQuizStatus = async (quizId: string, isActive: boolean) => {
    try {
      await axios.put(`/quizzes/${quizId}`, { isActive: !isActive });
      setQuizzes(quizzes.map(quiz => 
        quiz._id === quizId ? { ...quiz, isActive: !isActive } : quiz
      ));
    } catch (error) {
      console.error('Error updating quiz status:', error);
    }
  };

  const copyFormLink = (form: Form) => {
    const baseUrl = window.location.origin;
    const link = form.secretCode 
      ? `${baseUrl}/#/form/${form._id}?code=${form.secretCode}`
      : `${baseUrl}/#/form/${form._id}`;
    
    navigator.clipboard.writeText(link).then(() => {
      alert('Form link copied to clipboard!');
    }).catch(() => {
      const textArea = document.createElement('textarea');
      textArea.value = link;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Form link copied to clipboard!');
    });
  };

  const copyQuizLink = (quiz: Quiz) => {
    const baseUrl = window.location.origin;
    const link = quiz.secretCode 
      ? `${baseUrl}/#/quiz/${quiz._id}?code=${quiz.secretCode}`
      : `${baseUrl}/#/quiz/${quiz._id}`;
    
    navigator.clipboard.writeText(link).then(() => {
      alert('Quiz link copied to clipboard!');
    }).catch(() => {
      const textArea = document.createElement('textarea');
      textArea.value = link;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Quiz link copied to clipboard!');
    });
  };

  const handleViewForm = (formId: string) => {
    window.location.hash = `#/form/${formId}`;
  };

  const handleViewQuiz = (quizId: string) => {
    window.location.hash = `#/quiz/${quizId}`;
  };

  const handleViewResponses = (formId: string) => {
    window.location.hash = `#/responses/${formId}`;
  };

  const handleViewQuizResponses = (quizId: string) => {
    window.location.hash = `#/quiz-responses/${quizId}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  const totalQuizResponses = quizzes.reduce((sum, quiz) => sum + quiz.responseCount, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">Welcome back, {user.name}!</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">Forms</h3>
              <p className="text-2xl font-semibold text-gray-900">{forms.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">Quizzes</h3>
              <p className="text-2xl font-semibold text-gray-900">{quizzes.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">Form Responses</h3>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalResponses}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center">
                <Award className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">Quiz Attempts</h3>
              <p className="text-2xl font-semibold text-gray-900">{totalQuizResponses}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content Tabs */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex space-x-8">
              <button
                onClick={() => setActiveTab('forms')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'forms'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Forms ({forms.length})
              </button>
              <button
                onClick={() => setActiveTab('quizzes')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'quizzes'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Quizzes ({quizzes.length})
              </button>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => onViewChange('form-builder')}
                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span>Create Form</span>
              </button>
              <button
                onClick={() => onViewChange('quiz-builder')}
                className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span>Create Quiz</span>
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'forms' && (
            <>
              {forms.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No forms yet</h3>
                  <p className="text-gray-600 mb-6">Create your first form to get started.</p>
                  <button
                    onClick={() => onViewChange('form-builder')}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Create Your First Form
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {forms.map((form) => (
                    <div key={form._id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h3 className="text-lg font-medium text-gray-900">{form.title}</h3>
                            <div className="flex items-center space-x-2">
                              {form.secretCode && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                  <Lock className="w-3 h-3 mr-1" />
                                  Secret Code
                                </span>
                              )}
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                form.isActive 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {form.isActive ? 'Active' : 'Inactive'}
                              </span>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                form.isPublic 
                                  ? 'bg-blue-100 text-blue-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {form.isPublic ? 'Public' : 'Private'}
                              </span>
                            </div>
                          </div>
                          
                          {form.description && (
                            <p className="text-gray-600 mt-1">{form.description}</p>
                          )}
                          
                          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                            <span>{form.responseCount} responses</span>
                            <span>Created {new Date(form.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 ml-4">
                          <button
                            onClick={() => handleViewForm(form._id)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View Form"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                          
                          <button
                            onClick={() => handleViewResponses(form._id)}
                            className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="View Responses"
                          >
                            <PieChart className="w-5 h-5" />
                          </button>
                          
                          <button
                            onClick={() => copyFormLink(form)}
                            className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Copy Link"
                          >
                            <Share2 className="w-5 h-5" />
                          </button>
                          
                          <button
                            onClick={() => toggleFormStatus(form._id, form.isActive)}
                            className={`p-2 rounded-lg transition-colors ${
                              form.isActive 
                                ? 'text-gray-400 hover:text-red-600 hover:bg-red-50' 
                                : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                            }`}
                            title={form.isActive ? 'Deactivate' : 'Activate'}
                          >
                            <Settings className="w-5 h-5" />
                          </button>
                          
                          <button
                            onClick={() => handleDeleteForm(form._id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Form"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === 'quizzes' && (
            <>
              {quizzes.length === 0 ? (
                <div className="text-center py-12">
                  <Brain className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No quizzes yet</h3>
                  <p className="text-gray-600 mb-6">Create your first quiz with auto-grading to get started.</p>
                  <button
                    onClick={() => onViewChange('quiz-builder')}
                    className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Create Your First Quiz
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {quizzes.map((quiz) => (
                    <div key={quiz._id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h3 className="text-lg font-medium text-gray-900">{quiz.title}</h3>
                            <div className="flex items-center space-x-2">
                              {quiz.secretCode && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                  <Lock className="w-3 h-3 mr-1" />
                                  Secret Code
                                </span>
                              )}
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                quiz.isActive 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {quiz.isActive ? 'Active' : 'Inactive'}
                              </span>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                quiz.isPublic 
                                  ? 'bg-blue-100 text-blue-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {quiz.isPublic ? 'Public' : 'Private'}
                              </span>
                            </div>
                          </div>
                          
                          {quiz.description && (
                            <p className="text-gray-600 mt-1">{quiz.description}</p>
                          )}
                          
                          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                            <span>{quiz.responseCount} attempts</span>
                            <span>{quiz.totalPoints} points</span>
                            <span>{quiz.settings.timeLimit} min</span>
                            <span>{quiz.settings.passingScore}% to pass</span>
                            <span>Created {new Date(quiz.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 ml-4">
                          <button
                            onClick={() => handleViewQuiz(quiz._id)}
                            className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="Take Quiz"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                          
                          <button
                            onClick={() => handleViewQuizResponses(quiz._id)}
                            className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                            title="View Results"
                          >
                            <BarChart3 className="w-5 h-5" />
                          </button>
                          
                          <button
                            onClick={() => copyQuizLink(quiz)}
                            className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Copy Link"
                          >
                            <Share2 className="w-5 h-5" />
                          </button>
                          
                          <button
                            onClick={() => toggleQuizStatus(quiz._id, quiz.isActive)}
                            className={`p-2 rounded-lg transition-colors ${
                              quiz.isActive 
                                ? 'text-gray-400 hover:text-red-600 hover:bg-red-50' 
                                : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                            }`}
                            title={quiz.isActive ? 'Deactivate' : 'Activate'}
                          >
                            <Settings className="w-5 h-5" />
                          </button>
                          
                          <button
                            onClick={() => handleDeleteQuiz(quiz._id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Quiz"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}