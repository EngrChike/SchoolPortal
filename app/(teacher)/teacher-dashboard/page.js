"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

export default function TeacherDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("attendance");
  const [teacherEmail, setTeacherEmail] = useState("");
  const [teacherProfile, setTeacherProfile] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Attendance & History States
  const [selectedClass, setSelectedClass] = useState("");
  const [academicSession, setAcademicSession] = useState("2025/2026");
  const [term, setTerm] = useState("First Term");
  const [students, setStudents] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const email = localStorage.getItem("active_teacher_email");
    if (!email) { router.push("/login"); return; }
    setTeacherEmail(email);
    loadTeacherProfile(email);
  }, []);

  async function loadTeacherProfile(email) {
    const { data } = await supabase.from("teachers").select("*").eq("email", email).maybeSingle();
    setTeacherProfile(data);
    if (data?.assigned_classes?.length > 0) setSelectedClass(data.assigned_classes[0]);
  }

  useEffect(() => {
    if (selectedClass) {
      async function fetchStudents() {
        const { data } = await supabase
          .from("students")
          .select("id, name, passport_url")
          .eq("class_level", selectedClass);
        
        const list = data || [];
        setStudents(list);
        const initial = {};
        list.forEach(s => initial[s.id] = "Present");
        setAttendanceRecords(initial);
      }
      fetchStudents();
    }
  }, [selectedClass]);

  async function fetchHistory() {
    const { data } = await supabase
      .from("attendance_sessions")
      .select("*, attendance_records(status, students(name))")
      .order("created_at", { ascending: false });
    setHistory(data || []);
    setShowHistory(true);
  }

  const toggleStatus = (id) => {
    setAttendanceRecords(prev => ({ ...prev, [id]: prev[id] === "Present" ? "Absent" : "Present" }));
  };

  const saveAttendance = async () => {
    setIsSaving(true);
    try {
      const { data: session } = await supabase.from("attendance_sessions").insert({
        class_level: selectedClass, academic_session: academicSession, term: term, date: new Date().toISOString(), taken_by: teacherEmail
      }).select().single();
      
      await supabase.from("attendance_records").insert(students.map(s => ({
        session_id: session.id, student_id: s.id, status: attendanceRecords[s.id]
      })));
      alert("Attendance archived successfully!");
      fetchHistory();
    } catch (err) { alert(err.message); }
    finally { setIsSaving(false); }
  };

  const handleLogout = () => { localStorage.removeItem("active_teacher_email"); router.push("/login"); };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      
      {/* Mobile Header Bar */}
      <div className="lg:hidden bg-slate-900 text-white p-4 flex justify-between items-center shadow-md">
        <h1 className="font-black text-base">Faculty Portal</h1>
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
          className="bg-slate-800 p-2 rounded-xl text-xs font-bold focus:outline-none"
        >
          {mobileMenuOpen ? "✕ Close Menu" : "☰ Menu"}
        </button>
      </div>

      {/* Sidebar / Navigation Menu */}
      <aside className={`w-full lg:w-64 bg-slate-900 text-white p-6 flex-shrink-0 ${mobileMenuOpen ? "block" : "hidden lg:block"}`}>
        <h1 className="font-black text-lg mb-8 hidden lg:block">Faculty Portal</h1>
        <nav className="space-y-4">
          <button 
            onClick={() => { setActiveTab("attendance"); setShowHistory(false); setMobileMenuOpen(false); }} 
            className={`block font-bold text-sm w-full text-left py-2 ${activeTab === "attendance" && !showHistory ? "text-indigo-400" : "text-slate-300 hover:text-white"}`}
          >
            📝 Attendance & Roster
          </button>
          <button 
            onClick={() => { setActiveTab("profile"); setShowHistory(false); setMobileMenuOpen(false); }} 
            className={`block font-bold text-sm w-full text-left py-2 ${activeTab === "profile" ? "text-indigo-400" : "text-slate-300 hover:text-white"}`}
          >
            👤 Instructor Profile
          </button>
          <button 
            onClick={handleLogout} 
            className="mt-10 text-xs text-rose-400 font-bold block w-full text-left py-2"
          >
            LOGOUT
          </button>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-8 overflow-y-auto">
        {activeTab === "attendance" && !showHistory && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-xl font-black text-slate-800">Class Attendance Registry</h2>
              <button onClick={fetchHistory} className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all w-full sm:w-auto shadow-sm">
                View Archive History
              </button>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm items-stretch sm:items-center">
              <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="p-2.5 border border-slate-200 rounded-xl text-sm font-bold bg-slate-50 outline-none">
                {teacherProfile?.assigned_classes?.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input value={academicSession} onChange={(e) => setAcademicSession(e.target.value)} className="p-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 outline-none font-medium" placeholder="Session"/>
              <select value={term} onChange={(e) => setTerm(e.target.value)} className="p-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 outline-none font-medium">
                <option>First Term</option><option>Second Term</option><option>Third Term</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {students.map(student => (
                <div key={student.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <img src={student.passport_url || "/avatar.png"} className="w-10 h-10 rounded-full object-cover border flex-shrink-0" />
                    <p className="font-bold text-sm text-slate-800 truncate">{student.name}</p>
                  </div>
                  <button onClick={() => toggleStatus(student.id)} className={`w-10 h-10 rounded-xl text-white font-black flex items-center justify-center flex-shrink-0 shadow-sm transition-all ${attendanceRecords[student.id] === "Present" ? "bg-emerald-500 hover:bg-emerald-600" : "bg-rose-500 hover:bg-rose-600"}`}>
                    {attendanceRecords[student.id] === "Present" ? "✔" : "✘"}
                  </button>
                </div>
              ))}
            </div>

            <button onClick={saveAttendance} disabled={isSaving} className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3.5 rounded-xl font-bold text-sm shadow-md shadow-indigo-100 transition-all cursor-pointer">
              {isSaving ? "Archiving..." : "💾 File Session Records"}
            </button>
          </div>
        )}

        {showHistory && (
          <div className="space-y-6">
            <button onClick={() => setShowHistory(false)} className="text-xs font-bold text-indigo-600 hover:underline">← BACK TO ROSTER</button>
            <h2 className="text-lg font-black text-slate-800">Attendance History Archive</h2>
            <div className="space-y-4">
              {history.map(s => (
                <div key={s.id} className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="font-bold text-sm text-slate-800 border-b border-slate-100 pb-2 mb-3">{s.term} ({s.academic_session}) - {new Date(s.date).toLocaleDateString()}</p>
                  <div className="flex flex-wrap gap-2">
                    {s.attendance_records.map((r, i) => (
                      <span key={i} className={`text-[10px] font-medium px-2.5 py-1 rounded-lg border ${r.status === 'Present' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
                        {r.students?.name}: <strong className="font-bold">{r.status}</strong>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "profile" && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm max-w-lg">
            <h2 className="text-lg font-black text-slate-800 mb-6">Instructor Profile</h2>
            {teacherProfile && (
              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-3"><span className="text-slate-400 text-xs font-medium uppercase tracking-wider">Name</span><p className="font-bold text-slate-800 text-base">{teacherProfile.name}</p></div>
                <div className="border-b border-slate-100 pb-3"><span className="text-slate-400 text-xs font-medium uppercase tracking-wider">Assigned Subject</span><p className="font-bold text-slate-800 uppercase text-base">{teacherProfile.subject || teacherProfile.specialization || teacherProfile.course || "Not assigned"}</p></div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}