"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

export default function TeacherDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("attendance");
  const [teacherEmail, setTeacherEmail] = useState("");
  const [teacherProfile, setTeacherProfile] = useState(null);
  
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
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="w-64 bg-slate-900 text-white p-6">
        <h1 className="font-black text-lg mb-8">Faculty Portal</h1>
        <nav className="space-y-4">
          <button onClick={() => { setActiveTab("attendance"); setShowHistory(false); }} className="block font-bold text-indigo-400">📝 Attendance & Roster</button>
          <button onClick={() => { setActiveTab("profile"); setShowHistory(false); }} className="block font-bold hover:text-indigo-400">👤 Instructor Profile</button>
          <button onClick={handleLogout} className="mt-10 text-xs text-rose-400 font-bold">LOGOUT</button>
        </nav>
      </aside>

      <main className="flex-1 p-8">
        {activeTab === "attendance" && !showHistory && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-black">Class Attendance Registry</h2>
              <button onClick={fetchHistory} className="bg-slate-800 text-white px-4 py-2 rounded-lg text-xs font-bold">View Archive History</button>
            </div>
            
            <div className="flex gap-4 bg-white p-4 rounded-2xl border items-center">
              <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="p-2 border rounded text-sm font-bold">
                {teacherProfile?.assigned_classes?.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input value={academicSession} onChange={(e) => setAcademicSession(e.target.value)} className="p-2 border rounded text-sm" placeholder="Session"/>
              <select value={term} onChange={(e) => setTerm(e.target.value)} className="p-2 border rounded text-sm">
                <option>First Term</option><option>Second Term</option><option>Third Term</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {students.map(student => (
                <div key={student.id} className="bg-white p-4 rounded-xl border flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={student.passport_url || "/avatar.png"} className="w-10 h-10 rounded-full object-cover border" />
                    <p className="font-bold text-sm">{student.name}</p>
                  </div>
                  <button onClick={() => toggleStatus(student.id)} className={`w-10 h-10 rounded-full text-white font-black ${attendanceRecords[student.id] === "Present" ? "bg-green-500" : "bg-red-500"}`}>
                    {attendanceRecords[student.id] === "Present" ? "✔" : "✘"}
                  </button>
                </div>
              ))}
            </div>

            <button onClick={saveAttendance} disabled={isSaving} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold">
              {isSaving ? "Archiving..." : "💾 File Session Records"}
            </button>
          </div>
        )}

        {showHistory && (
          <div className="space-y-6">
            <button onClick={() => setShowHistory(false)} className="text-xs font-bold text-indigo-600">← BACK TO ROSTER</button>
            <h2 className="text-lg font-black">Attendance History Archive</h2>
            {history.map(s => (
              <div key={s.id} className="bg-white p-4 rounded-xl border">
                <p className="font-bold text-sm border-b pb-2 mb-2">{s.term} ({s.academic_session}) - {new Date(s.date).toLocaleDateString()}</p>
                <div className="flex flex-wrap gap-2">
                  {s.attendance_records.map((r, i) => (
                    <span key={i} className={`text-[10px] px-2 py-1 rounded border ${r.status === 'Present' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                      {r.students?.name}: {r.status}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "profile" && (
          <div className="bg-white p-8 rounded-3xl border shadow-sm max-w-lg">
            <h2 className="text-lg font-black mb-6">Instructor Profile</h2>
            {teacherProfile && (
              <div className="space-y-4">
                <div className="border-b pb-2"><span className="text-slate-400 text-xs">Name</span><p className="font-bold">{teacherProfile.name}</p></div>
                <div className="border-b pb-2"><span className="text-slate-400 text-xs">Assigned Subject</span><p className="font-bold uppercase">{teacherProfile.subject || teacherProfile.specialization || teacherProfile.course || "Not assigned"}</p></div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}