"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function CourseRegistrationPanel({
  currentStudentEmail,
  studentSection,
  studentClassLevel = "JSS1",
  registeredCourseIds,
  performanceRecords,
  refreshRegistrations,
}) {
  const [selectedSchoolLevelTier, setSelectedSchoolLevelTier] = useState(
    studentClassLevel ? studentClassLevel.toUpperCase() : "JSS1"
  );
  const [selectedTermFolder, setSelectedTermFolder] = useState("1st Term");

  const [selectedCourseIdsToRegister, setSelectedCourseIdsToRegister] = useState([]);
  const [submittingRegistration, setSubmittingRegistration] = useState(false);

  const [editingRecordId, setEditingRecordId] = useState(null);
  const [editTermValue, setEditTermValue] = useState("1st Term");

  // Database State
  const [databaseCourses, setDatabaseCourses] = useState([]);
  const [teachersList, setTeachersList] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    fetchDatabaseMasterData();
  }, []);

  async function fetchDatabaseMasterData() {
    setLoadingData(true);
    try {
      const [coursesRes, teachersRes] = await Promise.all([
        supabase.from("courses").select("*"),
        supabase.from("teachers").select("*")
      ]);

      if (coursesRes.error) throw coursesRes.error;
      if (teachersRes.error) throw teachersRes.error;

      if (coursesRes.data) setDatabaseCourses(coursesRes.data);
      if (teachersRes.data) setTeachersList(teachersRes.data);
    } catch (err) {
      console.error("Error loading master data from Supabase:", err.message);
    } finally {
      setLoadingData(false);
    }
  }

  // Dynamically find the exact teacher assigned to this course code or specialization
  function getAssignedTeacherForCourse(course) {
    const courseCode = (course.code || "").trim().toUpperCase();
    const courseId = (course.id || "").toString().trim();

    // Search through teachers list for matching assigned_subjects array or subject_specialization
    const matchedTeacher = teachersList.find((teacher) => {
      const assignedSubjects = teacher.assigned_subjects || [];
      const specialization = (teacher.subject_specialization || "").trim().toUpperCase();

      const isInArray = assignedSubjects.some(
        (sub) => sub.trim().toUpperCase() === courseCode || sub.trim() === courseId
      );
      const isSpecializationMatch = specialization === courseCode || specialization === courseId;

      return isInArray || isSpecializationMatch;
    });

    if (matchedTeacher && matchedTeacher.name) {
      return matchedTeacher.name;
    }

    if (course.teacher_name) return course.teacher_name;
    if (course.assigned_teacher) return course.assigned_teacher;

    return "Unassigned Faculty";
  }

  const filteredAvailableCourses = databaseCourses.filter((course) => {
    const courseTier = (course.school_level_tier || course.tier || "JSS1").toUpperCase();
    const currentTier = selectedSchoolLevelTier.toUpperCase();
    if (currentTier.includes("PRIMARY")) {
      return courseTier.includes("PRIMARY");
    }
    return courseTier === currentTier || courseTier === "JSS1";
  });

  const currentFilteredRecords = performanceRecords.filter(
    (r) => (r.school_level_tier || "JSS1").toUpperCase() === selectedSchoolLevelTier.toUpperCase() && r.school_term === selectedTermFolder
  );

  function handleCheckboxToggle(courseId) {
    if (registeredCourseIds.includes(courseId)) return;
    setSelectedCourseIdsToRegister((prev) =>
      prev.includes(courseId) ? prev.filter((id) => id !== courseId) : [...prev, courseId]
    );
  }

  async function handleBatchCourseRegistration(e) {
    e.preventDefault();
    if (!currentStudentEmail || selectedCourseIdsToRegister.length === 0) {
      alert("Please select at least one course to register.");
      return;
    }

    setSubmittingRegistration(true);

    try {
      const rowsToInsert = selectedCourseIdsToRegister.map((courseId) => {
        return {
          student_email: currentStudentEmail,
          course_id: courseId,
          school_term: selectedTermFolder,
          school_level_tier: selectedSchoolLevelTier
        };
      });

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
      {/* School Level Tier Selector */}
      <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Active Student Class & Tier</h3>
          <p className="text-xs text-slate-400">Displaying database course curriculum filtered by class profile ({selectedSchoolLevelTier}).</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto overflow-x-auto">
          {["PRIMARY 1", "JSS1", "JSS2", "JSS3", "SS1"].map((tier) => (
            <button
              key={tier}
              type="button"
              onClick={() => {
                setSelectedSchoolLevelTier(tier);
                setSelectedCourseIdsToRegister([]);
              }}
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
            <p className="text-xs text-slate-400">Select a term folder to check or register specific database courses.</p>
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
              Clear all course registrations under <span className="font-bold underline">{selectedSchoolLevelTier} - {selectedTermFolder}</span>.
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

        {/* Dynamic Database Courses Selection Panel */}
        <div className="pt-2">
          <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
            Database Courses for {selectedSchoolLevelTier} [{selectedTermFolder}]
          </h4>
          <p className="text-xs text-slate-400 mb-4">
            Courses and instructors are loaded live from your Supabase tables (<span className="font-semibold text-slate-600">courses</span> & <span className="font-semibold text-slate-600">teachers</span>).
          </p>

          {loadingData ? (
            <p className="text-sm font-medium text-slate-400 text-center py-6 bg-slate-50 rounded-2xl border border-slate-200">
              Loading courses and teachers from database...
            </p>
          ) : filteredAvailableCourses.length === 0 ? (
            <p className="text-sm font-medium text-slate-400 text-center py-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              No courses found in your Supabase 'courses' table matching tier: {selectedSchoolLevelTier}. Please verify your database rows.
            </p>
          ) : (
            <form onSubmit={handleBatchCourseRegistration} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto p-1">
                {filteredAvailableCourses.map((course) => {
                  const courseIdKey = course.id || course.code;
                  const isAlreadyRegistered = registeredCourseIds.includes(courseIdKey);
                  const isChecked = selectedCourseIdsToRegister.includes(courseIdKey);
                  const assignedTeacher = getAssignedTeacherForCourse(course);

                  return (
                    <div
                      key={courseIdKey}
                      onClick={() => !isAlreadyRegistered && handleCheckboxToggle(courseIdKey)}
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
                        onChange={() => {}}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-mono font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md uppercase">
                            {course.code || "CRS"}
                          </span>
                          {isAlreadyRegistered && (
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                              Registered ✓
                            </span>
                          )}
                        </div>
                        <h5 className="text-xs font-black text-slate-800 mt-1 truncate">{course.title || course.name}</h5>
                        <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1 font-medium">
                          <span>Instructor:</span>
                          <span className="font-bold text-slate-700">{assignedTeacher}</span>
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
                {submittingRegistration ? "Saving Registrations..." : `Save & Register Selected Courses (${selectedCourseIdsToRegister.length})`}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Registered Records Listing */}
      <div className="bg-white p-5 sm:p-6 md:p-8 rounded-3xl sm:rounded-[2rem] border border-slate-100 shadow-sm">
        <div className="mb-4">
          <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider">
            Registered Courses & Teachers for {selectedSchoolLevelTier} ({selectedTermFolder})
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Review saved course selections, track assigned instructors, or edit/delete entries.</p>
        </div>

        {currentFilteredRecords.length === 0 ? (
          <p className="text-sm font-medium text-slate-400 text-center py-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            No registered courses found under {selectedSchoolLevelTier} - {selectedTermFolder}.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {currentFilteredRecords.map((record, index) => {
              const isEditing = editingRecordId === record.course_id;
              
              const matchedDbCourse = databaseCourses.find(c => c.id === record.course_id || c.code === record.course_id);
              const assignedTeacherName = matchedDbCourse ? getAssignedTeacherForCourse(matchedDbCourse) : "Unassigned Faculty";

              return (
                <div key={index} className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/40 flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-mono font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md uppercase inline-block">
                        {record.courses?.code || record.course_id}
                      </span>
                      <h4 className="text-sm font-black text-slate-800 mt-1 truncate">{record.courses?.name || record.courses?.title || matchedDbCourse?.title || "Course Unit"}</h4>
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