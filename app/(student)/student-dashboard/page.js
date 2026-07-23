"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import ResultViewer from "../ResultViewer"; // Adjust path if needed depending on folder depth

export default function StudentDashboard() {
  const router = useRouter();

  // Navigation Panel Controller State
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

  // Course Registration State Arrays
  const [availableCourses, setAvailableCourses] = useState([]);
  const [registeredCourseIds, setRegisteredCourseIds] = useState([]);
  const [performanceRecords, setPerformanceRecords] = useState([]);

  // Assignment Pipeline States
  const [courseAssignments, setCourseAssignments] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [submissionFile, setSubmissionFile] = useState(null);
  const [uploadingAssignment, setUploadingAssignment] = useState(false);
  // Live Timers State Engine Matrix
  const [assignmentTimers, setAssignmentTimers] = useState({});
  // Manual Form Field States
  const [formCourseName, setFormCourseName] = useState("");
  const [formCourseCode, setFormCourseCode] = useState("");
  const [formSchoolTerm, setFormSchoolTerm] = useState(""); 
  const [formSubmitting, setFormSubmitting] = useState(false);
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

      if (registrations.length > 0) {
        const courseIds = registrations.map(r => r.course_id);
        await fetchAssignmentsAndSubmissions(courseIds, studentEmail);
      } else {
        setCourseAssignments([]);
      }
    }
  }

  // Fetch Published Faculty Tasks
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

  // Fetch Global Institutional Asset Settings Safely
  async function fetchInstitutionalSettings() {
    try {
      const { data, error } = await supabase
        .from("school_settings")
        .select("school_stamp_url, admin_signature_url");

      if (error) {
        console.warn("Notice: school_settings schema node cache uninitialized.");
        return;
      }

      if (data && data.length > 0) {
        setSchoolStamp(data[0].school_stamp_url || "");
        setAdminSignature(data[0].admin_signature_url || "");
      }
    } catch (err) {
      console.error("Settings Cache Exception: ", err.message);
    }
  }

  // Live Timer Core Interval Runner Engine
  useEffect(() => {
    if (courseAssignments.length === 0) return;

    const computeTimers = () => {
      const updatedTimers = {};
      const now = new Date().getTime();

      courseAssignments.forEach((asm) => {
        const targetDeadline = new Date(asm.created_at).getTime() + 48 * 60 * 60 * 1000;
        const distance = targetDeadline - now;

        if (distance <= 0) {
          updatedTimers[asm.id] = {
            displayString: "Locked / Ended",
            isExpired: true,
          };
        } else {
          const days = Math.floor(distance / (1000 * 60 * 60 * 24));
          const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((distance % (1000 * 60)) / 1000);

          let displayString = "";
          if (days > 0) displayString += `${days}d `;
          displayString += `${hours}h ${minutes}m ${seconds}s`;

          updatedTimers[asm.id] = {
            displayString,
            isExpired: false,
          };
        }
      });

      setAssignmentTimers(updatedTimers);
    };

    computeTimers();
    const timerInterval = setInterval(computeTimers, 1000);

    return () => clearInterval(timerInterval);
  }, [courseAssignments]);

  // Load everything on initial page load
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

  // File processing handler
  function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Invalid format: Please choose a valid image file (PNG/JPG).");
      return;
    }
    setPassportFile(file);
    setPassportPreview(URL.createObjectURL(file));
  }

  // Handle Bio Data Saving Action
  async function handleSaveBioData(e) {
    e.preventDefault();
    if (!currentStudentEmail) {
      alert("❌ Session Error: Lost authorization reference key.");
      return;
    }
    setSubmitting(true);

    try {
      let finalPassportUrl = savedPassportUrl;
      if (passportFile) {
        const fileExtension = passportFile.name.split(".").pop();
        const safeFileName = `${regNumber || "student"}_${Date.now()}.${fileExtension}`;
        const { error: uploadError } = await supabase.storage
          .from("passports")
          .upload(safeFileName, passportFile, { cacheControl: "3600", upsert: true });
        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from("passports")
          .getPublicUrl(safeFileName);
        finalPassportUrl = publicUrlData.publicUrl;
      }

      const { error: updateError } = await supabase
        .from("students")
        .update({
          name: fullName.trim(),
          phone: phone.trim(),
          gender: gender,
          dob: dob,
          parent_name: parentName.trim(),
          parent_phone: parentPhone.trim(),
          passport_url: finalPassportUrl
        })
        .eq("email", currentStudentEmail);
      if (updateError) throw updateError;

      setSavedPassportUrl(finalPassportUrl);
      alert("✨ Profile details committed successfully!");
    } catch (err) {
      alert("Process Failure: " + err.message);
    } finally {
      setSubmitting(false);
    }
  }

  // Handle Dynamic Course Registration Toggle
  async function toggleCourseRegistration(courseId) {
    try {
      const isRegistered = registeredCourseIds.includes(courseId);
      if (isRegistered) {
        const { error } = await supabase
          .from("course_registrations")
          .delete()
          .eq("student_email", currentStudentEmail)
          .eq("course_id", courseId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("course_registrations")
          .insert({
            student_email: currentStudentEmail,
            course_id: courseId
          });
        if (error) throw error;
      }
      
      await fetchRegistrationsAndGrades(currentStudentEmail);
    } catch (err) {
      alert("Registration Update Error: " + err.message);
    }
  }

  // Handle Manual Form Sourced Registration Input
  async function handleManualCourseSubmit(e) {
    e.preventDefault();
    if (!currentStudentEmail) return;
    setFormSubmitting(true);

    try {
      let targetCourseId = null;
      const { data: existingCourse } = await supabase
        .from("courses")
        .select("id")
        .eq("code", formCourseCode.trim().toUpperCase())
        .maybeSingle();

      if (existingCourse) {
        targetCourseId = existingCourse.id;
      } else {
        let sanitizedSection = studentSection.trim().toLowerCase();
        if (sanitizedSection === "unassigned" || !sanitizedSection) {
          sanitizedSection = "primary";
        }

        const { data: newCourse, error: insertCourseErr } = await supabase
          .from("courses")
          .insert({
            name: formCourseName.trim(),
            code: formCourseCode.trim().toUpperCase(),
            section: sanitizedSection
          })
          .select("id")
          .single();

        if (insertCourseErr) throw insertCourseErr;
        targetCourseId = newCourse.id;
        
        let courseQuery = supabase.from("courses").select("*");
        if (studentSection !== "Unassigned") {
          courseQuery = courseQuery.eq("section", studentSection);
        }
        const { data: allCourses } = await courseQuery;
        setAvailableCourses(allCourses || []);
      }

      if (registeredCourseIds.includes(targetCourseId)) {
        alert("Notice: This course unit is already locked onto your profile registry.");
        setFormSubmitting(false);
        return;
      }

      const { error: regError } = await supabase
        .from("course_registrations")
        .insert({
          student_email: currentStudentEmail,
          course_id: targetCourseId,
          school_term: formSchoolTerm.trim()
        });
      if (regError) throw regError;

      await fetchRegistrationsAndGrades(currentStudentEmail);
      
      setFormCourseName("");
      setFormCourseCode("");
      setFormSchoolTerm("");
      alert("✨ Custom Course Entry saved and committed successfully!");
    } catch (err) {
      alert("Form Registration Error: " + err.message);
    } finally {
      setFormSubmitting(false);
    }
  }

  const totalCoursesCount = performanceRecords.length;
  const overallAverageScore = totalCoursesCount > 0 
    ? (performanceRecords.reduce((sum, r) => {
        const ca = r.continuous_assessment || 0;
        const mid = r.mid_semester || 0;
        const exam = r.final_exam || 0;
        return sum + (ca + mid + exam);
      }, 0) / totalCoursesCount).toFixed(2)
    : "0.00";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-sm font-bold text-slate-400 animate-pulse bg-slate-50">
        Syncing Institutional Profile Ledger State Node...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/60 p-3 sm:p-4 md:p-8 font-sans print:p-0 print:bg-white overflow-x-hidden">
      
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          .no-print-wrapper { display: none !important; }
          .print-root-container { padding: 0 !important; background: white !important; margin: 0 !important; max-width: 100% !important; width: 100% !important; overflow: visible !important; }
          .print-sheet-node { 
            display: block !important; 
            border: none !important; 
            box-shadow: none !important; 
            padding: 4mm !important; 
            margin: 0 !important;
            width: 100% !important;
            background: white !important;
            position: relative !important;
          }
          .print-stamp-box {
            border: 2px dashed #000000 !important;
            background-color: #fafafa !important;
            display: block !important;
            min-height: 65px !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print-watermark-container {
            display: flex !important;
            opacity: 0.03 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print-signature-line {
            border-bottom: 2px solid #000000 !important;
          }
          .print-avoid-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          @page { size: A4 portrait; margin: 8mm 10mm 8mm 10mm; }
        }

        /* Extra Mobile Layout Fixes */
        @media screen and (max-width: 640px) {
          input, select, button {
            font-size: 16px !important; /* Prevents auto-zoom on iOS */
          }
        }
      `}} />

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

        {/* Panel Tabs - Horizontal scrollable on smaller screens for safety */}
        <div className="flex sm:grid sm:grid-cols-4 gap-2 mb-6 sm:mb-8 bg-slate-200/50 p-2 rounded-2xl border border-slate-200/40 no-print-wrapper overflow-x-auto scrollbar-none">
          <button type="button" onClick={() => setActivePanel("bio_data")} className={`py-3 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex-1 text-center ${activePanel === "bio_data" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>📋 Student Data</button>
          <button type="button" onClick={() => setActivePanel("course_reg")} className={`py-3 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex-1 text-center ${activePanel === "course_reg" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>✏️ Course Registration</button>
          <button type="button" onClick={() => setActivePanel("assignments")} className={`py-3 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex-1 text-center ${activePanel === "assignments" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>📚 Assignments</button>
          <button type="button" onClick={() => setActivePanel("results")} className={`py-3 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex-1 text-center ${activePanel === "results" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>📊 Results Matrix</button>
        </div>

        <div className="w-full">
          {/* PANEL 1: STUDENT BIO DATA */}
          {activePanel === "bio_data" && (
            <form onSubmit={handleSaveBioData} className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 no-print-wrapper">
              <div className="bg-white p-6 rounded-3xl border border-slate-100 flex flex-col items-center justify-center text-center space-y-4 shadow-sm h-fit">
                <label className="block text-xs font-bold uppercase text-slate-400 tracking-wider">Official Passport Photo</label>
                <div className="h-40 w-40 sm:h-44 sm:w-44 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 overflow-hidden flex items-center justify-center relative group">
                  {passportPreview ? (
                    <img src={passportPreview} alt="Passport" className="h-full w-full object-cover" />
                  ) : (
                    <div className="text-slate-300 text-xs px-4">No Passport Selected</div>
                  )}
                </div>
                <div className="w-full">
                  <label className="block w-full text-center bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs py-3 px-4 rounded-xl cursor-pointer transition-all">
                    Choose Image File
                    <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                  </label>
                  <p className="text-[10px] text-slate-400 mt-2">Accepted formats: JPG, PNG. Max weight: 2MB.</p>
                </div>
              </div>

              <div className="md:col-span-2 bg-white p-5 sm:p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                <div>
                  <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-3 pb-1 border-b border-slate-100">Section 1: Personal Details</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-400 tracking-wider mb-1.5">Full Legal Name</label>
                      <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-800 outline-none focus:border-indigo-600 bg-slate-50/50" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-400 tracking-wider mb-1.5">Registration Identifier</label>
                      <input type="text" disabled value={regNumber || "Pending Allocation"} className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-400 bg-slate-100 outline-none cursor-not-allowed font-mono" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-400 tracking-wider mb-1.5">Academic Section Allocation</label>
                      <input type="text" disabled value={studentSection} className="w-full rounded-xl border border-slate-200 p-3 text-sm text-indigo-700 bg-indigo-50 font-bold outline-none cursor-not-allowed tracking-wide" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-400 tracking-wider mb-1.5">Assigned Class Level</label>
                      <input type="text" disabled value={classLevel} className="w-full rounded-xl border border-slate-200 p-3 text-sm text-indigo-700 bg-indigo-50 font-bold outline-none cursor-not-allowed tracking-wide" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-400 tracking-wider mb-1.5">Contact Telephone</label>
                      <input type="tel" required placeholder="+225 00 00 00 00" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-800 outline-none focus:border-indigo-600 bg-slate-50/50" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-400 tracking-wider mb-1.5">Gender</label>
                      <select required value={gender} onChange={(e) => setGender(e.target.value)} className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-800 outline-none focus:border-indigo-600 bg-slate-50/50">
                        <option value="">Select Option</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-400 tracking-wider mb-1.5">Date of Birth</label>
                      <input type="date" required value={dob} onChange={(e) => setDob(e.target.value)} className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-800 outline-none focus:border-indigo-600 bg-slate-50/50" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-400 tracking-wider mb-1.5">Institutional Email</label>
                      <input type="text" disabled value={currentStudentEmail} className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-400 bg-slate-100 outline-none cursor-not-allowed truncate" />
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-3 pb-1 border-b border-slate-100">Section 2: Next of Kin / Guardian</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-400 tracking-wider mb-1.5">Parent / Guardian Name</label>
                      <input type="text" required placeholder="Father or Mother's Full Name" value={parentName} onChange={(e) => setParentName(e.target.value)} className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-800 outline-none focus:border-indigo-600 bg-slate-50/50" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-400 tracking-wider mb-1.5">Parent Emergency Phone</label>
                      <input type="tel" required placeholder="+225 00 00 00 00" value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-800 outline-none focus:border-indigo-600 bg-slate-50/50" />
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button type="submit" disabled={submitting} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm py-4 rounded-xl transition-all cursor-pointer shadow-lg shadow-emerald-500/10">
                    {submitting ? "Processing Profile Commit..." : "Commit Bio Data Registry"}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* PANEL 2: COURSE REGISTRATION HUB */}
          {activePanel === "course_reg" && (
            <div className="space-y-6 sm:space-y-8 no-print-wrapper">
              <div className="bg-white p-5 sm:p-6 md:p-8 rounded-3xl sm:rounded-[2rem] border border-slate-100 shadow-sm">
                <div className="mb-6">
                  <h3 className="text-sm sm:text-base font-black text-slate-800 tracking-tight">Add New Course Registration</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Input your target course descriptors manually to map them into your ongoing portfolio matrix.</p>
                </div>

                <form onSubmit={handleManualCourseSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-400 tracking-wider mb-1.5">Course Name</label>
                    <input type="text" required placeholder="e.g. Mathematics" value={formCourseName} onChange={(e) => setFormCourseName(e.target.value)} className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-800 outline-none focus:border-indigo-600 bg-slate-50/50" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-400 tracking-wider mb-1.5">Course Code</label>
                    <input type="text" required placeholder="e.g. MAT 101" value={formCourseCode} onChange={(e) => setFormCourseCode(e.target.value)} className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-800 outline-none focus:border-indigo-600 bg-slate-50/50 font-mono uppercase" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-400 tracking-wider mb-1.5">School Term</label>
                    <select required value={formSchoolTerm} onChange={(e) => setFormSchoolTerm(e.target.value)} className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-800 outline-none focus:border-indigo-600 bg-slate-50/50">
                      <option value="">Select Academic Term</option>
                      <option value="First Term">First Term</option>
                      <option value="Second Term">Second Term</option>
                      <option value="Third Term">Third Term</option>
                    </select>
                  </div>
                  <div className="sm:col-span-3 pt-2">
                    <button type="submit" disabled={formSubmitting} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm py-3 rounded-xl transition-all shadow-md cursor-pointer">
                      {formSubmitting ? "Linking Academic Rows..." : "Submit & Register Course Entry"}
                    </button>
                  </div>
                </form>
              </div>

              <div className="bg-white p-5 sm:p-6 md:p-8 rounded-3xl sm:rounded-[2rem] border border-slate-100 shadow-sm">
                <div className="mb-4">
                  <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider">Your Registered Academic Records</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Below is the localized live listing of all your currently locked academic registrations.</p>
                </div>
                {performanceRecords.length === 0 ? (
                  <p className="text-sm font-medium text-slate-400 text-center py-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">No registered profiles linked to this student key signature yet.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {performanceRecords.map((record, index) => (
                      <div key={index} className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/40 flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] font-mono font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md uppercase inline-block">{record.courses?.code}</span>
                          <h4 className="text-sm font-black text-slate-800 mt-1 truncate">{record.courses?.name}</h4>
                          {record.school_term && <p className="text-[11px] text-slate-400 font-medium mt-0.5 truncate">🗓️ Term: {record.school_term}</p>}
                        </div>
                        <button type="button" onClick={() => toggleCourseRegistration(record.course_id)} className="text-xs font-bold text-rose-600 hover:text-rose-700 py-2 px-3 bg-rose-50 rounded-xl cursor-pointer flex-shrink-0">Drop</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PANEL 3: ASSIGNMENTS CONTAINER */}
          {activePanel === "assignments" && (
            <div className="bg-white p-5 sm:p-6 md:p-8 rounded-3xl sm:rounded-[2rem] border border-slate-100 shadow-sm no-print-wrapper">
              <div className="mb-6">
                <h3 className="text-base font-black text-slate-800 tracking-tight">Active Assignment Pipelines</h3>
                <p className="text-xs text-slate-400 mt-0.5">Task sheets distributed by faculty for your registered coursework units.</p>
              </div>
              {performanceRecords.length === 0 ? (
                <div className="text-center py-12">
                  <div className="h-12 w-12 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center mx-auto mb-4 text-xl">📂</div>
                  <h3 className="text-sm font-bold text-slate-700">No Assessment Task Profiles Formed</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">Register courses inside the enrollment hub to automatically mount distinct continuous task paths here.</p>
                </div>
              ) : courseAssignments.length === 0 ? (
                <p className="text-sm font-medium text-slate-400 text-center py-8">No published tasks uploaded by instructors for your registered modules yet.</p>
              ) : (
                <div className="space-y-4">
                  {courseAssignments.map((asm) => {
                    const timer = assignmentTimers[asm.id] || { displayString: "Syncing...", isExpired: false };
                    return (
                      <div key={asm.id} className="p-4 sm:p-5 bg-slate-50/50 border border-slate-200/60 rounded-2xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-mono font-bold text-indigo-600 uppercase tracking-wider">{asm.courses?.code}</span>
                            <span className={`text-[9px] px-2 py-0.5 rounded font-black uppercase ${asm.hasSubmitted ? "bg-emerald-100 text-emerald-800" : timer.isExpired ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"}`}>
                              {asm.hasSubmitted ? "Turned In" : timer.isExpired ? "Terminated" : "Pending Action"}
                            </span>
                          </div>
                          <h4 className="text-sm font-black text-slate-800 mt-1 break-words">{asm.title}</h4>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-[11px] text-slate-400 pt-1">
                            <p className="truncate">⏳ Assigned: <span className="font-medium text-slate-600">{new Date(asm.created_at).toLocaleString()}</span></p>
                            {!asm.hasSubmitted && (
                              <p className={`font-mono font-bold ${timer.isExpired ? "text-rose-500" : "text-indigo-600"}`}>
                                🕒 Remaining: {timer.displayString}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap sm:flex-nowrap gap-2 items-center w-full md:w-auto">
                          <a href={asm.file_url} target="_blank" rel="noreferrer" className="flex-1 sm:flex-none text-center bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3.5 py-2.5 rounded-xl transition-all">📖 Briefing File</a>
                          {asm.hasSubmitted ? (
                            <a href={asm.submittedFileUrl} target="_blank" rel="noreferrer" className="flex-1 sm:flex-none text-center bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-xs px-3.5 py-2.5 rounded-xl transition-all">📁 View Turn-In</a>
                          ) : (
                            <button type="button" disabled={timer.isExpired} onClick={() => setSelectedAssignment(asm)} className={`flex-1 sm:flex-none font-bold text-xs px-3.5 py-2.5 rounded-xl transition-all shadow-md items-center justify-center cursor-pointer ${timer.isExpired ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none" : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100"}`}>
                              {timer.isExpired ? "🔒 Locked" : "📤 Upload Task"}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* PANEL 4: RESULTS MATRIX (Rendered via ResultViewer Component) */}
          {activePanel === "results" && (
            <div className="w-full overflow-x-auto">
              <ResultViewer 
                dbResultPin={dbResultPin}
                regNumber={regNumber}
                fullName={fullName}
                studentSection={studentSection}
                classLevel={classLevel}
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