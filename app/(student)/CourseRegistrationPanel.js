"use client";

import { useState } from "react";
import { supabase } from "../../../lib/supabaseClient";

export default function CourseRegistrationPanel({
  currentStudentEmail,
  studentSection,
  availableCourses,
  registeredCourseIds,
  performanceRecords,
  isJss2Unlocked,
  isJss3ToSs1Transitioned,
  refreshRegistrations,
}) {
  const [selectedSchoolLevelTier, setSelectedSchoolLevelTier] = useState("JSS1");
  const [selectedTermFolder, setSelectedTermFolder] = useState("1st Term");

  // Manual Form Field States
  const [formCourseName, setFormCourseName] = useState("");
  const [formCourseCode, setFormCourseCode] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Delete Course Registration Entry Explicitly
  async function handleDeleteCourseRegistration(courseId) {
    if (!confirm("Are you sure you want to delete this course registration entry?")) return;
    try {
      const { error } = await supabase
        .from("course_registrations")
        .delete()
        .eq("student_email", currentStudentEmail)
        .eq("course_id", courseId);

      if (error) throw error;
      await refreshRegistrations(currentStudentEmail);
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
      await refreshRegistrations(currentStudentEmail);
    } catch (err) {
      alert("Clear Registration Error: " + err.message);
    }
  }

  // Edit / Update an existing registration record entry term
  async function handleEditCourseRegistration(courseId, newTerm) {
    try {
      const { error } = await supabase
        .from("course_registrations")
        .update({ school_term: newTerm })
        .eq("student_email", currentStudentEmail)
        .eq("course_id", courseId);

      if (error) throw error;
      alert("✏️ Course registration term successfully updated!");
      await refreshRegistrations(currentStudentEmail);
    } catch (err) {
      alert("Update Error: " + err.message);
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
            section: sanitizedSection,
          })
          .select("id")
          .single();

        if (insertCourseErr) throw insertCourseErr;
        targetCourseId = newCourse.id;
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
          school_term: selectedTermFolder,
          school_level_tier: selectedSchoolLevelTier,
        });
      if (regError) throw regError;

      await refreshRegistrations(currentStudentEmail);

      setFormCourseName("");
      setFormCourseCode("");
      alert("✨ Custom Course Entry saved and committed successfully!");
    } catch (err) {
      alert("Form Registration Error: " + err.message);
    } finally {
      setFormSubmitting(false);
    }
  }

  // Filter records matching current selected tier and term folder
  const currentFilteredRecords = performanceRecords.filter(
    (r) => (r.school_level_tier || "JSS1") === selectedSchoolLevelTier && r.school_term === selectedTermFolder
  );

  return (
    <div className="space-y-6 sm:space-y-8 no-print-wrapper">
      {/* School Level Tier Selector Navigation */}
      <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Select School Level Tier</h3>
          <p className="text-xs text-slate-400">Choose a milestone folder to filter and inspect registered courses.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setSelectedSchoolLevelTier("JSS1")}
            className={`flex-1 sm:flex-none py-2.5 px-4 rounded-xl text-xs font-bold cursor-pointer transition-all ${
              selectedSchoolLevelTier === "JSS1" ? "bg-indigo-600 text-white shadow-md" : "bg-slate-100 text-slate-600"
            }`}
          >
            JSS1
          </button>
          <button
            type="button"
            onClick={() =>
              isJss2Unlocked
                ? setSelectedSchoolLevelTier("JSS2")
                : alert("🔒 JSS2 is locked! You must obtain an overall average score >= 50% across JSS1 terms.")
            }
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
            onClick={() => setSelectedSchoolLevelTier(isJss3ToSs1Transitioned ? "SS1" : "JSS3")}
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
            <p className="text-xs text-slate-400">Select a term folder to view or register courses for that specific block.</p>
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

        {/* Manual Course Entry Form */}
        <div className="pt-2">
          <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-3">
            Add Course for {selectedSchoolLevelTier} [{selectedTermFolder}]
          </h4>
          <form onSubmit={handleManualCourseSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 tracking-wider mb-1.5">Course Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Mathematics"
                value={formCourseName}
                onChange={(e) => setFormCourseName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-800 outline-none focus:border-indigo-600 bg-slate-50/50"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 tracking-wider mb-1.5">Course Code</label>
              <input
                type="text"
                required
                placeholder="e.g. MAT 101"
                value={formCourseCode}
                onChange={(e) => setFormCourseCode(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-800 outline-none focus:border-indigo-600 bg-slate-50/50 font-mono uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 tracking-wider mb-1.5">Active Term Folder</label>
              <input
                type="text"
                disabled
                value={selectedTermFolder}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm text-indigo-700 bg-indigo-50 font-bold outline-none cursor-not-allowed"
              />
            </div>
            <div className="sm:col-span-3 pt-2">
              <button
                type="submit"
                disabled={formSubmitting}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm py-3 rounded-xl transition-all shadow-md cursor-pointer"
              >
                {formSubmitting ? "Linking Academic Rows..." : `Submit & Register Course Entry for ${selectedSchoolLevelTier}`}
              </button>
            </div>
          </form>
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
            {currentFilteredRecords.map((record, index) => (
              <div key={index} className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/40 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-mono font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md uppercase inline-block">
                      {record.courses?.code}
                    </span>
                    <h4 className="text-sm font-black text-slate-800 mt-1 truncate">{record.courses?.name}</h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteCourseRegistration(record.course_id)}
                    className="text-xs font-bold text-rose-600 hover:text-rose-700 py-1.5 px-3 bg-rose-50 rounded-xl cursor-pointer flex-shrink-0"
                  >
                    Delete
                  </button>
                </div>

                {/* Edit Term Reassignment */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-200/50">
                  <span className="text-[11px] text-slate-400 font-bold">Move Term:</span>
                  <select
                    value={record.school_term}
                    onChange={(e) => handleEditCourseRegistration(record.course_id, e.target.value)}
                    className="text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg p-1.5 outline-none focus:border-indigo-600 flex-1"
                  >
                    <option value="1st Term">1st Term</option>
                    <option value="2nd Term">2nd Term</option>
                    <option value="3rd Term">3rd Term</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}