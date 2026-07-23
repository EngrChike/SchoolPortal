"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import ResultViewer from "../ResultViewer"; 
import CourseRegistrationPanel from "../CourseRegistrationPanel"; 
import StudentBioPanel from "../StudentBioPanel";
import StudentAssignmentsPanel from "../StudentAssignmentsPanel";

export default function StudentDashboard() {
  const router = useRouter();

  // Navigation Panel Controller State
  const [activePanel, setActivePanel] = useState("bio_data");

  const [loading, setLoading] = useState(true);
  const [currentStudentEmail, setCurrentStudentEmail] = useState("");
  
  // Student Bio Data Fields
  const [fullName, setFullName] = useState("");
  const [regNumber, setRegNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("");
  const [dob, setDob] = useState("");
  const [parentName, setParentName] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  
  // Admin Onboarding Assigned Fields & Toggle Updates
  const [studentSection, setStudentSection] = useState("Unassigned");
  const [classLevel, setClassLevel] = useState("Unassigned");
  
  // Passport States
  const [passportFile, setPassportFile] = useState(null);
  const [passportPreview, setPassportPreview] = useState(null);
  const [savedPassportUrl, setSavedPassportUrl] = useState("");

  // Course Registration State Arrays & Academic Terms/Archives
  const [availableCourses, setAvailableCourses] = useState([]);
  const [registeredCourseIds, setRegisteredCourseIds] = useState([]);
  const [performanceRecords, setPerformanceRecords] = useState([]);
  
  // Updated States for School Level Tier, Term Folders, and Progression Logics
  const [isJss2Unlocked, setIsJss2Unlocked] = useState(false);
  const [isJss3ToSs1Transitioned, setIsJss3ToSs1Transitioned] = useState(false);

  // Assignment Pipeline States
  const [courseAssignments, setCourseAssignments] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  // Live Timers State Engine Matrix
  const [assignmentTimers, setAssignmentTimers] = useState({});
  // Global Institutional Settings Assets States
  const [schoolStamp, setSchoolStamp] = useState("");
  const [adminSignature, setAdminSignature] = useState("");
  // Result Matrix Verification Screen States
  const [dbResultPin, setDbResultPin] = useState("");

  // Helper Function to Fetch Existing Course Registrations & Live Grades
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
        courses:course_id (
          id,
          name,
          code
        )
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

    const hasAllTerms = termAverages.every(avg => avg > 0);
    if (hasAllTerms) {
      const overallJss1Avg = (termAverages[0] + termAverages[1] + termAverages[2]) / 3;
      if (overallJss1Avg >= 50) {
        setIsJss2Unlocked(true);
      }
    }

    const jss3Records = registrations.filter(r => (r.school_level_tier || "").toUpperCase() === "JSS3");
    if (jss3Records.length > 0) {
      setIsJss3ToSs1Transitioned(true);
      setClassLevel("SS1");
    }
  }

  async function fetchAssignmentsAndSubmissions(courseIds, studentEmail) {
    try {
      const { data: assignments, error: assignErr } = await supabase
        .from("assignments")
        .select(`
          id,
          title,
          file_url,
          course_id,
          created_at,
          courses:course_id (name, code)
        `)
        .in("course_id", courseIds)
        .order("created_at", { ascending: false });

      if (assignErr) throw assignErr;

      const { data: submissions, error: subErr } = await supabase
        .from("assignment_submissions")
        .select("assignment_id, file_url")
        .eq("student_email", studentEmail.trim().toLowerCase());

      if (subErr) throw subErr;

      const submittedMap = new Map(submissions?.map(s => [s.assignment_id, s.file_url]) || []);
      const structuredAssignments = (assignments || []).map(asm => ({
        ...asm,
        hasSubmitted: submittedMap.has(asm.id),
        submittedFileUrl: submittedMap.get(asm.id) || null
      }));
      setCourseAssignments(structuredAssignments);
    } catch (err) {
      console.error("Error setting assignment array context: ", err.message);
    }
  }

  async function fetchInstitutionalSettings() {
    try {
      const { data, error } = await supabase
        .from("school_settings")
        .select("school_stamp_url, admin_signature_url");

      if (error) return;

      if (data && data.length > 0) {
        setSchoolStamp(data[0].school_stamp_url || "");
        setAdminSignature(data[0].admin_signature_url || "");
      }
    } catch (err) {
      console.error("Settings Cache Exception: ", err.message);
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

          let displayString = "";
          if (days > 0) displayString += `${days}d `;
          displayString += `${hours}h ${minutes}m ${seconds}s`;

          updatedTimers[asm.id] = { displayString, isExpired: false };
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
        if (!loggedInUser) {
          router.push("/login");
          return;
        }

        const cleanEmail = loggedInUser.trim().toLowerCase();
        setCurrentStudentEmail(cleanEmail);

        const { data: student, error: studentErr } = await supabase
          .from("students")
          .select("*")
          .eq("email", cleanEmail)
          .maybeSingle();

        if (studentErr) throw studentErr;

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
          if (student.passport_url) {
            setSavedPassportUrl(student.passport_url);
            setPassportPreview(student.passport_url);
          }
        }

        let courseQuery = supabase.from("courses").select("*");
        if (activeSection) {
          courseQuery = courseQuery.eq("section", activeSection);
        }
        
        const { data: courses, error: courseErr } = await courseQuery;
        if (courseErr) throw courseErr;
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

  const totalCoursesCount = performanceRecords.length;
  const overallAverageScore = totalCoursesCount > 0 
    ? (performanceRecords.reduce((sum, r) => {
        const ca = r.continuous_assessment || 0;
        const mid = r.mid_semester || 0;
        const exam = r.final_exam || 0;
        return sum + (ca + mid + exam);
      }, 0) / totalCoursesCount).toFixed(2)
    : "0.00";

  const activeTermName = performanceRecords.find(r => r.school_term)?.school_term || "First Term";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-sm font-bold text-slate-400 animate-pulse bg-slate-50">
        Syncing Institutional Profile Ledger State Node...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/60 p-3 sm:p-4 md:p-8 font-sans print:p-0 print:bg-white overflow-x-hidden">
      <div className="max-w-5xl mx-auto print-root-container w-full box-border">
        
        {/* Header */}
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 sm:p-6 rounded-3xl sm:rounded-[2rem] border border-slate-100 shadow-sm no-print-wrapper overflow-hidden">
          <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
            <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0 relative">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-contain max-h-full max-w-full" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-base sm:text-xl font-black text-slate-800 tracking-tight leading-snug uppercase truncate">Don Chike International School</h1>
              <p className="text-[11px] sm:text-xs font-bold text-indigo-600 mt-0.5 sm:mt-1 uppercase tracking-wider truncate">EduPulse Student Portal Workspace</p>
              <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 font-mono truncate">Session Ref Key: {currentStudentEmail}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 bg-slate-50 p-2 rounded-2xl border border-slate-200/60 w-full sm:w-fit justify-start sm:justify-end">
            <div className="h-9 w-9 overflow-hidden rounded-xl border border-slate-200 bg-indigo-600 flex items-center justify-center flex-shrink-0">
              {savedPassportUrl ? (
                <img src={savedPassportUrl} alt="mini-face" className="h-full w-full object-cover" />
              ) : (
                <span className="text-white font-mono font-bold text-xs">{regNumber ? regNumber.slice(-3) : "STU"}</span>
              )}
            </div>
            <div className="text-left pr-2 min-w-0">
              <p className="text-xs font-black text-slate-700 truncate max-w-[180px] sm:max-w-[140px]">{fullName || "Incomplete Profile"}</p>
              <p className="text-[10px] text-slate-400 font-mono truncate">{regNumber || "No Identifier ID"}</p>
            </div>
          </div>
        </div>

        {/* Panel Tabs */}
        <div className="flex sm:grid sm:grid-cols-4 gap-2 mb-6 sm:mb-8 bg-slate-200/50 p-2 rounded-2xl border border-slate-200/40 no-print-wrapper overflow-x-auto scrollbar-none">
          <button type="button" onClick={() => setActivePanel("bio_data")} className={`py-3 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex-1 text-center ${activePanel === "bio_data" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>📋 Student Data</button>
          <button type="button" onClick={() => setActivePanel("course_reg")} className={`py-3 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex-1 text-center ${activePanel === "course_reg" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>✏️ Course Registration</button>
          <button type="button" onClick={() => setActivePanel("assignments")} className={`py-3 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex-1 text-center ${activePanel === "assignments" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>📚 Assignments</button>
          <button type="button" onClick={() => setActivePanel("results")} className={`py-3 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex-1 text-center ${activePanel === "results" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>📊 Results Matrix</button>
        </div>

        <div className="w-full">
          {/* PANEL 1: STUDENT BIO DATA MODULE */}
          {activePanel === "bio_data" && (
            <StudentBioPanel
              currentStudentEmail={currentStudentEmail}
              fullName={fullName}
              setFullName={setFullName}
              regNumber={regNumber}
              phone={phone}
              setPhone={setPhone}
              gender={gender}
              setGender={setGender}
              dob={dob}
              setDob={setDob}
              parentName={parentName}
              setParentName={setParentName}
              parentPhone={parentPhone}
              setParentPhone={setParentPhone}
              studentSection={studentSection}
              setStudentSection={setStudentSection}
              classLevel={classLevel}
              setClassLevel={setClassLevel}
              passportPreview={passportPreview}
              setPassportFile={setPassportFile}
              setPassportPreview={setPassportPreview}
              savedPassportUrl={savedPassportUrl}
              setSavedPassportUrl={setSavedPassportUrl}
            />
          )}

          {/* PANEL 2: COURSE REGISTRATION MODULE */}
          {activePanel === "course_reg" && (
            <CourseRegistrationPanel
              currentStudentEmail={currentStudentEmail}
              studentSection={studentSection}
              availableCourses={availableCourses}
              setAvailableCourses={setAvailableCourses}
              registeredCourseIds={registeredCourseIds}
              performanceRecords={performanceRecords}
              isJss2Unlocked={isJss2Unlocked}
              isJss3ToSs1Transitioned={isJss3ToSs1Transitioned}
              refreshRegistrations={fetchRegistrationsAndGrades}
            />
          )}

          {/* PANEL 3: ASSIGNMENTS MODULE */}
          {activePanel === "assignments" && (
            <StudentAssignmentsPanel
              performanceRecords={performanceRecords}
              courseAssignments={courseAssignments}
              setSelectedAssignment={setSelectedAssignment}
              assignmentTimers={assignmentTimers}
            />
          )}

          {/* PANEL 4: RESULTS MATRIX MODULE */}
          {activePanel === "results" && (
            <div className="w-full overflow-x-auto">
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
            </div>
          )}
        </div>

      </div>
    </div>
  );
}