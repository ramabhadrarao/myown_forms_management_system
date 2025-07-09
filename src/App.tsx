import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Login } from './components/Login';
import { Register } from './components/Register';
import { Dashboard } from './components/Dashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { FormBuilder } from './components/FormBuilder';
import { FormView } from './components/FormView';
import { FormResponses } from './components/FormResponses';
import { QuizBuilder } from './components/QuizBuilder';
import { QuizTaker } from './components/QuizTaker';
import { PublicForms } from './components/PublicForms';
import { LoadingSpinner } from './components/LoadingSpinner';
import { Navigation } from './components/Navigation';

// Set up axios defaults
axios.defaults.baseURL = 'http://localhost:3001/api';

// Add token to requests
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  isApproved: boolean;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<string>('login');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
    handleRouting();
    
    // Listen for hash changes
    const handleHashChange = () => {
      handleRouting();
    };
    
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleRouting = () => {
    const hash = window.location.hash;
    console.log('Current hash:', hash);
    
    if (hash.startsWith('#/form/')) {
      const formId = hash.split('/')[2];
      if (formId) {
        setCurrentView(`form-view:${formId}`);
      }
    } else if (hash.startsWith('#/quiz/')) {
      const quizId = hash.split('/')[2];
      if (quizId) {
        setCurrentView(`quiz-take:${quizId}`);
      }
    } else if (hash.startsWith('#/responses/')) {
      const formId = hash.split('/')[2];
      if (formId) {
        setCurrentView(`form-responses:${formId}`);
      }
    }
  };

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const response = await axios.get('/auth/me');
        setUser(response.data.user);
        
        // Only set view if not already set by routing
        if (!window.location.hash) {
          if (response.data.user.role === 'admin') {
            setCurrentView('admin');
          } else if (response.data.user.isApproved) {
            setCurrentView('dashboard');
          } else {
            setCurrentView('waiting-approval');
          }
        }
      } else {
        // Only set view if not already set by routing
        if (!window.location.hash) {
          setCurrentView('public');
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('token');
      // Only set view if not already set by routing
      if (!window.location.hash) {
        setCurrentView('public');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (email: string, password: string) => {
    try {
      const response = await axios.post('/auth/login', { email, password });
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      setUser(user);
      
      // Clear hash and redirect to appropriate dashboard
      window.location.hash = '';
      
      if (user.role === 'admin') {
        setCurrentView('admin');
      } else if (user.isApproved) {
        setCurrentView('dashboard');
      } else {
        setCurrentView('waiting-approval');
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  };

  const handleRegister = async (email: string, password: string, name: string) => {
    try {
      await axios.post('/auth/register', { email, password, name });
      setCurrentView('registration-success');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Registration failed');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    window.location.hash = '';
    setCurrentView('public');
  };

  const handleViewChange = (view: string) => {
    // Clear hash when navigating to non-form/response/quiz views
    if (!view.startsWith('form-view:') && !view.startsWith('form-responses:') && !view.startsWith('quiz-take:')) {
      window.location.hash = '';
    }
    setCurrentView(view);
  };

  const handleBackFromForm = () => {
    window.location.hash = '';
    setCurrentView(user ? 'dashboard' : 'public');
  };

  const handleBackFromResponses = () => {
    window.location.hash = '';
    setCurrentView('dashboard');
  };

  const handleBackFromQuiz = () => {
    window.location.hash = '';
    setCurrentView(user ? 'dashboard' : 'public');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {user && (
        <Navigation 
          user={user} 
          currentView={currentView} 
          onViewChange={handleViewChange}
          onLogout={handleLogout}
        />
      )}
      
      <main className={user ? 'pt-16' : ''}>
        {currentView === 'login' && (
          <Login 
            onLogin={handleLogin} 
            onSwitchToRegister={() => setCurrentView('register')}
            onViewPublic={() => setCurrentView('public')}
          />
        )}
        
        {currentView === 'register' && (
          <Register 
            onRegister={handleRegister} 
            onSwitchToLogin={() => setCurrentView('login')}
          />
        )}
        
        {currentView === 'registration-success' && (
          <div className="min-h-screen flex items-center justify-center px-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Successful!</h2>
              <p className="text-gray-600 mb-6">
                Your account has been created. Please wait for admin approval before you can start creating forms.
              </p>
              <button
                onClick={() => setCurrentView('login')}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Go to Login
              </button>
            </div>
          </div>
        )}
        
        {currentView === 'waiting-approval' && (
          <div className="min-h-screen flex items-center justify-center px-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Account Pending Approval</h2>
              <p className="text-gray-600 mb-6">
                Your account is waiting for admin approval. You'll be able to create forms once approved.
              </p>
              <button
                onClick={handleLogout}
                className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        )}
        
        {currentView === 'public' && (
          <PublicForms onSwitchToLogin={() => setCurrentView('login')} />
        )}
        
        {currentView === 'dashboard' && user && (
          <Dashboard 
            user={user} 
            onViewChange={handleViewChange}
          />
        )}
        
        {currentView === 'admin' && user && (
          <AdminDashboard user={user} />
        )}
        
        {currentView === 'form-builder' && user && (
          <FormBuilder 
            user={user} 
            onBack={() => handleViewChange('dashboard')}
          />
        )}

        {currentView === 'quiz-builder' && user && (
          <QuizBuilder 
            user={user} 
            onBack={() => handleViewChange('dashboard')}
          />
        )}
        
        {currentView.startsWith('form-view:') && (
          <FormView 
            formId={currentView.split(':')[1]} 
            onBack={handleBackFromForm}
          />
        )}

        {currentView.startsWith('quiz-take:') && (
          <QuizTaker 
            quizId={currentView.split(':')[1]} 
            onBack={handleBackFromQuiz}
          />
        )}

        {currentView.startsWith('form-responses:') && user && (
          <FormResponses 
            formId={currentView.split(':')[1]} 
            onBack={handleBackFromResponses}
          />
        )}
      </main>
    </div>
  );
}

export default App;