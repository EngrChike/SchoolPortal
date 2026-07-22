import Link from "next/link";

export default function StudentSystemLayout({ children }) {
  return (
    <div className="min-h-screen bg-indigo-900 flex items-center justify-center p-2 sm:p-4 md:p-6 font-sans">
      <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] w-full max-w-7xl h-[calc(100vh-1.5rem)] sm:h-[calc(100vh-3rem)] shadow-2xl overflow-hidden relative border-4 sm:border-8 border-indigo-950/20 flex flex-col">
        
        {/* Header Navigation Ribbon */}
        <header className="px-4 sm:px-8 py-4 sm:py-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 bg-white shrink-0">
          <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto justify-between sm:justify-start">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-8 w-8 bg-emerald-500 rounded-lg flex items-center justify-center font-black text-white text-base shrink-0 shadow-sm">
                E
              </div>
              <div className="min-w-0 flex items-center gap-2 flex-wrap">
                <span className="text-base sm:text-xl font-black text-slate-800 tracking-tight truncate">
                  EduPulse
                </span>
                <span className="text-emerald-600 font-bold text-[10px] sm:text-xs bg-emerald-50 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md whitespace-nowrap">
                  Student Node
                </span>
              </div>
            </div>
            
            {/* Mobile Logout (inline for tiny screens) */}
            <Link href="/" className="sm:hidden text-[11px] font-bold text-rose-600 bg-rose-50 px-3 py-1.5 rounded-xl shrink-0">
              Logout
            </Link>
          </div>

          {/* Desktop Logout Button */}
          <div className="hidden sm:block">
            <Link href="/" className="text-xs font-bold text-rose-600 bg-rose-50 px-4 py-2 rounded-xl hover:bg-rose-100 transition-colors cursor-pointer border border-rose-100">
              Logout Portal
            </Link>
          </div>
        </header>

        {/* Dynamic Main Workspace Sheet Component */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-slate-50/50 w-full">
          <div className="max-w-6xl mx-auto h-full">
            {children}
          </div>
        </div>

      </div>
    </div>
  );
}