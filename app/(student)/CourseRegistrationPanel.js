"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function CourseRegistrationPanel({
  currentStudentEmail,
  studentSection,
  studentClassLevel = "JSS1",
  registeredCourseIds = [],
  performanceRecords = [],
  refreshRegistrations,
}) {
  // 1. Strictly capture the exact class level (e.g., "JSS1", "PRIMARY 2", "SS3")
  const rawTier = studentClassLevel || studentSection || "JSS1";
  const activeClassTier = rawTier.toUpperCase().trim();

  // Extract level identifier for smart mapping (e.g., "JSS1", "PRY2")
  const isPrimaryStudent = activeClassTier.includes("PRIMARY") || activeClassTier.includes("PRI") || activeClassTier.includes("PRY");

  const [selectedTermFolder, setSelectedTermFolder] = useState("1st Term");
  const [editingRecordId, setEditingRecordId] = useState(null);
  const [editTermValue, setEditTermValue] = useState("1st Term");
  const [autoRegistering, setAutoRegistering] = useState(false);

  // Database State
  const [teachersList, setTeachersList] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // Master Subject Title Dictionary
  const subjectTitleMap = {
    "MTH-JSS1": "Mathematics",
    "ENG-JSS1": "English Language",
    "BAS-JSS1": "Basic Science",
    "BUS-JSS1": "Business Studies",
    "SST-JSS1": "Social Studies",
    "MTH-SEC": "Mathematics",
    "ENG-SEC": "English Language",
    "BAS-SEC": "Basic Science",
    "BUS-SEC": "Business Studies"
  };

  useEffect(() => {
    fetchDatabaseMasterData();
  }, []);

  async function fetchDatabaseMasterData() {
    setLoadingData(true);
    try {
      const { data: teachersRes, error: teachersErr } = await supabase
        .from("teachers")
        .select("*");

      if (teachersErr) throw teachersErr;
      if (teachersRes) setTeachersList(teachersRes);
    } catch (err) {
      console.error("Error loading teachers master data from Supabase:", err.message);
    } finally {
      setLoadingData(false);
    }
  }

  // 2. Derive courses by matching teachers assigned specifically to this class tier (e.g., JSS1)
  const derivedAvailableCourses = [];
  const seenCourseCodes = new Set();

  teachersList.forEach((teacher) => {
    const rawSubjects = teacher.assigned_subjects || [];
    const subjects = Array.isArray(rawSubjects) ? rawSubjects : [rawSubjects];
    const spec = (teacher.subject_specialization || "").replace(/[*\[\]"]/g, "").trim();
    
    const allTeacherCodes = [...subjects, spec];

    allTeacherCodes.forEach((code) => {
      if (!code) return;
      const cleanCode = String(code).replace(/[*\[\]"]/g, "").trim().toUpperCase();

      // Check if the teacher's assigned code matches the student's exact class tier (e.g., contains "JSS1")
      const matchesClassLevel = cleanCode.includes(activeClassTier) || cleanCode === activeClassTier || cleanCode.includes(`-${activeClassTier}`);
      const isGeneralSecondaryFallback = !isPrimaryStudent && (cleanCode.includes("SEC") || cleanCode.includes("JSS"));

      if ((matchesClassLevel || isGeneralSecondaryFallback) && cleanCode && !seenCourseCodes.has(cleanCode)) {
        seenCourseCodes.add(cleanCode);
        derivedAvailableCourses.push({
          id: cleanCode,
          code: cleanCode,
          title: subjectTitleMap[cleanCode] || cleanCode.replace(/-/g, " "),
          teacher_name: teacher.name || teacher.full_name || "Assigned Faculty",
          teacher_id: teacher.id || teacher.teacher_id || null
        });
      }
    });
  });

  // Fallback curriculum if teachers haven't been explicitly tagged with the class code yet
  if (derivedAvailableCourses.length === 0 && !loadingData) {
    const defaultCodes = isPrimaryStudent 
      ? [`ENG-${activeClassTier}`, `MTH-${activeClassTier}`]
      : [`MTH-${activeClassTier}`, `ENG-${activeClassTier}`, `BAS-${activeClassTier}`, `BUS-${activeClassTier}`];
      
    defaultCodes.forEach(code => {
      derivedAvailableCourses.push({
        id: code,
        code: code,
        title: subjectTitleMap[code] || code.replace(/-/g, " "),
        teacher_name: "Assigned Faculty",
        teacher_id: null
      });
    });
  }

  // 3. Find exact teacher assigned to a specific course code
  function getAssignedTeacherForCourseCode(courseCode) {
    const target = (courseCode || "").replace(/[*\[\]"]/g, "").trim().toUpperCase();
    const matched = teachersList.find((teacher) => {
      const subjects = teacher.assigned_subjects || [];
      const spec = (teacher.subject_specialization || "").replace(/[*\[\]"]/g, "").trim().toUpperCase();
      
      const matchesSubject = subjects.some((s) => {
        const cleanS = String(s).replace(/[*\[\]"]/g, "").trim().toUpperCase();
        return cleanS === target || cleanS.includes(target) || target.includes(cleanS);
      });

      return matchesSubject || spec === target || spec.includes(target);
    });

    return matched ? (matched.name || matched.full_name || "Assigned Faculty") : "Assigned Faculty";
  }

  // 4. Sync Registrations automatically to Supabase so it populates the Teacher Dashboard instantly
  useEffect(() => {
    if (!loadingData && currentStudentEmail && derivedAvailableCourses.length > 0) {
      syncAutomaticRegistrations();
    }
  }, [loadingData, activeClassTier, selectedTermFolder, teachersList]);

  async function syncAutomaticRegistrations() {
    if (!currentStudentEmail || derivedAvailableCourses.length === 0) return;
    setAutoRegistering(true);
    try {
      const rowsToInsert = derivedAvailableCourses.map((course) => ({
        student_email: currentStudentEmail,
        course_id: course.id,
        school_term: selectedTermFolder,
        school_level_tier: activeClassTier, // Explicitly saves as "JSS1"
        teacher_id: course.teacher_id || null
      }));

      const { error: regError } = await supabase
        .from("course_registrations")
        .upsert(rowsToInsert, { onConflict: "student_email,course_id,school_term,school_level_tier" });

      if (regError) throw regError;

      if (typeof refreshRegistrations === "function") {
        await refreshRegistrations(currentStudentEmail);
      }
    } catch (err) {
      console.error("Auto-registration sync error:", err.message);
    } finally {
      setAutoRegistering(false);
    }
  }

  const currentFilteredRecords = performanceRecords.filter(
    (r) => (r.school_level_tier || "").toUpperCase().trim() === activeClassTier && r.school_term === selectedTermFolder
  );

  const displayRecords = currentFilteredRecords.length > 0 ? currentFilteredRecords : derivedAvailableCourses.map(c => ({
    course_id: c.id,
    school_term: selectedTermFolder,
    school_level_tier: activeClassTier
  }));

  async function handleDeleteCourseRegistration(courseId) {
    if (!confirm("Are you sure you want to remove this course assignment from your profile?")) return;
    try {
      const { error } = await supabase
        .from("course_registrations")
        .delete()
        .eq("student_email", currentStudentEmail)
        .eq("course_id", courseId)
        .eq("school_level_tier", activeClassTier)
        .eq("school_term", selectedTermFolder);

      if (error) throw error;
      if (typeof refreshRegistrations === "function") {
        await refreshRegistrations(currentStudentEmail);
      }
    } catch (err) {
      alert("Delete Error: " + err.message);
    }
  }

  async function handleClearRegisteredCourses(termName) {
    if (!confirm(`Are you sure you want to clear all automated course profiles for ${activeClassTier} - ${termName}?`)) return;
    try {
      const { error } = await supabase
        .from("course_registrations")
        .delete()
        .eq("student_email", currentStudentEmail)
        .eq("school_level_tier", activeClassTier)
        .eq("school_term", termName);

      if (error) throw error;
      alert(`✅ Curriculum successfully cleared for ${activeClassTier} (${termName})!`);
      if (typeof refreshRegistrations === "function") {
        await refreshRegistrations(currentStudentEmail);
      }
    } catch (err) {
      alert("Clear Error: " + err.message);
    }
  }

  async function handleSaveEditRegistration(courseId) {
    try {
      const { error } = await supabase
        .from("course_registrations")
        .update({ school_term: editTermValue })
        .eq("student_email", currentStudentEmail)
        .eq("course_id", courseId)
        .eq("school_level_tier", activeClassTier);

      if (error) throw error;
      alert("✏️ Course term profile successfully updated!");
      setEditingRecordId(null);
      if (typeof refreshRegistrations === "function") {
        await refreshRegistrations(currentStudentEmail);
      }
    } catch (err) {
      alert("Update Error: " + err.message);
    }
  }

  return (
    <div className="space-y-6 sm:space-y-8 no-print-wrapper font-sans">
      {/* Exact Student Class & Tier Banner (Shows JSS1 instead of Secondary) */}
      <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Active Student Class & Tier (Locked)</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Curriculum is strictly locked to your profile class level. Update your biodata to switch classes.
          </p>
        </div>
        <div className="bg-indigo-600 text-white font-black py-2.5 px-5 rounded-2xl text-xs uppercase tracking-wider shadow-md shadow-indigo-100 flex items-center gap-2">
          🔒 {activeClassTier}
        </div>
      </div>

      {/* Term Folders & Actions */}
      <div className="bg-white p-5 sm:p-6 md:p-8 rounded-3xl sm:rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm sm:text-base font-black text-slate-800 tracking-tight">
              Term Folders for [{activeClassTier}]
            </h3>
            <p className="text-xs text-slate-400">Select a term folder to inspect automated curriculum mapping.</p>
          </div>
          <div className="flex gap-2">
            {["1st Term", "2nd Term", "3rd Term"].map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => setSelectedTermFolder(term)}
                className={`py-2 px-3 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                  selectedTermFolder === term
                    ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                    : "bg-slate-50 text-slate-600 border border-transparent"
                }`}
              >
                📁 {term}
              </button>
            ))}
          </div>
        </div>

        {/* Clear Term Storage Option */}
        <div className="flex items-center justify-between p-4 bg-amber-50/60 border border-amber-200/60 rounded-2xl">
          <div>
            <h4 className="text-xs font-bold text-amber-900 uppercase">Term Curriculum Management</h4>
            <p className="text-[11px] text-amber-700 mt-0.5">
              Reset automated records under <span className="font-bold underline">{activeClassTier} - {selectedTermFolder}</span>.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleClearRegisteredCourses(selectedTermFolder)}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition-all cursor-pointer shadow-sm flex-shrink-0"
          >
            Clear {activeClassTier} ({selectedTermFolder})
          </button>
        </div>
      </div>

      {/* Automated Registered Records Listing */}
      <div className="bg-white p-5 sm:p-6 md:p-8 rounded-3xl sm:rounded-[2rem] border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider">
              Assigned Courses & Instructors for {activeClassTier} ({selectedTermFolder})
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {autoRegistering ? "Synchronizing automated curriculum..." : "All curriculum courses assigned to your class level via teachers table are listed below."}
            </p>
          </div>
        </div>

        {loadingData ? (
          <p className="text-sm font-medium text-slate-400 text-center py-6 bg-slate-50 rounded-2xl border border-slate-200">
            Loading course curriculum from teacher assignments...
          </p>
        ) : displayRecords.length === 0 ? (
          <p className="text-sm font-medium text-slate-400 text-center py-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            No courses mapped under {activeClassTier} - {selectedTermFolder}. Please check your 'teachers' assigned subjects configuration.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {displayRecords.map((record, index) => {
              const isEditing = editingRecordId === record.course_id;
              const courseCode = record.course_id;
              const courseTitle = subjectTitleMap[courseCode] || record.courses?.title || record.courses?.name || courseCode.replace(/-/g, " ");
              const assignedTeacherName = getAssignedTeacherForCourseCode(courseCode);

              return (
                <div key={index} className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/40 flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-mono font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md uppercase inline-block">
                        {courseCode}
                      </span>
                      <h4 className="text-sm font-black text-slate-800 mt-1 truncate">
                        {courseTitle}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                        Instructor: <span className="font-bold text-slate-700">{assignedTeacherName}</span>
                      </p>
                    </div>
                    <div className="flex flex-col gap-1.5 items-end flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleDeleteCourseRegistration(record.course_id)}
                        className="text-xs font-bold text-rose-600 hover:text-rose-700 py-1 px-2.5 bg-rose-50 rounded-lg cursor-pointer"
                      >
                        Remove
                      </button>
                      {!isEditing ? (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingRecordId(record.course_id);
                            setEditTermValue(record.school_term);
                          }}
                          className="text-xs font-bold text-indigo-600 hover:text-indigo-700 py-1 px-2.5 bg-indigo-50 rounded-lg cursor-pointer"
                        >
                          Edit Term
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setEditingRecordId(null)}
                          className="text-xs font-bold text-slate-500 hover:text-slate-700 py-1 px-2 bg-slate-200 rounded-lg cursor-pointer"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>

                  {isEditing && (
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-200/50">
                      <span className="text-[11px] text-slate-400 font-bold">New Term:</span>
                      <select
                        value={editTermValue}
                        onChange={(e) => setEditTermValue(e.target.value)}
                        className="text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg p-1.5 outline-none focus:border-indigo-600 flex-1"
                      >
                        <option value="1st Term">1st Term</option>
                        <option value="2nd Term">2nd Term</option>
                        <option value="3rd Term">3rd Term</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => handleSaveEditRegistration(record.course_id)}
                        className="text-xs font-bold bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 cursor-pointer"
                      >
                        Save
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}