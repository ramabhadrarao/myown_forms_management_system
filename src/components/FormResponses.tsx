import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ArrowLeft, Download, Eye, Trash2, Calendar, User, Mail, BarChart3 } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';

interface FormResponsesProps {
  formId: string;
  onBack: () => void;
}

interface Answer {
  questionId: string;
  question: string;
  answer: any;
  questionType: string;
}

interface Response {
  _id: string;
  answers: Answer[];
  respondentEmail?: string;
  respondentId?: {
    name: string;
    email: string;
  };
  createdAt: string;
  completionTime?: number;
  ipAddress?: string;
}

interface Question {
  id: string;
  type: string;
  question: string;
  required: boolean;
  options: { value: string; label: string }[];
}

interface Form {
  title: string;
  description: string;
  questions: Question[];
}

interface ResponseData {
  responses: Response[];
  total: number;
  page: number;
  pages: number;
  form: Form;
}

export function FormResponses({ formId, onBack }: FormResponsesProps) {
  const [data, setData] = useState<ResponseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedResponse, setSelectedResponse] = useState<Response | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'individual' | 'analytics'>('list');

  useEffect(() => {
    fetchResponses();
  }, [formId]);

  const fetchResponses = async () => {
    try {
      const response = await axios.get(`/responses/form/${formId}`);
      setData(response.data);
    } catch (error) {
      console.error('Error fetching responses:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteResponse = async (responseId: string) => {
    if (!confirm('Are you sure you want to delete this response?')) {
      return;
    }

    try {
      await axios.delete(`/responses/${responseId}`);
      if (data) {
        setData({
          ...data,
          responses: data.responses.filter(r => r._id !== responseId),
          total: data.total - 1
        });
      }
    } catch (error) {
      console.error('Error deleting response:', error);
    }
  };

  const downloadCSV = () => {
    if (!data) return;

    const headers = ['Response ID', 'Date', 'Respondent', 'Email', 'Completion Time (s)'];
    data.form.questions.forEach(q => headers.push(q.question));

    const rows = data.responses.map(response => {
      const row = [
        response._id,
        new Date(response.createdAt).toLocaleString(),
        response.respondentId?.name || 'Anonymous',
        response.respondentEmail || response.respondentId?.email || 'N/A',
        response.completionTime?.toString() || 'N/A'
      ];

      data.form.questions.forEach(question => {
        const answer = response.answers.find(a => a.questionId === question.id);
        if (answer) {
          if (Array.isArray(answer.answer)) {
            row.push(answer.answer.join(', '));
          } else {
            row.push(answer.answer?.toString() || '');
          }
        } else {
          row.push('');
        }
      });

      return row;
    });

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${data.form.title}_responses.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadJSON = () => {
    if (!data) return;

    const exportData = {
      form: data.form,
      responses: data.responses,
      exportDate: new Date().toISOString(),
      totalResponses: data.total
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${data.form.title}_responses.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const renderAnswer = (answer: Answer) => {
    if (Array.isArray(answer.answer)) {
      return answer.answer.join(', ');
    }
    return answer.answer?.toString() || 'No answer';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No data available</h2>
          <button onClick={onBack} className="text-blue-600 hover:text-blue-500">
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>
        <h1 className="text-3xl font-bold text-gray-900">{data.form.title} - Responses</h1>
        <p className="mt-2 text-gray-600">{data.total} total responses</p>
      </div>

      {/* Navigation Tabs */}
      <div className="mb-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => setViewMode('list')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              viewMode === 'list'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            All Responses
          </button>
          <button
            onClick={() => setViewMode('analytics')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              viewMode === 'analytics'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Analytics
          </button>
        </nav>
      </div>

      {/* Export Buttons */}
      <div className="mb-6 flex space-x-3">
        <button
          onClick={downloadCSV}
          className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>Export CSV</span>
        </button>
        <button
          onClick={downloadJSON}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>Export JSON</span>
        </button>
      </div>

      {viewMode === 'list' && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200">
          {selectedResponse ? (
            // Individual Response View
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Individual Response</h3>
                <button
                  onClick={() => setSelectedResponse(null)}
                  className="text-gray-600 hover:text-gray-900"
                >
                  ← Back to list
                </button>
              </div>

              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Submitted:</span>
                    <p>{new Date(selectedResponse.createdAt).toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Respondent:</span>
                    <p>{selectedResponse.respondentId?.name || 'Anonymous'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Email:</span>
                    <p>{selectedResponse.respondentEmail || selectedResponse.respondentId?.email || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Completion Time:</span>
                    <p>{selectedResponse.completionTime ? `${selectedResponse.completionTime}s` : 'N/A'}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {selectedResponse.answers.map((answer, index) => (
                  <div key={index} className="border-b border-gray-200 pb-4">
                    <h4 className="font-medium text-gray-900 mb-2">{answer.question}</h4>
                    <div className="text-gray-700">
                      {renderAnswer(answer)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            // Responses List
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Respondent
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Completion Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.responses.map((response) => (
                    <tr key={response._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8">
                            <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                              <User className="h-4 w-4 text-gray-600" />
                            </div>
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {response.respondentId?.name || 'Anonymous'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {response.respondentEmail || response.respondentId?.email || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                          {new Date(response.createdAt).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(response.createdAt).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {response.completionTime ? `${response.completionTime}s` : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setSelectedResponse(response)}
                            className="text-blue-600 hover:text-blue-900"
                            title="View Response"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteResponse(response._id)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete Response"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {data.responses.length === 0 && (
                <div className="text-center py-12">
                  <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No responses yet</h3>
                  <p className="text-gray-600">Responses will appear here once people start filling out your form.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {viewMode === 'analytics' && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Response Analytics</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-600">{data.total}</div>
              <div className="text-sm text-blue-600">Total Responses</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-600">
                {data.responses.length > 0 
                  ? Math.round(data.responses.reduce((sum, r) => sum + (r.completionTime || 0), 0) / data.responses.length)
                  : 0}s
              </div>
              <div className="text-sm text-green-600">Avg. Completion Time</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-purple-600">
                {Math.round((data.responses.filter(r => r.respondentId).length / Math.max(data.total, 1)) * 100)}%
              </div>
              <div className="text-sm text-purple-600">Signed-in Users</div>
            </div>
          </div>

          <div className="space-y-6">
            {data.form.questions.map((question) => {
              const questionResponses = data.responses
                .map(r => r.answers.find(a => a.questionId === question.id))
                .filter(Boolean);

              if (['radio', 'select', 'checkbox'].includes(question.type)) {
                const distribution: Record<string, number> = {};
                questionResponses.forEach(answer => {
                  if (Array.isArray(answer!.answer)) {
                    answer!.answer.forEach((val: string) => {
                      distribution[val] = (distribution[val] || 0) + 1;
                    });
                  } else {
                    const val = answer!.answer?.toString() || '';
                    distribution[val] = (distribution[val] || 0) + 1;
                  }
                });

                return (
                  <div key={question.id} className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-4">{question.question}</h4>
                    <div className="space-y-2">
                      {Object.entries(distribution).map(([option, count]) => (
                        <div key={option} className="flex items-center justify-between">
                          <span className="text-sm text-gray-700">{option}</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-32 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${(count / questionResponses.length) * 100}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium text-gray-900">
                              {count} ({Math.round((count / questionResponses.length) * 100)}%)
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }

              return (
                <div key={question.id} className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">{question.question}</h4>
                  <p className="text-sm text-gray-600">{questionResponses.length} responses</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}