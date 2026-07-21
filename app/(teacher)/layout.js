"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function TeacherPortalLayout({ children }) {
  // Catch the active sub-routes inside the teacher module
  const pathname = usePathname();

  // Compute active vs inactive sidebar links dynamically
  const getLinkStyles = (targetPath) => {
    const baseStyles = "flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all border border-transparent cursor-pointer";
    const isActive = pathname === targetPath;

    return isActive
      ? `${baseStyles} bg-blue-600 text-white shadow-md shadow-blue-100` // Blue highlight when selected
      : `${baseStyles} text-slate-600 hover:bg-slate-50 hover:text-blue-600 hover:border-slate-100`;
  };

  return (
    <div className="min-h-screen bg-indigo-900 flex items-center justify-center p-3 md:p-6 font-sans">
      {/* Floating Application Canvas Frame */}
      <div className="bg-white rounded-[2.5rem] w-full max-w-7xl h-[calc(100vh-3rem)] shadow-2xl overflow-hidden relative border-8 border-indigo-950/20 flex flex-col">
        
        {/* Inside-Card Header Strip */}
        <header className="px-8 py-5 flex justify-between items-center border-b border-slate-100 bg-white z-30">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-emerald-500 rounded-lg flex items-center justify-center font-black text-white text-base">E</div>
            <span className="text-xl font-black text-slate-800 tracking-tight">
              EduPulse <span className="text-indigo-600 font-medium text-sm ml-1 bg-indigo-50 px-2.5 py-1 rounded-md">Teacher Portal</span>
            </span>
          </div>
          <div>
            <span className="text-xs bg-blue-50 text-blue-700 px-4 py-2 rounded-full font-bold uppercase tracking-wider border border-blue-100">
              Faculty Member
            </span>
          </div>
        </header>

        {/* Workspace Body Split */}
        <div className="flex flex-1 overflow-hidden relative">
          
          {/* Sidebar Panel */}
          <aside className="w-64 bg-slate-50/50 border-r border-slate-100 p-5 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-1">
              <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Instructor Options</p>
              
              <Link href="/teacher-dashboard" className={getLinkStyles('/teacher-dashboard')}>
                <span>📊</span> Dashboard Overview
              </Link>

              {/* Added Student Data Interactive Navigation Button */}
              <Link href="/teacher-dashboard/student-data" className={getLinkStyles('/teacher-dashboard/student-data')}>
                <span>🧑‍🎓</span> Student Data
              </Link>
            </div>

            {/* Logout Action Anchor */}
            <div className="border-t border-slate-100 pt-4">
              <Link href="/" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-rose-600 hover:bg-rose-50 font-bold text-sm transition-all text-left">
                <span>🚪</span> Exit Portal
              </Link>
            </div>
          </aside>

          {/* Main Content Render Sheet */}
          <main className="flex-1 bg-white p-6 md:p-8 overflow-y-auto">
            <div className="max-w-5xl mx-auto h-full">
              {children}
            </div>
          </main>
          
        </div>
      </div>
    </div>
  );
}