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
  const [selectedSchoolLevelTier, setSelectedSchoolLevelTier] = useState(
    studentClassLevel ? studentClassLevel.toUpperCase() : "JSS1"
  );
  const [selectedTermFolder, setSelectedTermFolder] = useState("1st Term");

  const [editingRecordId, setEditingRecordId] = useState(null);
  const [editTermValue, setEditTermValue] = useState("1st Term");
  const [autoRegistering, setAutoRegistering] = useState(false);

  // Database State
  const [teachersList, setTeachersList] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // Master Subject Title Dictionary for code-to-title translation
  const subjectTitleMap = {
    // Primary
    "ENG-PRI": "English Studies",
    "MTH-PRI": "Mathematics",
    "BST-PRI": "Basic Science and Technology",
    "PHE-PRI": "Physical and Health Education",
    "CCA-PRI": "Cultural and Creative Arts",
    "CRS-PRI": "Christian Religious Studies",
    "IRS-PRI": "Islamic Religious Studies",
    "SOS-PRI": "Social Studies",
    "GAR-PRI": "Agricultural Science",
    // Secondary / General
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

  useEffect(() => {
    fetchDatabaseMasterData();
  }, []);

  // Whenever class level prop changes from profile updates, sync local state
  useEffect(() => {
    if (studentClassLevel) {
      setSelectedSchoolLevelTier(studentClassLevel.toUpperCase());
    }
  }, [studentClassLevel]);

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

  // Derive unique courses dynamically from teachers matching the selected tier
  const derivedAvailableCourses = [];
  const seenCourseCodes = new Set();

  const activeTierKey = selectedSchoolLevelTier.toLowerCase().includes("primary") ? "primary" : "secondary";

  teachersList.forEach((teacher) => {
    // Only look at teachers matching the school tier track (or general/all)
    const teacherTier = (teacher.school_tier || "secondary").toLowerCase();
    if (teacherTier === activeTierKey) {
      const subjects = teacher.assigned_subjects || [];
      subjects.forEach((code) => {
        const cleanCode = code.trim().toUpperCase();
        if (cleanCode && !seenCourseCodes.has(cleanCode)) {
          seenCourseCodes.add(cleanCode);
          derivedAvailableCourses.push({
            id: cleanCode,
            code: cleanCode,
            title: subjectTitleMap[cleanCode] || cleanCode,
            teacher_name: teacher.name || "Assigned Faculty"
          });
        }
      });

      // Also account for legacy/single specialization field if present
      const spec = (teacher.subject_specialization || "").trim().toUpperCase();
      if (spec && !seenCourseCodes.has(spec)) {
        seenCourseCodes.add(spec);
        derivedAvailableCourses.push({
          id: spec,
          code: spec,
          title: subjectTitleMap[spec] || spec,
          teacher_name: teacher.name || "Assigned Faculty"
        });
      }
    }
  });

  // Dynamically map assigned teacher for a specific course code from the teacher roster
  function getAssignedTeacherForCourseCode(courseCode) {
    const target = (courseCode || "").trim().toUpperCase();
    const matched = teachersList.find((teacher) => {
      const assigned = teacher.assigned_subjects || [];
      const spec = (teacher.subject_specialization || "").trim().toUpperCase();
      return (
        assigned.some((s) => s.trim().toUpperCase() === target) ||
        spec === target
      );
    });
    return matched ? matched.name : "Unassigned Faculty";
  }

  // Automatically execute backend registration for all derived tier courses when data changes
  useEffect(() => {
    if (!loadingData && currentStudentEmail && derivedAvailableCourses.length > 0) {
      syncAutomaticRegistrations();
    }
  }, [loadingData, selectedSchoolLevelTier, selectedTermFolder, teachersList]);

  async function syncAutomaticRegistrations() {
    if (!currentStudentEmail || derivedAvailableCourses.length === 0) return;
    setAutoRegistering(true);
    try {
      const rowsToInsert = derivedAvailableCourses.map((course) => ({
        student_email: currentStudentEmail,
        course_id: course.id,
        school_term: selectedTermFolder,
        school_level_tier: selectedSchoolLevelTier
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
    (r) => (r.school_level_tier || "JSS1").toUpperCase() === selectedSchoolLevelTier.toUpperCase() && r.school_term === selectedTermFolder
  );

  async function handleDeleteCourseRegistration(courseId) {
    if (!confirm("Are you sure you want to remove this course assignment from your profile?")) return;
    try {
      const { error } = await supabase
        .from("course_registrations")
        .delete()
        .eq("student_email", currentStudentEmail)
        .eq("course_id", courseId)
        .eq("school_level_tier", selectedSchoolLevelTier)
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
    if (!confirm(`Are you sure you want to clear all automated course profiles for ${selectedSchoolLevelTier} - ${termName}?`)) return;
    try {
      const { error } = await supabase
        .from("course_registrations")
        .delete()
        .eq("student_email", currentStudentEmail)
        .eq("school_level_tier", selectedSchoolLevelTier)
        .eq("school_term", termName);

      if (error) throw error;
      alert(`✅ Curriculum successfully cleared for ${selectedSchoolLevelTier} (${termName})!`);
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
        .eq("school_level_tier", selectedSchoolLevelTier);

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
      {/* School Level Tier Selector */}
      <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Active Student Class & Tier</h3>
          <p className="text-xs text-slate-400">Curriculum maps automatically based on class profile ({selectedSchoolLevelTier}).</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto overflow-x-auto">
          {["PRIMARY 1", "JSS1", "JSS2", "JSS3", "SS1"].map((tier) => (
            <button
              key={tier}
              type="button"
              onClick={() => setSelectedSchoolLevelTier(tier)}
              className={`py-2.5 px-4 rounded-xl text-xs font-bold cursor-pointer transition-all flex-shrink-0 ${
                selectedSchoolLevelTier === tier ? "bg-indigo-600 text-white shadow-md" : "bg-slate-100 text-slate-600"
              }`}
            >
              {tier}
            </button>
          ))}
        </div>
      </div>

      {/* Term Folders & Actions */}
      <div className="bg-white p-5 sm:p-6 md:p-8 rounded-3xl sm:rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm sm:text-base font-black text-slate-800 tracking-tight">
              Term Folders for [{selectedSchoolLevelTier}]
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
              Reset automated records under <span className="font-bold underline">{selectedSchoolLevelTier} - {selectedTermFolder}</span>.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleClearRegisteredCourses(selectedTermFolder)}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition-all cursor-pointer shadow-sm flex-shrink-0"
          >
            Clear {selectedSchoolLevelTier} ({selectedTermFolder})
          </button>
        </div>
      </div>

      {/* Automated Registered Records Listing */}
      <div className="bg-white p-5 sm:p-6 md:p-8 rounded-3xl sm:rounded-[2rem] border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider">
              Assigned Courses & Instructors for {selectedSchoolLevelTier} ({selectedTermFolder})
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
        ) : currentFilteredRecords.length === 0 ? (
          <p className="text-sm font-medium text-slate-400 text-center py-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            No courses mapped under {selectedSchoolLevelTier} - {selectedTermFolder}. Please check your 'teachers' assigned subjects configuration.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {currentFilteredRecords.map((record, index) => {
              const isEditing = editingRecordId === record.course_id;
              const courseCode = record.course_id;
              const courseTitle = subjectTitleMap[courseCode] || record.courses?.title || record.courses?.name || courseCode;
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