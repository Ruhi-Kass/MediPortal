import React from 'react';
import { Activity, LogOut, User as UserIcon, ShieldAlert, Settings } from 'lucide-react';
import { User, UserRole } from '../types';

interface NavbarProps {
  user: User | null;
  activeRole?: UserRole | null;
  onLogout: () => void;
  onSwitchRole?: (role: UserRole) => void;
}

const Navbar: React.FC<NavbarProps> = ({ user, activeRole, onLogout, onSwitchRole }) => {
  const currentView = activeRole ?? user?.role;

  return (
    <nav className="fixed top-0 left-0 right-0 bg-white/70 backdrop-blur-md shadow-sm z-50 border-b border-white/50 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 group cursor-pointer flex-shrink-0">
          <div className="w-8 h-8 md:w-10 md:h-10 gradient-blue rounded-lg md:rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-blue-900/10">
            <Activity className="text-white w-5 h-5 md:w-6 md:h-6" />
          </div>
          <span className="text-lg md:text-xl font-black tracking-tight text-royal-blue hidden sm:block">
            MediPortal
          </span>
        </div>

        {user && (
          <div className="flex items-center gap-2 md:gap-6 ml-2 overflow-x-auto no-scrollbar">
            <div className="flex items-center p-1 bg-slate-100 rounded-lg md:rounded-2xl border border-slate-200 shadow-inner flex-shrink-0">

              {/* Patient */}
                {(user.role === UserRole.ADMIN || user.role === UserRole.PATIENT) && (

              <button 
                onClick={() => onSwitchRole?.(UserRole.PATIENT)}
                disabled={!onSwitchRole}
                className={`flex items-center gap-1.5 px-2 md:px-4 py-1 md:py-2 rounded-md md:rounded-xl text-[9px] md:text-xs font-black uppercase tracking-widest transition-all
                  ${currentView === UserRole.PATIENT 
                    ? 'bg-white text-royal-blue shadow-sm' 
                    : 'text-slate-400 hover:text-slate-600'}
                `}
              >
                <UserIcon className="w-3 h-3 md:w-4 md:h-4" />
                <span className="hidden sm:inline">Patient</span>
              </button>
                )}
              {/* Doctor / Staff */}
             
               {(user.role === UserRole.ADMIN || user.role === UserRole.DOCTOR) && (
 <button 
                onClick={() => onSwitchRole?.(UserRole.DOCTOR)}
                disabled={!onSwitchRole}
                className={`flex items-center gap-1.5 px-2 md:px-4 py-1 md:py-2 rounded-md md:rounded-xl text-[9px] md:text-xs font-black uppercase tracking-widest transition-all
                  ${currentView === UserRole.DOCTOR 
                    ? 'bg-white text-royal-blue shadow-sm' 
                    : 'text-slate-400 hover:text-slate-600'}
                `}
              >
                <ShieldAlert className="w-3 h-3 md:w-4 md:h-4" />
                <span className="hidden sm:inline">Staff</span>
              </button>)}

              {/* Admin */}
                {user.role === UserRole.ADMIN && (

              <button 
                onClick={() => onSwitchRole?.(UserRole.ADMIN)}
                disabled={!onSwitchRole}
                className={`flex items-center gap-1.5 px-2 md:px-4 py-1 md:py-2 rounded-md md:rounded-xl text-[9px] md:text-xs font-black uppercase tracking-widest transition-all
                  ${currentView === UserRole.ADMIN 
                    ? 'bg-white text-royal-blue shadow-sm' 
                    : 'text-slate-400 hover:text-slate-600'}
                `}
              >
                <Settings className="w-3 h-3 md:w-4 md:h-4" />
                <span className="hidden sm:inline">Admin</span>
              </button>
                )}
            </div>

            <div className="h-6 md:h-8 w-[1px] bg-slate-200 mx-1 flex-shrink-0 hidden sm:block" />

            <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
              <div className="hidden lg:flex flex-col items-end">
                <span className="text-sm font-black text-slate-900 tracking-tight leading-none">
                  {user.name}
                </span>
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-black mt-1">
                  {user.role === UserRole.PATIENT
                    ? 'Verified Patient'
                    : user.role === UserRole.DOCTOR
                    ? 'Medical Staff'
                    : 'System Admin'}
                </span>
              </div>

              <button 
                onClick={onLogout}
                className="p-2 md:p-2.5 hover:bg-red-50 text-slate-300 hover:text-red-500 rounded-lg md:rounded-xl transition-all duration-200 border border-transparent hover:border-red-100"
                title="Logout"
              >
                <LogOut className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;