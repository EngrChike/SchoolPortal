"use client";

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function UnifiedAdminLayout({ children }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const getLinkStyles = (targetPath) => {
    const baseStyles = "flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all border border-transparent cursor-pointer";
    const isActive = pathname === targetPath;

    return isActive
      ? `${baseStyles} bg-blue-600 text-white shadow-md shadow-blue-100`
      : `${baseStyles} text-slate-600 hover:bg-slate-50 hover:text-blue-600 hover:border-slate-100`;
  };

  return (
    <div className="min-h-screen bg-indigo-900 flex items-center justify-center p-2 sm:p-4 md:p-6 font-sans">
      {/* Floating Application Canvas Card Frame */}
      <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] w-full max-w-7xl h-[calc(100vh-1.5rem)] sm:h-[calc(100vh-3rem)] shadow-2xl overflow-hidden relative border-4 sm:border-8 border-indigo-950/20 flex flex-col">
        
        {/* Header Navigation Strip */}
        <header className="px-4 sm:px-8 py-4 sm:py-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 bg-white z-30 shrink-0">
          <div className="flex items-center justify-between w-full sm:w-auto gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0 relative bg-white border border-slate-100">
                <img 
                  src="/logo.png" 
                  alt="School Logo" 
                  className="w-full h-full object-contain" 
                />
              </div>
              <div className="min-w-0">
                <h1 className="text-xs sm:text-base font-black text-slate-800 tracking-tight uppercase truncate">
                  DON CHIKE INTERNATIONAL SCHOOL
                </h1>
                <span className="inline-block text-indigo-600 font-bold text-[10px] sm:text-xs mt-0.5 bg-indigo-50 px-2 py-0.5 rounded-md normal-case tracking-normal">
                  EduPortal Admin
                </span>
              </div>
            </div>

            {/* Mobile Menu Toggle Button */}
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors shrink-0"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? "✕" : "☰"}
            </button>
          </div>

          <div className="hidden sm:block">
            <span className="text-[10px] sm:text-xs bg-emerald-50 text-emerald-700 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full font-bold uppercase tracking-wider border border-emerald-100 whitespace-nowrap">
              System Administrator
            </span>
          </div>
        </header>

        {/* Master Content Workspace Frame Split */}
        <div className="flex flex-1 overflow-hidden relative">
          
          {/* Path-Aware Interactive Sidebar Control Panel (Responsive Drawer for Mobile) */}
          <aside className={`
            absolute md:relative inset-y-0 left-0 z-40
            w-64 bg-slate-50/95 md:bg-slate-50/50 border-r border-slate-100 p-5 
            flex flex-col justify-between overflow-y-auto transition-transform duration-300 ease-in-out
            ${mobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full md:translate-x-0"}
          `}>
            <div className="space-y-1">
              <div className="flex items-center justify-between mb-4 px-3 md:block">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Core Management</p>
                <div className="sm:hidden">
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md font-bold uppercase border border-emerald-100">
                    Admin
                  </span>
                </div>
              </div>
              
              <Link href="/admin-dashboard" onClick={() => setMobileMenuOpen(false)} className={getLinkStyles('/admin-dashboard')}>
                <span>📊</span> Dashboard Overview
              </Link>
              
              <Link href="/admin-dashboard/announcements" onClick={() => setMobileMenuOpen(false)} className={getLinkStyles('/admin-dashboard/announcements')}>
                <span>📢</span> Announcements
              </Link>
              
              <Link href="/manage-teachers" onClick={() => setMobileMenuOpen(false)} className={getLinkStyles('/manage-teachers')}>
                <span>👨‍🏫</span> Roster Faculty
              </Link>

              <Link href="/manage-students" onClick={() => setMobileMenuOpen(false)} className={getLinkStyles('/manage-students')}>
                <span>🧑‍🎓</span> Student Registry
              </Link>
            </div>

            <div className="border-t border-slate-100 pt-4 mt-4">
              <Link href="/" onClick={() => setMobileMenuOpen(false)} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-rose-600 hover:bg-rose-50 font-bold text-sm transition-all text-left">
                <span>🚪</span> Exit Workspace
              </Link>
            </div>
          </aside>

          {/* Backdrop overlay for mobile menu */}
          {mobileMenuOpen && (
            <div 
              onClick={() => setMobileMenuOpen(false)} 
              className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs z-30 md:hidden"
            />
          )}

          {/* Core Content Render Sheet */}
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