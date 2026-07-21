import Link from "next/link";

export default function StudentSystemLayout({ children }) {
  return (
    <div className="min-h-screen bg-indigo-900 flex items-center justify-center p-3 md:p-6 font-sans">
      <div className="bg-white rounded-[2.5rem] w-full max-w-7xl h-[calc(100vh-3rem)] shadow-2xl overflow-hidden relative border-8 border-indigo-950/20 flex flex-col">
        
        {/* Header Navigation Ribbon */}
        <header className="px-8 py-5 flex justify-between items-center border-b border-slate-100 bg-white">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-emerald-500 rounded-lg flex items-center justify-center font-black text-white text-base">E</div>
            <span className="text-xl font-black text-slate-800 tracking-tight">
              EduPulse <span className="text-emerald-600 font-medium text-sm ml-1 bg-emerald-50 px-2.5 py-1 rounded-md">Student Node</span>
            </span>
          </div>
          <Link href="/" className="text-xs font-bold text-rose-600 bg-rose-50 px-4 py-2 rounded-xl cursor-pointer">
            Logout Portal
          </Link>
        </header>

        {/* Dynamic Main Workspace Sheet Component */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50/50">
          {children}
        </div>

      </div>
    </div>
  );
}