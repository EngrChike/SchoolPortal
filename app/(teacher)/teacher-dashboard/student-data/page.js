"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../../../lib/supabaseClient";

export default function TeacherStudentDataPage({ currentTeacher = null }) {
  const [teacherProfile, setTeacherProfile] = useState(currentTeacher);
  const [teacherEmail, setTeacherEmail] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  
  // Active classroom level (e.g., 'jss1', 'primary_1', 'primary_2')
  const [selectedClass, setSelectedClass] = useState(""); 
  
  // State Arrays for Lists
  const [students, setStudents] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Fallback state to keep track of the current class's course id context safely
  const [currentCourseId, setCurrentCourseId] = useState(null);

  // Assignment Creation Form States
  const [assignmentTitle, setAssignmentTitle] = useState("");
  const [assignmentDeadline, setAssignmentDeadline] = useState("");
  const [assignmentFile, setAssignmentFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // Grading Form Metrics
  const [scores, setScores] = useState({
    assignment: 0,
    test: 0,
    exam: 0,
  });

  // 1. Sync prop profile to state or fall back to native session loader
  useEffect(() => {
    if (currentTeacher) {
      setTeacherProfile(currentTeacher);
      setTeacherEmail(currentTeacher.email || "");
      if (currentTeacher.assigned_classes && currentTeacher.assigned_classes.length > 0) {
        setSelectedClass(currentTeacher.assigned_classes[0]);
      }
      setIsLoading(false);
    } else {
      const loggedInEmail = localStorage.getItem("active_teacher_email") || "";
      setTeacherEmail(loggedInEmail);
      if (loggedInEmail) {
        loadTeacherProfile(loggedInEmail);
      } else {
        setIsLoading(false);
      }
    }
  }, [currentTeacher]);

  // 2. Fetch Teacher Profile Configuration Meta-data (Fallback native route logic)
  async function loadTeacherProfile(email) {
    try {
      setIsLoading(true);
      const cleanEmail = email.trim().toLowerCase();

      const { data, error } = await supabase
        .from("teachers")
        .select("*")
        .eq("email", cleanEmail)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setTeacherProfile(data);
        if (data.assigned_classes && data.assigned_classes.length > 0) {
          setSelectedClass(data.assigned_classes[0]);
        }
      }
    } catch (err) {
      console.error("Error pulling core instructor profile:", err.message);
    } finally {
      setIsLoading(false);
    }
  }

  // 3. Automatically sync data layers whenever the teacher flips classes
  useEffect(() => {
    if (teacherEmail && selectedClass && (currentTeacher || teacherProfile)) {
      fetchClassWorkspaceData();
    }
  }, [selectedClass, teacherEmail, teacherProfile, currentTeacher]);

  async function fetchClassWorkspaceData() {
    try {
      const activeProfile = currentTeacher || teacherProfile;
      setCurrentCourseId(null); // Clear previous fallback context
      
      // --- PART 1: FETCH REGISTERED STUDENTS FOR THE SELECTED CLASS ---
      const { data: registrationRecords, error: registrationErr } = await supabase
        .from("course_registrations")
        .select(`
          id,
          course_id,
          continuous_assessment,
          mid_semester,
          final_exam,
          student_email,
          students!inner(
            id,
            name,
            email,
            class_level
          )
        `)
        .eq("students.class_level", selectedClass);

      if (registrationErr) throw registrationErr;
      
      // Save the primary course ID context from the first matching registration record found
      if (registrationRecords && registrationRecords.length > 0) {
        const foundCourseId = registrationRecords.find(r => r.course_id)?.course_id;
        if (foundCourseId) {
          setCurrentCourseId(foundCourseId);
        }
      }
      
      // DE-DUPLICATION STRATEGY: Use a Map keyed by the unique database entry or student composite
      const uniqueStudentsMap = new Map();

      (registrationRecords || []).forEach((reg) => {
        const lookupId = reg.students?.id || reg.id;
        if (!uniqueStudentsMap.has(lookupId)) {
          uniqueStudentsMap.set(lookupId, {
            id: reg.id, 
            course_id: reg.course_id,
            student_id: reg.students?.id || reg.id,
            name: reg.students?.name || "Unnamed Student",
            email: (reg.students?.email || reg.student_email || "").trim().toLowerCase(),
            continuous_assessment: reg.continuous_assessment ?? 0,
            mid_semester: reg.mid_semester ?? 0,
            final_exam: reg.final_exam ?? 0,
          });
        }
      });

      const processedRoster = Array.from(uniqueStudentsMap.values());
      setStudents(processedRoster);

      // Create a fast lookup set of all student emails belonging to THIS class
      const classStudentEmails = new Set(processedRoster.map(s => s.email));

      // --- PART 2: FETCH SUBMISSIONS ---
      const { data: subData, error: subErr } = await supabase
        .from("assignment_submissions")
        .select(`
          id,
          assignment_id,
          student_email,
          student_name,
          passport_url,
          file_url,
          created_at,
          assignments(
            title
          )
        `)
        .order("created_at", { ascending: false });

      if (subErr) throw subErr;

      // Filter locally: matching target workspace profile layers safely
      const filteredSubmissions = (subData || []).filter(sub => {
        const studentInClass = classStudentEmails.has((sub.student_email || "").trim().toLowerCase());
        return studentInClass;
      });

      setSubmissions(filteredSubmissions);

    } catch (err) {
      console.error("Failed downloading class contextual matrices:", err.message);
    }
  }

  function handleOpenGrader(student) {
    setSelectedStudent(student);
    setScores({
      assignment: student.continuous_assessment || 0,
      test: student.mid_semester || 0,
      exam: student.final_exam || 0,
    });
  }

  // 4. Save CA, Test, and Exam metrics (Saves instantly to student gradebook)
  async function handleUpdateGrades(e) {
    e.preventDefault();
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from("course_registrations")
        .update({
          continuous_assessment: Number(scores.assignment),
          mid_semester: Number(scores.test),
          final_exam: Number(scores.exam),
        })
        .eq("id", selectedStudent.id); 

      if (error) throw error;

      setSelectedStudent(null);
      fetchClassWorkspaceData(); 
      alert("✨ Marks uploaded successfully! Student can now view this on their Results Matrix.");
    } catch (err) {
      alert("Could not process updates: " + err.message);
    } finally {
      setIsSaving(false);
    }
  }

  // 5. Upload and send assignments out to the selected class
  async function handleUploadAssignment(e) {
    e.preventDefault();
    const activeProfile = currentTeacher || teacherProfile;
    
    if (!selectedClass) {
      alert("Please select an active target class room layer first.");
      return;
    }
    if (!assignmentFile) {
      alert("Please select an assignment file document node.");
      return;
    }

    // 💡 REINFORCED LOOKUP: Check our fallback state or the student rows directly
    const activeCourseId = currentCourseId || students[0]?.course_id;

    if (!activeCourseId) {
      alert("Error identifying reference Course ID configuration matching this group setup. Make sure the database registration rows contain a valid 'course_id'.");
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = assignmentFile.name.split(".").pop();
      const safeSubjectName = (activeProfile?.subject || "subject").replace(/\s+/g, "_");
      const safeFileName = `${safeSubjectName}_${selectedClass}_${Date.now()}.${fileExt}`;

      const { error: uploadErr } = await supabase.storage
        .from("assignments")
        .upload(safeFileName, assignmentFile, { cacheControl: "3600", upsert: true });

      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from("assignments").getPublicUrl(safeFileName);
      const publicFileUrl = urlData.publicUrl;

      const { error: dbErr } = await supabase
        .from("assignments")
        .insert({
          title: assignmentTitle.trim(),
          file_url: publicFileUrl,
          course_id: Number(activeCourseId), // Cast explicitly to Number to keep column int8 constraints happy
          teacher_email: teacherEmail.trim().toLowerCase(),
          deadline: assignmentDeadline ? new Date(assignmentDeadline).toISOString() : null
        });

      if (dbErr) throw dbErr;

      setAssignmentTitle("");
      setAssignmentDeadline("");
      setAssignmentFile(null);
      e.target.reset();
      alert("🚀 Assignment distributed live to all students in this class course track!");
      fetchClassWorkspaceData();
    } catch (err) {
      alert("Broadcast Error: " + err.message);
    } finally {
      setIsUploading(false);
    }
  }

  const displayedProfile = currentTeacher || teacherProfile;

  if (isLoading) {
    return <div className="p-12 text-center text-slate-400 text-sm font-medium animate-pulse">Syncing Faculty Cross-Class Records...</div>;
  }

  if (!teacherEmail) {
    return <div className="p-12 text-center text-rose-500 text-sm font-bold">Session expired. Please log in again.</div>;
  }

  return (
    <div className="space-y-8">
      {/* Header Selector Switcher Component */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-800 tracking-tight">Faculty Workspace Portal</h1>
          <p className="text-xs text-slate-400 mt-0.5">Focus Subject: <span className="font-bold text-indigo-600 uppercase tracking-wide font-mono">{displayedProfile?.subject || "Core Subject"}</span></p>
        </div>

        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-2 w-full md:w-auto">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono pl-2">Active Class Layer:</label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="bg-white border border-slate-200 text-slate-800 text-xs font-bold rounded-xl px-3 py-1.5 outline-none focus:border-indigo-500 uppercase font-mono cursor-pointer"
          >
            {displayedProfile?.assigned_classes?.map((cls) => (
              <option key={cls} value={cls}>
                {cls.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          
          {/* Section 1: Classroom Assessment Score Ledger Records */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/20">
              <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider">
                Classroom Mark Sheets ({selectedClass ? selectedClass.replace("_", " ") : "N/A"})
              </h3>
              <span className="bg-blue-50 border border-blue-100 text-blue-700 text-[11px] px-2.5 py-0.5 rounded-full font-bold font-mono">
                {students.length} Registered
              </span>
            </div>
            
            {students.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm font-medium">No registered students found matching this workspace track profile layer.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/75 border-b border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-wider">
                      <th className="px-6 py-4">Student Name</th>
                      <th className="px-6 py-4">CA (20)</th>
                      <th className="px-6 py-4">Test (30)</th>
                      <th className="px-6 py-4">Exam (50)</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
                    {students.map((student) => (
                      <tr key={student.id} className="hover:bg-slate-50/40 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-800">{student.name}</div>
                          <div className="text-xs text-slate-400 font-mono">{student.email}</div>
                        </td>
                        <td className="px-6 py-4 font-mono font-semibold">{student.continuous_assessment} pts</td>
                        <td className="px-6 py-4 font-mono font-semibold">{student.mid_semester} pts</td>
                        <td className="px-6 py-4 font-mono font-semibold">{student.final_exam} pts</td>
                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleOpenGrader(student)}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs px-3 py-2 rounded-xl transition-all shadow-sm cursor-pointer"
                          >
                            📝 Record Grades
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section 2: Inbound Student Assignments Submission Inbox */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider">📥 Inbound Submissions Received</h3>
              <p className="text-xs text-slate-400 mt-0.5">Completed task solutions submitted back live by students.</p>
            </div>
            {submissions.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm font-medium">No returned assignments for this selection tier channel yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/75 border-b border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-wider">
                      <th className="px-6 py-4">Student</th>
                      <th className="px-6 py-4">Task Title</th>
                      <th className="px-6 py-4">Turn-In Time</th>
                      <th className="px-6 py-4 text-right">Document Asset</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
                    {submissions.map((sub) => (
                      <tr key={sub.id} className="hover:bg-slate-50/40 transition-colors">
                        <td className="px-6 py-4 flex items-center gap-3">
                          {sub.passport_url ? (
                            <img src={sub.passport_url} alt="profile" className="w-9 h-9 rounded-xl object-cover border border-slate-200" />
                          ) : (
                            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-xs text-slate-400 font-bold border border-slate-200">🧑‍🎓</div>
                          )}
                          <div>
                            <div className="font-bold text-slate-800">{sub.student_name}</div>
                            <div className="text-[10px] font-mono text-slate-400 font-normal">{sub.student_email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-block bg-slate-100 border border-slate-200 rounded-lg px-2 py-0.5 text-xs max-w-xs truncate font-medium">
                            {sub.assignments?.title || "Assignment File"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs font-mono text-slate-500">
                          {new Date(sub.created_at).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <a href={sub.file_url} target="_blank" rel="noreferrer" className="inline-flex items-center bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold text-xs px-3 py-2 rounded-xl">
                            📁 Review Solution
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

        {/* Form Container: Broadcast New Assignment Task Sheet */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm h-fit space-y-4">
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Broadcast New Task</h3>
            <p className="text-xs text-slate-400 mt-0.5">Send assignment file live to room level: <span className="uppercase font-bold text-indigo-600 font-mono">{selectedClass ? selectedClass.replace("_", " ") : "N/A"}</span></p>
          </div>

          <form onSubmit={handleUploadAssignment} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 tracking-wider mb-1.5">Task Description Label</label>
              <input
                type="text"
                required
                placeholder="e.g. Mid-Term Homework Project 1"
                value={assignmentTitle}
                onChange={(e) => setAssignmentTitle(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-800 outline-none focus:border-indigo-600 bg-slate-50/50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 tracking-wider mb-1.5">Submission Target Deadline</label>
              <input
                type="datetime-local"
                value={assignmentDeadline}
                onChange={(e) => setAssignmentDeadline(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-800 outline-none focus:border-indigo-600 bg-slate-50/50 font-mono font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 tracking-wider mb-1.5">Upload Task Document Sheet</label>
              <input
                type="file"
                required
                onChange={(e) => setAssignmentFile(e.target.files[0])}
                className="w-full text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 border border-slate-200 p-2 rounded-xl bg-slate-50/50"
              />
            </div>

            <button
              type="submit"
              disabled={isUploading || !selectedClass}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-sm py-3 rounded-xl transition-all shadow-md cursor-pointer"
            >
              {isUploading ? "Uploading Instructions..." : "🚀 Send Assignment"}
            </button>
          </form>
        </div>
      </div>

      {/* Evaluation Grading Popup Overlay Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2rem] border-8 border-indigo-950/10 max-w-md w-full overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="font-black text-slate-800 text-base">Record Academic Performance</h3>
                <p className="text-[11px] font-mono text-indigo-600 font-bold mt-0.5">{selectedStudent.name}</p>
              </div>
              <button type="button" onClick={() => setSelectedStudent(null)} className="text-slate-400 hover:text-slate-600 text-2xl">×</button>
            </div>

            <form onSubmit={handleUpdateGrades} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 tracking-wider mb-1.5">CA Score (Max 20)</label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  required
                  value={scores.assignment}
                  onChange={(e) => setScores({ ...scores, assignment: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-800 outline-none focus:border-indigo-600 font-semibold bg-slate-50/50 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 tracking-wider mb-1.5">Mid-Semester Test Score (Max 30)</label>
                <input
                  type="number"
                  min="0"
                  max="30"
                  required
                  value={scores.test}
                  onChange={(e) => setScores({ ...scores, test: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-800 outline-none focus:border-indigo-600 font-semibold bg-slate-50/50 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 tracking-wider mb-1.5">Final Examination Score (Max 50)</label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  required
                  value={scores.exam}
                  onChange={(e) => setScores({ ...scores, exam: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-800 outline-none focus:border-indigo-600 font-semibold bg-slate-50/50 font-mono"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100 mt-6">
                <button type="button" onClick={() => setSelectedStudent(null)} className="flex-1 bg-slate-100 text-slate-600 font-bold text-sm py-3 rounded-xl">Discard</button>
                <button type="submit" disabled={isSaving} className="flex-1 bg-indigo-600 text-white font-bold text-sm py-3 rounded-xl shadow-md">{isSaving ? "Saving..." : "Upload Result Metrics"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}