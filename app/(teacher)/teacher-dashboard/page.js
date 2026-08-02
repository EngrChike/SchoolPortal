"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

// 📝 DICTIONARY: Map database abbreviations to Full Course Names
const subjectNamesMap = {
  // Primary Subjects
  "ENG-PRI": "English Studies",
  "MTH-PRI": "Mathematics",
  "BST-PRI": "Basic Science and Technology",
  "PHE-PRI": "Physical and Health Education",
  "CCA-PRI": "Cultural and Creative Arts",
  "CRS-PRI": "Christian Religious Studies",
  "IRS-PRI": "Islamic Religious Studies",
  "SOS-PRI": "Social Studies",
  "GAR-PRI": "Agricultural Science",

  // Secondary Subjects
  "MTH-SEC": "Mathematics (JSS - SS)",
  "ENG-SEC": "English Language (JSS - SS)",
  "BIO-SEC": "Biology (JSS Basic Science / SS Bio)",
  "CHM-SEC": "Chemistry",
  "PHY-SEC": "Physics",
  "ECO-SEC": "Economics",
  "GOV-SEC": "Government",
  "CRS-SEC": "Christian Religious Studies",
  "AGR-SEC": "Agricultural Science",
  "ACC-SEC": "Financial Accounting",
  "GEO-SEC": "Geography",
  "LIT-SEC": "Literature-in-English",
  "CMP-SEC": "Computer Studies / ICT",
  "BUS-SEC": "Business Studies (JSS)",
  "BAS-SEC": "Basic Science (JSS)",
  "SST-SEC": "Social Studies / Civics (JSS)"
};

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

  // 🔍 HELPER: Get the raw database abbreviation (e.g., "MTH-SEC") for backend queries
  const getRawSubjectCode = () => {
    if (!teacherProfile) return "";
    return teacherProfile.subject_specialization || (teacherProfile.assigned_subjects ? teacherProfile.assigned_subjects[0] : "");
  };

  // 📖 HELPER: Get the beautiful full name for the UI
  const getFullSubjectName = () => {
    const rawCode = getRawSubjectCode();
    return subjectNamesMap[rawCode] || rawCode || "Unassigned";
  };

  useEffect(() => {
    const email = localStorage.getItem("active_teacher_email");
    if (!email) { router.push("/login"); return; }
    setTeacherEmail(email);
    loadTeacherProfile(email);
  }, []);

  async function loadTeacherProfile(email) {
    const { data, error } = await supabase.from("teachers").select("*").eq("email", email).maybeSingle();
    
    if (error) {
      console.error("Error fetching teacher:", error);
      return;
    }
    
    setTeacherProfile(data);
    if (data?.assigned_classes?.length > 0) setSelectedClass(data.assigned_classes[0]);
  }

  // Fetch Students offering this specific subject
  useEffect(() => {
    if (selectedClass && teacherProfile) {
      async function fetchStudents() {
        const rawSubject = getRawSubjectCode();
        
        let query = supabase
          .from("students")
          .select("id, name, passport_url")
          .eq("class_level", selectedClass);

        // FILTER: Only fetch students that offer this subject. 
        if (rawSubject) {
          query = query.contains("offered_subjects", [rawSubject]);
        }
        
        const { data, error } = await query;
        if (error) {
          console.error("Error fetching students:", error);
          return;
        }

        const list = data || [];
        setStudents(list);
        
        const initial = {};
        list.forEach(s => initial[s.id] = "Present");
        setAttendanceRecords(initial);
      }
      fetchStudents();
    }
  }, [selectedClass, teacherProfile]);

  async function fetchHistory() {
    const rawSubject = getRawSubjectCode();
    
    const { data, error } = await supabase
      .from("attendance_sessions")
      .select("*, attendance_records(status, students(name))")
      .eq("class_level", selectedClass)
      .eq("subject", rawSubject) // Queries using the raw code
      .order("created_at", { ascending: false });
      
    if (error) {
      alert("Error loading history: " + error.message);
      console.error(error);
      return;
    }

    setHistory(data || []);
    setShowHistory(true);
  }

  const toggleStatus = (id) => {
    setAttendanceRecords(prev => ({ ...prev, [id]: prev[id] === "Present" ? "Absent" : "Present" }));
  };

  const saveAttendance = async () => {
    setIsSaving(true);
    const rawSubject = getRawSubjectCode();

    try {
      // 1. Insert session with the specific subject included
      const { data: session, error: sessionError } = await supabase.from("attendance_sessions").insert({
        class_level: selectedClass, 
        subject: rawSubject, 
        academic_session: academicSession, 
        term: term, 
        date: new Date().toISOString(), 
        taken_by: teacherEmail
      }).select().single();
      
      if (sessionError) throw sessionError;
      
      // 2. Insert records for this session
      const { error: recordsError } = await supabase.from("attendance_records").insert(students.map(s => ({
        session_id: session.id, 
        student_id: s.id, 
        status: attendanceRecords[s.id]
      })));

      if (recordsError) throw recordsError;

      alert(`✅ Attendance for ${getFullSubjectName()} (${selectedClass}) archived successfully!`);
      fetchHistory();
    } catch (err) { 
      alert("Error saving attendance: " + err.message); 
      console.error(err);
    } finally { 
      setIsSaving(false); 
    }
  };

  const handleLogout = () => { localStorage.removeItem("active_teacher_email"); router.push("/login"); };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row font-sans">
      
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
        
        {/* Persistent Teacher Information Header */}
        {teacherProfile && (
          <div className="bg-indigo-600 text-white p-6 sm:p-8 rounded-3xl mb-8 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <p className="text-indigo-200 text-xs font-bold uppercase tracking-wider mb-1">Active Instructor</p>
              <h2 className="text-2xl font-black">{teacherProfile.name}</h2>
            </div>
            <div className="flex flex-col sm:items-end bg-indigo-700/50 p-4 rounded-2xl">
              <p className="text-sm font-medium"><span className="text-indigo-200">Course Handling:</span> <strong className="uppercase">{getFullSubjectName()}</strong></p>
              <p className="text-sm font-medium mt-1"><span className="text-indigo-200">Active Level:</span> <strong className="uppercase">{selectedClass || "N/A"}</strong></p>
            </div>
          </div>
        )}

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

            {students.length === 0 ? (
               <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-500 font-medium">
                 No students found offering <strong className="text-slate-800">{getFullSubjectName()}</strong> in <strong className="text-slate-800">{selectedClass}</strong>.
               </div>
            ) : (
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
            )}

            {students.length > 0 && (
              <button onClick={saveAttendance} disabled={isSaving} className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3.5 rounded-xl font-bold text-sm shadow-md shadow-indigo-100 transition-all cursor-pointer mt-4">
                {isSaving ? "Archiving..." : "💾 File Session Records"}
              </button>
            )}
          </div>
        )}

        {showHistory && (
          <div className="space-y-6">
            <button onClick={() => setShowHistory(false)} className="text-xs font-bold text-indigo-600 hover:underline">← BACK TO ROSTER</button>
            <h2 className="text-lg font-black text-slate-800">Attendance History Archive ({getFullSubjectName()})</h2>
            <div className="space-y-4">
              {history.length === 0 ? (
                <p className="text-slate-500 text-sm">No recorded sessions found for this subject.</p>
              ) : (
                history.map(s => (
                  <div key={s.id} className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <p className="font-bold text-sm text-slate-800 border-b border-slate-100 pb-2 mb-3">
                      {s.term} ({s.academic_session}) - {new Date(s.date).toLocaleDateString()} 
                      <span className="ml-2 text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md text-xs">{subjectNamesMap[s.subject] || s.subject}</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {s.attendance_records.map((r, i) => (
                        <span key={i} className={`text-[10px] font-medium px-2.5 py-1 rounded-lg border ${r.status === 'Present' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
                          {r.students?.name}: <strong className="font-bold">{r.status}</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === "profile" && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm max-w-lg">
            <h2 className="text-lg font-black text-slate-800 mb-6">Instructor Profile</h2>
            {teacherProfile && (
              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">Full Name</span>
                  <p className="font-bold text-slate-800 text-base">{teacherProfile.name}</p>
                </div>
                
                {/* 📞 Phone Number Display */}
                <div className="border-b border-slate-100 pb-3">
                  <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">Phone Number</span>
                  <p className="font-bold text-slate-800 text-base">{teacherProfile.phone || "Not Provided"}</p>
                </div>

                <div className="border-b border-slate-100 pb-3">
                  <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">Assigned Subject / Course</span>
                  <p className="font-bold text-slate-800 uppercase text-base">{getFullSubjectName()}</p>
                </div>
                <div className="border-b border-slate-100 pb-3">
                  <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">Assigned Class Levels</span>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    {teacherProfile.assigned_classes?.length > 0 ? (
                      teacherProfile.assigned_classes.map(cls => (
                        <span key={cls} className="bg-slate-100 text-slate-700 px-3 py-1 rounded-lg text-sm font-bold uppercase">{cls}</span>
                      ))
                    ) : (
                      <p className="font-bold text-slate-800 text-base">None</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}