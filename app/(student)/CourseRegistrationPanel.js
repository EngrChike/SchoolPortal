"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function CourseRegistrationPanel({
  currentStudentEmail,
  studentSection,
  studentClassLevel = "JSS1",
  availableCourses = [],
  registeredCourseIds,
  performanceRecords,
  isJss2Unlocked,
  isJss3ToSs1Transitioned,
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

  // Dynamic teachers fetched from Supabase
  const [teachersList, setTeachersList] = useState([]);

  useEffect(() => {
    fetchTeachers();
  }, []);

  async function fetchTeachers() {
    try {
      const { data, error } = await supabase.from("teachers").select("*");
      if (error) throw error;
      if (data) {
        setTeachersList(data);
      }
    } catch (err) {
      console.error("Error fetching teachers:", err.message);
    }
  }

  // Helper to assign teachers dynamically if not hardcoded in the course list
  function getAssignedTeacherForCourse(courseCode, defaultTeacher) {
    if (defaultTeacher && defaultTeacher !== "Not Assigned" && defaultTeacher !== "Assigned Faculty") {
      return defaultTeacher;
    }
    // Fallback rotation or assignment from fetched teachers table
    if (teachersList.length > 0) {
      // Simple logic mapping course code length or index to available teachers (Ola, Ndu, Ada, etc.)
      const index = Math.abs(hashCode(courseCode)) % teachersList.length;
      return teachersList[index].name;
    }
    return defaultTeacher || "Assigned Faculty";
  }

  function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }

  const primarySubjectsList = [
    { code: "ENG-PRI", title: "English Studies", school_level_tier: "PRIMARY 1", teacher_name: "Mrs. Adebayo" },
    { code: "MTH-PRI", title: "Mathematics", school_level_tier: "PRIMARY 1", teacher_name: "Mr. Okoro" },
    { code: "BST-PRI", title: "Basic Science and Technology", school_level_tier: "PRIMARY 1", teacher_name: "Dr. Danjuma" },
    { code: "PHE-PRI", title: "Physical and Health Education", school_level_tier: "PRIMARY 1", teacher_name: "Coach Peters" },
    { code: "CCA-PRI", title: "Cultural and Creative Arts", school_level_tier: "PRIMARY 1", teacher_name: "Ms. Bello" },
    { code: "CRS-PRI", title: "Christian Religious Studies", school_level_tier: "PRIMARY 1", teacher_name: "Rev. James" },
    { code: "IRS-PRI", title: "Islamic Religious Studies", school_level_tier: "PRIMARY 1", teacher_name: "Mallam Ibrahim" },
    { code: "SOS-PRI", title: "Social Studies", school_level_tier: "PRIMARY 1", teacher_name: "Mrs. Nnamdi" },
    { code: "GAR-PRI", title: "Agricultural Science", school_level_tier: "PRIMARY 1", teacher_name: "Mr. Eze" }
  ];

  const secondarySubjectsList = [
    { code: "MTH-SEC", title: "Mathematics (JSS - SS)", school_level_tier: "JSS1", teacher_name: "Mr. Okoro" },
    { code: "ENG-SEC", title: "English Language (JSS - SS)", school_level_tier: "JSS1", teacher_name: "Mrs. Adebayo" },
    { code: "BAS-SEC", title: "Basic Science (JSS)", school_level_tier: "JSS1", teacher_name: "Dr. Danjuma" },
    { code: "BUS-SEC", title: "Business Studies (JSS)", school_level_tier: "JSS1", teacher_name: "Mr. Paul" },
    { code: "SST-SEC", title: "Social Studies / Civics (JSS)", school_level_tier: "JSS1", teacher_name: "Mrs. Nnamdi" },
    { code: "CRS-SEC", title: "Christian Religious Studies", school_level_tier: "JSS1", teacher_name: "Rev. James" },
    { code: "AGR-SEC", title: "Agricultural Science", school_level_tier: "JSS1", teacher_name: "Mr. Eze" },
    { code: "CMP-SEC", title: "Computer Studies / ICT", school_level_tier: "JSS1", teacher_name: "Engr. Chike" },
    
    { code: "BIO-SEC", title: "Biology", school_level_tier: "JSS2", teacher_name: "Dr. Danjuma" },
    { code: "CHM-SEC", title: "Chemistry", school_level_tier: "SS1", teacher_name: "Mr. Smith" },
    { code: "PHY-SEC", title: "Physics", school_level_tier: "SS1", teacher_name: "Prof. Albert" },
    { code: "ECO-SEC", title: "Economics", school_level_tier: "SS1", teacher_name: "Mrs. Johnson" },
    { code: "GOV-SEC", title: "Government", school_level_tier: "SS1", teacher_name: "Mr. Abba" },
    { code: "ACC-SEC", title: "Financial Accounting", school_level_tier: "SS1", teacher_name: "Mr. Paul" },
    { code: "GEO-SEC", title: "Geography", school_level_tier: "SS1", teacher_name: "Mr. Okoro" },
    { code: "LIT-SEC", title: "Literature-in-English", school_level_tier: "SS1", teacher_name: "Mrs. Adebayo" }
  ];

  const combinedMasterCourseList = [...primarySubjectsList, ...secondarySubjectsList, ...availableCourses];

  const filteredAvailableCourses = combinedMasterCourseList.filter(
    (course) => {
      const courseTier = (course.school_level_tier || "JSS1").toUpperCase();
      const currentTier = selectedSchoolLevelTier.toUpperCase();
      if (currentTier.includes("PRIMARY")) {
        return courseTier.includes("PRIMARY");
      }
      return courseTier === currentTier || courseTier === "JSS1";
    }
  );

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
        const matchedCourse = combinedMasterCourseList.find((c) => c.id === courseId || c.code === courseId);
        const baseTeacher = matchedCourse?.teacher_name || matchedCourse?.assigned_teacher;
        const resolvedTeacher = getAssignedTeacherForCourse(matchedCourse?.code || courseId, baseTeacher);

        return {
          student_email: currentStudentEmail,
          course_id: courseId,
          school_term: selectedTermFolder,
          school_level_tier: selectedSchoolLevelTier,
          teacher_name: resolvedTeacher
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
      alert("✨ Selected courses successfully registered with live database teacher tracking!");
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
      <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Active Student Class & Tier</h3>
          <p className="text-xs text-slate-400">Displaying course curriculum filtered directly by your student class profile ({selectedSchoolLevelTier}).</p>
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

      <div className="bg-white p-5 sm:p-6 md:p-8 rounded-3xl sm:rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm sm:text-base font-black text-slate-800 tracking-tight">
              Term Folders for [{selectedSchoolLevelTier}]
            </h3>
            <p className="text-xs text-slate-400">Select a term folder to check or register specific courses.</p>
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

        <div className="pt-2">
          <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
            Available Courses for {selectedSchoolLevelTier} [{selectedTermFolder}]
          </h4>
          <p className="text-xs text-slate-400 mb-4">
            Select courses below. Instructors from your database (<span className="font-semibold text-slate-600">Ola, Ndu, Ada, Mba, etc.</span>) are automatically assigned.
          </p>

          {filteredAvailableCourses.length === 0 ? (
            <p className="text-sm font-medium text-slate-400 text-center py-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              No preset courses found configured for {selectedSchoolLevelTier}.
            </p>
          ) : (
            <form onSubmit={handleBatchCourseRegistration} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto p-1">
                {filteredAvailableCourses.map((course) => {
                  const courseIdKey = course.id || course.code;
                  const isAlreadyRegistered = registeredCourseIds.includes(courseIdKey);
                  const isChecked = selectedCourseIdsToRegister.includes(courseIdKey);
                  const assignedTeacher = getAssignedTeacherForCourse(course.code, course.teacher_name || course.assigned_teacher);

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
                            {course.code}
                          </span>
                          {isAlreadyRegistered && (
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                              Registered ✓
                            </span>
                          )}
                        </div>
                        <h5 className="text-xs font-black text-slate-800 mt-1 truncate">{course.title || course.name}</h5>
                        <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1 font-medium">
                          <span>Assigned Teacher:</span>
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

      <div className="bg-white p-5 sm:p-6 md:p-8 rounded-3xl sm:rounded-[2rem] border border-slate-100 shadow-sm">
        <div className="mb-4">
          <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider">
            Registered Courses & Teachers for {selectedSchoolLevelTier} ({selectedTermFolder})
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Review saved course selections, track assigned teachers, or edit/delete entries.</p>
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
                record.teacher_name ||
                getAssignedTeacherForCourse(record.course_id, record.courses?.teacher_name) ||
                "Assigned Faculty";

              return (
                <div key={index} className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/40 flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-mono font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md uppercase inline-block">
                        {record.courses?.code || record.course_id}
                      </span>
                      <h4 className="text-sm font-black text-slate-800 mt-1 truncate">{record.courses?.name || record.courses?.title || "Course Unit"}</h4>
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