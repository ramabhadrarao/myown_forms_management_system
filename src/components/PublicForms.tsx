import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FileText, Users, Calendar, LogIn, Search, Eye } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';

interface PublicFormsProps {
  onSwitchToLogin: () => void;
}

interface Form {
  _id: string;
  title: string;
  description: string;
  responseCount: number;
  createdAt: string;
  createdBy: {
    name: string;
  };
}

export function PublicForms({ onSwitchToLogin }: PublicFormsProps) {
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [secretCode, setSecretCode] = useState('');
  const [showSecretForm, setShowSecretForm] = useState(false);

  useEffect(() => {
    fetchPublicForms();
  }, []);

  const fetchPublicForms = async () => {
    try {
      const response = await axios.get('/forms/public');
      setForms(response.data.forms);
    } catch (error) {
      console.error('Error fetching public forms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSecretFormAccess = () => {
    if (secretCode.trim()) {
      window.location.hash = `#/form/secret?code=${secretCode}`;
    }
  };

  const handleViewForm = (formId: string) => {
    window.location.hash = `#/form/${formId}`;
  };

  const filteredForms = forms.filter(form =>
    form.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    form.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">FormsCraft</h1>
              <span className="ml-2 text-sm text-gray-500">Public Forms</span>
            </div>
            <button
              onClick={onSwitchToLogin}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Discover Public Forms
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Browse and participate in public forms created by our community
          </p>
        </div>

        {/* Search and Secret Form Access */}
        <div className="mb-8 space-y-4">
          <div className="relative max-w-md mx-auto">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Search forms..."
            />
          </div>

          <div className="text-center">
            <button
              onClick={() => setShowSecretForm(!showSecretForm)}
              className="text-blue-600 hover:text-blue-500 font-medium"
            >
              Have a secret code? Click here
            </button>
          </div>

          {showSecretForm && (
            <div className="max-w-md mx-auto">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={secretCode}
                  onChange={(e) => setSecretCode(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter secret code..."
                />
                <button
                  onClick={handleSecretFormAccess}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Access
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Forms Grid */}
        {filteredForms.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No public forms found</h3>
            <p className="text-gray-600">
              {searchTerm ? 'Try different search terms' : 'No public forms are available at the moment'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredForms.map((form) => (
              <div key={form._id} className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{form.title}</h3>
                    {form.description && (
                      <p className="text-gray-600 text-sm mb-4">{form.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <div className="flex items-center space-x-4">
                    <span className="flex items-center">
                      <Users className="w-4 h-4 mr-1" />
                      {form.responseCount} responses
                    </span>
                    <span className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      {new Date(form.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    by {form.createdBy.name}
                  </div>
                  <button
                    onClick={() => handleViewForm(form._id)}
                    className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    <span>View Form</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CTA Section */}
        <div className="mt-16 text-center">
          <div className="bg-blue-50 rounded-xl p-8 border border-blue-200">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Ready to create your own forms?
            </h3>
            <p className="text-gray-600 mb-6">
              Join our platform to create, share, and manage your own forms
            </p>
            <button
              onClick={onSwitchToLogin}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Get Started
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}