"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function UnifiedAdminLayout({ children }) {
  // Grab the current active URL path from the browser
  const pathname = usePathname();

  // Helper function to compute active vs inactive navigation styles
  const getLinkStyles = (targetPath) => {
    const baseStyles = "flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all border border-transparent cursor-pointer";
    
    // Exact match comparison logic
    const isActive = pathname === targetPath;

    return isActive
      ? `${baseStyles} bg-blue-600 text-white shadow-md shadow-blue-100` // Highlighted Blue State
      : `${baseStyles} text-slate-600 hover:bg-slate-50 hover:text-blue-600 hover:border-slate-100`; // Default State
  };

  return (
    <div className="min-h-screen bg-indigo-900 flex items-center justify-center p-3 md:p-6 font-sans">
      {/* Floating Application Canvas Card Frame */}
      <div className="bg-white rounded-[2.5rem] w-full max-w-7xl h-[calc(100vh-3rem)] shadow-2xl overflow-hidden relative border-8 border-indigo-950/20 flex flex-col">
        
        {/* Header Navigation Strip */}
        <header className="px-8 py-5 flex justify-between items-center border-b border-slate-100 bg-white z-30">
          <div className="flex items-center gap-3">
            {/* Preserved logo image engine mapping to core framework path */}
            <div className="h-9 w-9 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0 relative bg-white">
              <img 
                src="/logo.png" 
                alt="School Logo" 
                className="w-full h-full object-contain max-h-full max-w-full" 
              />
            </div>
            {/* Main Institutional Identity Node Text */}
            <span className="text-lg font-black text-slate-800 tracking-tight uppercase">
              DON CHIKE INTERNATIONAL SCHOOL 
              <span className="text-indigo-600 font-bold text-xs ml-2 bg-indigo-50 px-2.5 py-1 rounded-md normal-case tracking-normal">
                EduPortal Admin
              </span>
            </span>
          </div>
          <div>
            <span className="text-xs bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full font-bold uppercase tracking-wider border border-emerald-100">
              System Administrator
            </span>
          </div>
        </header>

        {/* Master Content Workspace Frame Split */}
        <div className="flex flex-1 overflow-hidden relative">
          
          {/* Path-Aware Interactive Sidebar Control Panel */}
          <aside className="w-64 bg-slate-50/50 border-r border-slate-100 p-5 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-1">
              <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Core Management</p>
              
              {/* Dashboard Link Node */}
              <Link href="/admin-dashboard" className={getLinkStyles('/admin-dashboard')}>
                <span>📊</span> Dashboard Overview
              </Link>
              
              {/* New Announcement Link Node */}
              <Link href="/admin-dashboard/announcements" className={getLinkStyles('/admin-dashboard/announcements')}>
                <span>📢</span> Announcements
              </Link>
              
              {/* Faculty Link Node */}
              <Link href="/manage-teachers" className={getLinkStyles('/manage-teachers')}>
                <span>👨‍🏫</span> Roster Faculty
              </Link>

              {/* Student Link Node Fixed */}
              <Link href="/manage-students" className={getLinkStyles('/manage-students')}>
                <span>🧑‍🎓</span> Student Registry
              </Link>
            </div>

            {/* Bottom Actions Block */}
            <div className="border-t border-slate-100 pt-4">
              <Link href="/" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-rose-600 hover:bg-rose-50 font-bold text-sm transition-all text-left">
                <span>🚪</span> Exit Workspace
              </Link>
            </div>
          </aside>

          {/* Core Content Render Sheet */}
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