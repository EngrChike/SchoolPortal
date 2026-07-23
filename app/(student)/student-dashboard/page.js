"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import ResultViewer from "../ResultViewer";
import CourseRegistrationPanel from "../CourseRegistrationPanel"; // Imported cleanly here

export default function StudentDashboard() {
  const router = useRouter();

  const [activePanel, setActivePanel] = useState("bio_data");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentStudentEmail, setCurrentStudentEmail] = useState("");
  
  // Student Bio Data Fields
  const [fullName, setFullName] = useState("");
  const [regNumber, setRegNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("");
  const [dob, setDob] = useState("");
  const [parentName, setParentName] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  
  // Admin Onboarding Assigned Fields
  const [studentSection, setStudentSection] = useState("Unassigned");
  const [classLevel, setClassLevel] = useState("Unassigned");
  
  // Passport States
  const [passportFile, setPassportFile] = useState(null);
  const [passportPreview, setPassportPreview] = useState(null);
  const [savedPassportUrl, setSavedPassportUrl] = useState("");

  // Course Registration Arrays & Progression States
  const [availableCourses, setAvailableCourses] = useState([]);
  const [registeredCourseIds, setRegisteredCourseIds] = useState([]);
  const [performanceRecords, setPerformanceRecords] = useState([]);
  const [isJss2Unlocked, setIsJss2Unlocked] = useState(false);
  const [isJss3ToSs1Transitioned, setIsJss3ToSs1Transitioned] = useState(false);

  // Assignment Pipeline States
  const [courseAssignments, setCourseAssignments] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [assignmentTimers, setAssignmentTimers] = useState({});

  // Global Institutional Settings Assets States
  const [schoolStamp, setSchoolStamp] = useState("");
  const [adminSignature, setAdminSignature] = useState("");
  const [dbResultPin, setDbResultPin] = useState("");

  async function fetchRegistrationsAndGrades(studentEmail) {
    const { data: registrations, error: regErr } = await supabase
      .from("course_registrations")
      .select(`
        course_id,
        continuous_assessment,
        mid_semester,
        final_exam,
        school_term,
        school_level_tier,
        courses:course_id (id, name, code)
      `)
      .eq("student_email", studentEmail);

    if (regErr) throw regErr;

    if (registrations) {
      setRegisteredCourseIds(registrations.map(r => r.course_id));
      setPerformanceRecords(registrations);
      evaluateJssProgression(registrations);

      if (registrations.length > 0) {
        const courseIds = registrations.map(r => r.course_id);
        await fetchAssignmentsAndSubmissions(courseIds, studentEmail);
      } else {
        setCourseAssignments([]);
      }
    }
  }

  function evaluateJssProgression(registrations) {
    const jss1TermRecords = registrations.filter(r => (r.school_level_tier || "JSS1") === "JSS1");
    const termAverages = ["1st Term", "2nd Term", "3rd Term"].map(term => {
      const termRegs = jss1TermRecords.filter(r => r.school_term === term);
      if (termRegs.length === 0) return 0;
      const termSum = termRegs.reduce((sum, r) => sum + ((r.continuous_assessment || 0) + (r.mid_semester || 0) + (r.final_exam || 0)), 0);
      return termSum / termRegs.length;
    });

    if (termAverages.every(avg => avg > 0)) {
      if ((termAverages[0] + termAverages[1] + termAverages[2]) / 3 >= 50) {
        setIsJss2Unlocked(true);
      }
    }

    if (registrations.some(r => (r.school_level_tier || "").toUpperCase() === "JSS3")) {
      setIsJss3ToSs1Transitioned(true);
      setClassLevel("SS1");
    }
  }

  async function fetchAssignmentsAndSubmissions(courseIds, studentEmail) {
    try {
      const { data: assignments } = await supabase
        .from("assignments")
        .select(`id, title, file_url, course_id, created_at, courses:course_id (name, code)`)
        .in("course_id", courseIds)
        .order("created_at", { ascending: false });

      const { data: submissions } = await supabase
        .from("assignment_submissions")
        .select("assignment_id, file_url")
        .eq("student_email", studentEmail.trim().toLowerCase());

      const submittedMap = new Map(submissions?.map(s => [s.assignment_id, s.file_url]) || []);
      setCourseAssignments((assignments || []).map(asm => ({
        ...asm,
        hasSubmitted: submittedMap.has(asm.id),
        submittedFileUrl: submittedMap.get(asm.id) || null
      })));
    } catch (err) {
      console.error("Error setting assignments: ", err.message);
    }
  }

  async function fetchInstitutionalSettings() {
    try {
      const { data } = await supabase.from("school_settings").select("school_stamp_url, admin_signature_url");
      if (data && data.length > 0) {
        setSchoolStamp(data[0].school_stamp_url || "");
        setAdminSignature(data[0].admin_signature_url || "");
      }
    } catch (err) {
      console.error("Settings Exception: ", err.message);
    }
  }

  useEffect(() => {
    if (courseAssignments.length === 0) return;
    const computeTimers = () => {
      const updatedTimers = {};
      const now = new Date().getTime();
      courseAssignments.forEach((asm) => {
        const targetDeadline = new Date(asm.created_at).getTime() + 48 * 60 * 60 * 1000;
        const distance = targetDeadline - now;
        if (distance <= 0) {
          updatedTimers[asm.id] = { displayString: "Locked / Ended", isExpired: true };
        } else {
          const days = Math.floor(distance / (1000 * 60 * 60 * 24));
          const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((distance % (1000 * 60)) / 1000);
          updatedTimers[asm.id] = { displayString: `${days > 0 ? `${days}d ` : ""}${hours}h ${minutes}m ${seconds}s`, isExpired: false };
        }
      });
      setAssignmentTimers(updatedTimers);
    };
    computeTimers();
    const timerInterval = setInterval(computeTimers, 1000);
    return () => clearInterval(timerInterval);
  }, [courseAssignments]);

  useEffect(() => {
    async function loadStudentWorkspace() {
      try {
        const loggedInUser = localStorage.getItem("active_student_email");
        if (!loggedInUser) { router.push("/login"); return; }
        const cleanEmail = loggedInUser.trim().toLowerCase();
        setCurrentStudentEmail(cleanEmail);

        const { data: student } = await supabase.from("students").select("*").eq("email", cleanEmail).maybeSingle();
        let activeSection = null;

        if (student) {
          setFullName(student.name || "");
          setRegNumber(student.reg_number || "");
          setPhone(student.phone || "");
          setGender(student.gender || "");
          setDob(student.dob || "");
          setParentName(student.parent_name || "");
          setParentPhone(student.parent_phone || "");
          setDbResultPin(student.result_pin || "");
          setStudentSection(student.section || "Unassigned");
          setClassLevel(student.class_level || student.level || "Unassigned");
          activeSection = student.section;
          if (student.passport_url) { setSavedPassportUrl(student.passport_url); setPassportPreview(student.passport_url); }
        }

        let courseQuery = supabase.from("courses").select("*");
        if (activeSection) { courseQuery = courseQuery.eq("section", activeSection); }
        const { data: courses } = await courseQuery;
        setAvailableCourses(courses || []);

        await fetchRegistrationsAndGrades(cleanEmail);
        await fetchInstitutionalSettings();
      } catch (err) {
        alert("Workspace Sync Error: " + err.message);
      } finally {
        setLoading(false);
      }
    }
    loadStudentWorkspace();
  }, [router]);

  async function handleSaveBioData(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      let finalPassportUrl = savedPassportUrl;
      if (passportFile) {
        const fileExtension = passportFile.name.split(".").pop();
        const safeFileName = `${regNumber || "student"}_${Date.now()}.${fileExtension}`;
        await supabase.storage.from("passports").upload(safeFileName, passportFile, { upsert: true });
        const { data: publicUrlData } = supabase.storage.from("passports").getPublicUrl(safeFileName);
        finalPassportUrl = publicUrlData.publicUrl;
      }

      await supabase.from("students").update({
        name: fullName.trim(), phone: phone.trim(), gender, dob,
        parent_name: parentName.trim(), parent_phone: parentPhone.trim(), passport_url: finalPassportUrl
      }).eq("email", currentStudentEmail);

      setSavedPassportUrl(finalPassportUrl);
      alert("✨ Profile details committed successfully!");
    } catch (err) {
      alert("Process Failure: " + err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const totalCoursesCount = performanceRecords.length;
  const overallAverageScore = totalCoursesCount > 0 
    ? (performanceRecords.reduce((sum, r) => sum + ((r.continuous_assessment || 0) + (r.mid_semester || 0) + (r.final_exam || 0)), 0) / totalCoursesCount).toFixed(2)
    : "0.00";
  const activeTermName = performanceRecords.find(r => r.school_term)?.school_term || "First Term";

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen text-sm font-bold text-slate-400 animate-pulse bg-slate-50">Syncing Profile Data...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50/60 p-3 sm:p-4 md:p-8 font-sans print:p-0 print:bg-white overflow-x-hidden">
      <div className="max-w-5xl mx-auto print-root-container w-full box-border">
        
        {/* Header */}
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 sm:p-6 rounded-3xl border border-slate-100 shadow-sm no-print-wrapper">
          <div className="flex items-center space-x-3">
            <div className="h-12 w-12 rounded-xl overflow-hidden flex items-center justify-center">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-base sm:text-xl font-black text-slate-800 uppercase">Don Chike International School</h1>
              <p className="text-[11px] sm:text-xs font-bold text-indigo-600 uppercase">EduPulse Student Workspace</p>
            </div>
          </div>
        </div>

        {/* Panel Navigation Tabs */}
        <div className="flex sm:grid sm:grid-cols-4 gap-2 mb-6 sm:mb-8 bg-slate-200/50 p-2 rounded-2xl border border-slate-200/40 no-print-wrapper overflow-x-auto">
          <button onClick={() => setActivePanel("bio_data")} className={`py-3 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex-1 text-center ${activePanel === "bio_data" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500"}`}>📋 Student Data</button>
          <button onClick={() => setActivePanel("course_reg")} className={`py-3 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex-1 text-center ${activePanel === "course_reg" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500"}`}>✏️ Course Registration</button>
          <button onClick={() => setActivePanel("assignments")} className={`py-3 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex-1 text-center ${activePanel === "assignments" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500"}`}>📚 Assignments</button>
          <button onClick={() => setActivePanel("results")} className={`py-3 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex-1 text-center ${activePanel === "results" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500"}`}>📊 Results Matrix</button>
        </div>

        {/* Dynamic Panels */}
        {activePanel === "bio_data" && (
          <form onSubmit={handleSaveBioData} className="grid grid-cols-1 md:grid-cols-3 gap-6 no-print-wrapper">
            {/* Bio data form code remains clean here */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 flex flex-col items-center justify-center text-center space-y-4 shadow-sm h-fit">
              <div className="h-40 w-40 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 overflow-hidden flex items-center justify-center">
                {passportPreview ? <img src={passportPreview} alt="Passport" className="h-full w-full object-cover" /> : <div className="text-slate-300 text-xs">No Photo</div>}
              </div>
              <label className="block w-full text-center bg-indigo-50 text-indigo-700 font-bold text-xs py-3 px-4 rounded-xl cursor-pointer">
                Choose Image
                <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files[0]; if(f){setPassportFile(f); setPassportPreview(URL.createObjectURL(f));}}} className="hidden" />
              </label>
            </div>
            <div className="md:col-span-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Full Legal Name</label>
                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full rounded-xl border border-slate-200 p-3 text-sm bg-slate-50" />
              </div>
              <button type="submit" className="w-full bg-emerald-500 text-white font-bold text-sm py-3 rounded-xl cursor-pointer">Commit Bio Data</button>
            </div>
          </form>
        )}

        {/* Course Registration Component Link */}
        {activePanel === "course_reg" && (
          <CourseRegistrationPanel
            currentStudentEmail={currentStudentEmail}
            studentSection={studentSection}
            availableCourses={availableCourses}
            registeredCourseIds={registeredCourseIds}
            performanceRecords={performanceRecords}
            isJss2Unlocked={isJss2Unlocked}
            isJss3ToSs1Transitioned={isJss3ToSs1Transitioned}
            refreshRegistrations={fetchRegistrationsAndGrades}
          />
        )}

        {activePanel === "assignments" && (
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <h3 className="text-base font-black text-slate-800">Assignments Pipeline</h3>
            {courseAssignments.map(asm => (
              <div key={asm.id} className="p-4 bg-slate-50 rounded-xl mt-3 flex justify-between items-center">
                <span>{asm.title}</span>
                <a href={asm.file_url} target="_blank" rel="noreferrer" className="text-indigo-600 font-bold text-xs">View Brief</a>
              </div>
            ))}
          </div>
        )}

        {activePanel === "results" && (
          <ResultViewer 
            dbResultPin={dbResultPin}
            regNumber={regNumber}
            fullName={fullName}
            studentSection={studentSection}
            classLevel={classLevel}
            termName={activeTermName}
            overallAverageScore={overallAverageScore}
            performanceRecords={performanceRecords}
            schoolStamp={schoolStamp}
            adminSignature={adminSignature}
          />
        )}
      </div>
    </div>
  );
}