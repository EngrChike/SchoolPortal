"use client";

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function TeacherPortalLayout({ children }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Compute active vs inactive sidebar links dynamically
  const getLinkStyles = (targetPath) => {
    const baseStyles = "flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all border border-transparent cursor-pointer";
    const isActive = pathname === targetPath;

    return isActive
      ? `${baseStyles} bg-blue-600 text-white shadow-md shadow-blue-100` // Blue highlight when selected
      : `${baseStyles} text-slate-600 hover:bg-slate-50 hover:text-blue-600 hover:border-slate-100`;
  };

  return (
    <div className="min-h-screen bg-indigo-900 flex items-center justify-center p-2 sm:p-4 md:p-6 font-sans">
      {/* Floating Application Canvas Frame */}
      <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] w-full max-w-7xl h-[calc(100vh-1.5rem)] sm:h-[calc(100vh-3rem)] shadow-2xl overflow-hidden relative border-4 sm:border-8 border-indigo-950/20 flex flex-col">
        
        {/* Inside-Card Header Strip */}
        <header className="px-4 sm:px-8 py-4 sm:py-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 bg-white z-30 shrink-0">
          <div className="flex items-center justify-between w-full sm:w-auto gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-8 w-8 bg-emerald-500 rounded-lg flex items-center justify-center font-black text-white text-base shrink-0">
                E
              </div>
              <div className="min-w-0 flex items-center gap-2 flex-wrap">
                <span className="text-base sm:text-xl font-black text-slate-800 tracking-tight truncate">
                  EduPulse
                </span>
                <span className="text-indigo-600 font-medium text-[10px] sm:text-sm bg-indigo-50 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md whitespace-nowrap">
                  Teacher Portal
                </span>
              </div>
            </div>

            {/* Mobile Navigation Toggle Button */}
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors shrink-0"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? "✕" : "☰"}
            </button>
          </div>

          <div className="hidden sm:block">
            <span className="text-xs bg-blue-50 text-blue-700 px-4 py-2 rounded-full font-bold uppercase tracking-wider border border-blue-100 whitespace-nowrap">
              Faculty Member
            </span>
          </div>
        </header>

        {/* Workspace Body Split */}
        <div className="flex flex-1 overflow-hidden relative">
          
          {/* Sidebar Panel (Off-canvas drawer on Mobile, persistent on Desktop) */}
          <aside className={`
            absolute md:relative inset-y-0 left-0 z-40
            w-64 bg-slate-50/95 md:bg-slate-50/50 border-r border-slate-100 p-5 
            flex flex-col justify-between overflow-y-auto transition-transform duration-300 ease-in-out
            ${mobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full md:translate-x-0"}
          `}>
            <div className="space-y-1">
              <div className="flex items-center justify-between mb-4 px-3 md:block">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Instructor Options</p>
                <div className="sm:hidden">
                  <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-bold uppercase border border-blue-100">
                    Faculty
                  </span>
                </div>
              </div>
              
              <Link 
                href="/teacher-dashboard" 
                onClick={() => setMobileMenuOpen(false)} 
                className={getLinkStyles('/teacher-dashboard')}
              >
                <span>📊</span> Dashboard Overview
              </Link>

              <Link 
                href="/teacher-dashboard/student-data" 
                onClick={() => setMobileMenuOpen(false)} 
                className={getLinkStyles('/teacher-dashboard/student-data')}
              >
                <span>🧑‍🎓</span> Student Data
              </Link>
            </div>

            {/* Logout Action Anchor */}
            <div className="border-t border-slate-100 pt-4 mt-4">
              <Link 
                href="/" 
                onClick={() => setMobileMenuOpen(false)} 
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-rose-600 hover:bg-rose-50 font-bold text-sm transition-all text-left"
              >
                <span>🚪</span> Exit Portal
              </Link>
            </div>
          </aside>

          {/* Backdrop Overlay for Mobile Drawer */}
          {mobileMenuOpen && (
            <div 
              onClick={() => setMobileMenuOpen(false)} 
              className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs z-30 md:hidden"
            />
          )}

          {/* Main Content Render Sheet */}
          <main className="flex-1 bg-white p-4 sm:p-6 md:p-8 overflow-y-auto w-full">
            <div className="max-w-5xl mx-auto h-full">
              {children}
            </div>
          </main>
          
        </div>
      </div>
    </div>
  );
}