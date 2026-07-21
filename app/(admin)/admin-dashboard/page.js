export default function AdminDashboard({ 
  schoolName = "DON CHIKE INTERNATIONAL SCHOOL", 
  motto = "Skill is the catalyst of the future" 
}) {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center text-center bg-slate-50 font-sans py-4">
      
      {/* Welcome Message */}
      <h1 className="text-3xl font-black text-blue-600 mb-4 tracking-tight uppercase">
        Welcome to {schoolName}
      </h1>

      {/* Big School Logo Container - Pulling directly from public folder */}
      <div className="my-4 flex items-center justify-center">
        <img 
          src="/logo.png" 
          alt={`${schoolName} Logo`} 
          className="w-44 h-44 object-contain rounded-2xl shadow-xl border-4 border-white bg-white p-3 transition-transform hover:scale-105 duration-300" 
        />
      </div>

      {/* Beautiful Custom Stylized Motto */}
      <div className="mt-2 max-w-xl mx-auto px-8 py-2 relative">
        {/* Decorative Quote Accents */}
        <span className="absolute top-0 left-2 text-4xl text-blue-200 font-serif leading-none select-none">“</span>
        
        <p className="font-serif italic text-xl text-slate-700 font-medium tracking-wide leading-relaxed px-4">
          {motto}
        </p>
        
        <span className="absolute bottom-0 right-2 text-4xl text-blue-200 font-serif leading-none select-none">”</span>
        
        {/* Elegant structural separator lines */}
        <div className="w-20 h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent mx-auto mt-3"></div>
      </div>
      
    </div>
  );
}