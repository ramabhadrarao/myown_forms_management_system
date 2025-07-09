import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, FileText, Users, BarChart3, Settings, Eye, Edit, Trash2, Share2, Lock } from 'lucide-react';
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

export function Dashboard({ user, onViewChange }: DashboardProps) {
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalForms: 0, totalResponses: 0 });

  useEffect(() => {
    fetchForms();
    fetchStats();
  }, []);

  const fetchForms = async () => {
    try {
      const response = await axios.get('/forms/my-forms');
      setForms(response.data.forms);
    } catch (error) {
      console.error('Error fetching forms:', error);
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

  const copyFormLink = (form: Form) => {
    const baseUrl = window.location.origin;
    const link = form.secretCode 
      ? `${baseUrl}/#/form/${form._id}?code=${form.secretCode}`
      : `${baseUrl}/#/form/${form._id}`;
    
    navigator.clipboard.writeText(link);
    alert('Form link copied to clipboard!');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">Welcome back, {user.name}!</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">Total Forms</h3>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalForms}</p>
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
              <h3 className="text-sm font-medium text-gray-500">Total Responses</h3>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalResponses}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">Average Responses</h3>
              <p className="text-2xl font-semibold text-gray-900">
                {stats.totalForms > 0 ? Math.round(stats.totalResponses / stats.totalForms) : 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Forms Section */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">My Forms</h2>
            <button
              onClick={() => onViewChange('form-builder')}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>Create Form</span>
            </button>
          </div>
        </div>

        <div className="p-6">
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
                        onClick={() => onViewChange(`form-view:${form._id}`)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View Form"
                      >
                        <Eye className="w-5 h-5" />
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
        </div>
      </div>
    </div>
  );
}