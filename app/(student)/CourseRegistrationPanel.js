"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function CourseRegistrationPanel({
  currentStudentEmail,
  studentSection,
  availableCourses = [],
  registeredCourseIds,
  performanceRecords,
  isJss2Unlocked,
  isJss3ToSs1Transitioned,
  refreshRegistrations,
}) {
  const [selectedSchoolLevelTier, setSelectedSchoolLevelTier] = useState("JSS1");
  const [selectedTermFolder, setSelectedTermFolder] = useState("1st Term");

  // Selection state for available courses to register
  const [selectedCourseIdsToRegister, setSelectedCourseIdsToRegister] = useState([]);
  const [submittingRegistration, setSubmittingRegistration] = useState(false);

  // Edit State (modal or inline editing tracker for a registered record)
  const [editingRecordId, setEditingRecordId] = useState(null);
  const [editTermValue, setEditTermValue] = useState("1st Term");

  // Filter available courses matching the currently selected school level tier
  const filteredAvailableCourses = availableCourses.filter(
    (course) =>
      (course.school_level_tier || "JSS1").toUpperCase() === selectedSchoolLevelTier.toUpperCase()
  );

  // Filter records matching current selected tier and term folder for detailed inspection
  const currentFilteredRecords = performanceRecords.filter(
    (r) => (r.school_level_tier || "JSS1") === selectedSchoolLevelTier && r.school_term === selectedTermFolder
  );

  // Toggle checkbox selection for batch or single course registration
  function handleCheckboxToggle(courseId) {
    if (registeredCourseIds.includes(courseId)) return; // Already registered
    setSelectedCourseIdsToRegister((prev) =>
      prev.includes(courseId) ? prev.filter((id) => id !== courseId) : [...prev, courseId]
    );
  }

  // Handle Multi-Select Registration Submission
  async function handleBatchCourseRegistration(e) {
    e.preventDefault();
    if (!currentStudentEmail || selectedCourseIdsToRegister.length === 0) {
      alert("Please select at least one course to register.");
      return;
    }

    setSubmittingRegistration(true);

    try {
      const rowsToInsert = selectedCourseIdsToRegister.map((courseId) => ({
        student_email: currentStudentEmail,
        course_id: courseId,
        school_term: selectedTermFolder,
        school_level_tier: selectedSchoolLevelTier,
      }));

      const { error: regError } = await supabase
        .from("course_registrations")
        .insert(rowsToInsert);

      if (regError) throw regError;

      if (typeof refreshRegistrations === "function") {
        await refreshRegistrations(currentStudentEmail);
      }

      setSelectedCourseIdsToRegister([]);
      alert("✨ Selected courses successfully registered!");
    } catch (err) {
      alert("Registration Error: " + err.message);
    } finally {
      setSubmittingRegistration(false);
    }
  }

  // Delete Course Registration Entry Explicitly
  async function handleDeleteCourseRegistration(courseId) {
    if (!confirm("Are you sure you want to delete this course registration entry?")) return;
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

  // Clear / Archive Registered Courses for current term and school level tier
  async function handleClearRegisteredCourses(termName) {
    if (!confirm(`Are you sure you want to clear registrations for ${selectedSchoolLevelTier} - ${termName}?`)) return;
    try {
      const { error } = await supabase
        .from("course_registrations")
        .delete()
        .eq("student_email", currentStudentEmail)
        .eq("school_level_tier", selectedSchoolLevelTier)
        .eq("school_term", termName);

      if (error) throw error;
      alert(`✅ Courses successfully cleared for ${selectedSchoolLevelTier} (${termName})!`);
      if (typeof refreshRegistrations === "function") {
        await refreshRegistrations(currentStudentEmail);
      }
    } catch (err) {
      alert("Clear Registration Error: " + err.message);
    }
  }

  // Save Edit / Update an existing registration record term
  async function handleSaveEditRegistration(courseId) {
    try {
      const { error } = await supabase
        .from("course_registrations")
        .update({ school_term: editTermValue })
        .eq("student_email", currentStudentEmail)
        .eq("course_id", courseId)
        .eq("school_level_tier", selectedSchoolLevelTier);

      if (error) throw error;
      alert("✏️ Course registration term successfully updated!");
      setEditingRecordId(null);
      if (typeof refreshRegistrations === "function") {
        await refreshRegistrations(currentStudentEmail);
      }
    } catch (err) {
      alert("Update Error: " + err.message);
    }
  }

  return (
    <div className="space-y-6 sm:space-y-8 no-print-wrapper">
      {/* School Level Tier Selector Navigation */}
      <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Select School Level Tier</h3>
          <p className="text-xs text-slate-400">Choose a milestone folder to filter courses and registrations.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => { setSelectedSchoolLevelTier("JSS1"); setSelectedCourseIdsToRegister([]); }}
            className={`flex-1 sm:flex-none py-2.5 px-4 rounded-xl text-xs font-bold cursor-pointer transition-all ${
              selectedSchoolLevelTier === "JSS1" ? "bg-indigo-600 text-white shadow-md" : "bg-slate-100 text-slate-600"
            }`}
          >
            JSS1
          </button>
          <button
            type="button"
            onClick={() => {
              if (isJss2Unlocked) {
                setSelectedSchoolLevelTier("JSS2");
                setSelectedCourseIdsToRegister([]);
              } else {
                alert("🔒 JSS2 is locked! You must obtain an overall average score >= 50% across JSS1 terms.");
              }
            }}
            className={`flex-1 sm:flex-none py-2.5 px-4 rounded-xl text-xs font-bold cursor-pointer transition-all ${
              selectedSchoolLevelTier === "JSS2"
                ? "bg-indigo-600 text-white shadow-md"
                : isJss2Unlocked
                ? "bg-slate-100 text-slate-600"
                : "bg-slate-100 text-slate-400 opacity-60"
            }`}
          >
            {isJss2Unlocked ? "JSS2" : "🔒 JSS2 (Locked)"}
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedSchoolLevelTier(isJss3ToSs1Transitioned ? "SS1" : "JSS3");
              setSelectedCourseIdsToRegister([]);
            }}
            className={`flex-1 sm:flex-none py-2.5 px-4 rounded-xl text-xs font-bold cursor-pointer transition-all ${
              selectedSchoolLevelTier === "JSS3" || selectedSchoolLevelTier === "SS1"
                ? "bg-indigo-600 text-white shadow-md"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {isJss3ToSs1Transitioned ? "SS1" : "JSS3"}
          </button>
        </div>
      </div>

      {/* Term Folders & Actions */}
      <div className="bg-white p-5 sm:p-6 md:p-8 rounded-3xl sm:rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm sm:text-base font-black text-slate-800 tracking-tight">
              Term Folders for [{selectedSchoolLevelTier}]
            </h3>
            <p className="text-xs text-slate-400">Select a term folder to view or select courses for that specific block.</p>
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
            <h4 className="text-xs font-bold text-amber-900 uppercase">Term Batch Management</h4>
            <p className="text-[11px] text-amber-700 mt-0.5">
              Clear all registrations under <span className="font-bold underline">{selectedSchoolLevelTier} - {selectedTermFolder}</span>.
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

        {/* Efficient Course Selection Panel (Checklist based on Tier Offerings & Assigned Teacher tracking) */}
        <div className="pt-2">
          <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
            Available Courses for {selectedSchoolLevelTier} [{selectedTermFolder}]
          </h4>
          <p className="text-xs text-slate-400 mb-4">
            Check the courses offered for your level below, verify their assigned teachers, and click register.
          </p>

          {filteredAvailableCourses.length === 0 ? (
            <p className="text-sm font-medium text-slate-400 text-center py-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              No preset courses found configured for {selectedSchoolLevelTier}.
            </p>
          ) : (
            <form onSubmit={handleBatchCourseRegistration} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto p-1">
                {filteredAvailableCourses.map((course) => {
                  const isAlreadyRegistered = registeredCourseIds.includes(course.id);
                  const isChecked = selectedCourseIdsToRegister.includes(course.id);

                  return (
                    <div
                      key={course.id}
                      onClick={() => !isAlreadyRegistered && handleCheckboxToggle(course.id)}
                      className={`p-3.5 rounded-2xl border transition-all flex items-start gap-3 ${
                        isAlreadyRegistered
                          ? "bg-slate-100/60 border-slate-200 opacity-70 cursor-not-allowed"
                          : isChecked
                          ? "bg-indigo-50/70 border-indigo-300 cursor-pointer shadow-sm"
                          : "bg-slate-50/50 border-slate-200 hover:border-slate-300 cursor-pointer"
                      }`}
                    >
                      <input
                        type="checkbox"
                        disabled={isAlreadyRegistered}
                        checked={isChecked || isAlreadyRegistered}
                        onChange={() => {}} // handled by outer div click for convenience
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-mono font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md uppercase">
                            {course.code}
                          </span>
                          {isAlreadyRegistered && (
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                              Registered ✓
                            </span>
                          )}
                        </div>
                        <h5 className="text-xs font-black text-slate-800 mt-1 truncate">{course.name}</h5>
                        <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1 font-medium">
                          <span>Teacher Assigned:</span>
                          <span className="font-bold text-slate-700">
                            {course.teacher_name || course.teacher?.full_name || course.assigned_teacher || "Not Assigned"}
                          </span>
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                type="submit"
                disabled={submittingRegistration || selectedCourseIdsToRegister.length === 0}
                className={`w-full font-bold text-sm py-3 rounded-xl transition-all shadow-md ${
                  submittingRegistration || selectedCourseIdsToRegister.length === 0
                    ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                    : "bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
                }`}
              >
                {submittingRegistration ? "Saving Registrations..." : `Register Selected Courses (${selectedCourseIdsToRegister.length})`}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Registered Records Listing with Edit & Delete Controls */}
      <div className="bg-white p-5 sm:p-6 md:p-8 rounded-3xl sm:rounded-[2rem] border border-slate-100 shadow-sm">
        <div className="mb-4">
          <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider">
            Registered Courses for {selectedSchoolLevelTier} ({selectedTermFolder})
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Manage, edit terms, or delete entries for this specific view.</p>
        </div>

        {currentFilteredRecords.length === 0 ? (
          <p className="text-sm font-medium text-slate-400 text-center py-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            No registered courses found under {selectedSchoolLevelTier} - {selectedTermFolder}.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {currentFilteredRecords.map((record, index) => {
              const isEditing = editingRecordId === record.course_id;
              const assignedTeacherName =
                record.courses?.teacher_name ||
                record.courses?.teacher?.full_name ||
                record.courses?.assigned_teacher ||
                record.teacher_name ||
                "Not Assigned";

              return (
                <div key={index} className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/40 flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-mono font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md uppercase inline-block">
                        {record.courses?.code}
                      </span>
                      <h4 className="text-sm font-black text-slate-800 mt-1 truncate">{record.courses?.name}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                        Teacher: <span className="font-bold text-slate-700">{assignedTeacherName}</span>
                      </p>
                    </div>
                    <div className="flex flex-col gap-1.5 items-end flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleDeleteCourseRegistration(record.course_id)}
                        className="text-xs font-bold text-rose-600 hover:text-rose-700 py-1 px-2.5 bg-rose-50 rounded-lg cursor-pointer"
                      >
                        Delete
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
                          Edit
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

                  {/* Inline Edit Form Options */}
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