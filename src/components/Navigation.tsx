import React from 'react';
import { User, Settings, LogOut, Home, Users, FileText, BarChart3 } from 'lucide-react';

interface NavigationProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    isApproved: boolean;
  };
  currentView: string;
  onViewChange: (view: string) => void;
  onLogout: () => void;
}

export function Navigation({ user, currentView, onViewChange, onLogout }: NavigationProps) {
  const isAdmin = user.role === 'admin';
  const isApproved = user.isApproved;

  return (
    <nav className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md border-b border-gray-200 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <div className="flex-shrink-0">
              <h1 className="text-xl font-bold text-gray-900">FormsCraft</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {isAdmin ? (
                <>
                  <NavButton
                    icon={<Home className="w-4 h-4" />}
                    label="Dashboard"
                    isActive={currentView === 'admin'}
                    onClick={() => onViewChange('admin')}
                  />
                  <NavButton
                    icon={<Users className="w-4 h-4" />}
                    label="Users"
                    isActive={currentView === 'admin-users'}
                    onClick={() => onViewChange('admin-users')}
                  />
                </>
              ) : (
                <>
                  <NavButton
                    icon={<Home className="w-4 h-4" />}
                    label="Dashboard"
                    isActive={currentView === 'dashboard'}
                    onClick={() => onViewChange('dashboard')}
                    disabled={!isApproved}
                  />
                  <NavButton
                    icon={<FileText className="w-4 h-4" />}
                    label="Create Form"
                    isActive={currentView === 'form-builder'}
                    onClick={() => onViewChange('form-builder')}
                    disabled={!isApproved}
                  />
                  <NavButton
                    icon={<BarChart3 className="w-4 h-4" />}
                    label="Browse Forms"
                    isActive={currentView === 'public'}
                    onClick={() => onViewChange('public')}
                  />
                </>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="text-sm">
                <div className="font-medium text-gray-900">{user.name}</div>
                <div className="text-gray-500 text-xs">
                  {isAdmin ? 'Admin' : isApproved ? 'Approved' : 'Pending'}
                </div>
              </div>
            </div>

            <button
              onClick={onLogout}
              className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

interface NavButtonProps {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
  disabled?: boolean;
}

function NavButton({ icon, label, isActive, onClick, disabled }: NavButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        isActive
          ? 'bg-blue-100 text-blue-700'
          : disabled
          ? 'text-gray-400 cursor-not-allowed'
          : 'text-gray-700 hover:bg-gray-100'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}