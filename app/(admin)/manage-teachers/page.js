"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabaseClient";

export default function ManageTeachersPage() {
  const [teachers, setTeachers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingTeacherId, setEditingTeacherId] = useState(null);
  
  // Tab control for separating Primary vs Secondary roster views
  const [activeTab, setActiveTab] = useState("secondary");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    status: "Active",
    school_tier: "secondary",
    assigned_classes: [],
    assigned_subjects: []
  });

  const classOptions = {
    primary: ["primary_1", "primary_2", "primary_3", "primary_4", "primary_5", "primary_6"],
    secondary: ["jss1", "jss2", "jss3", "ss1", "ss2", "ss3"]
  };

  const primarySubjectsList = [
    { code: "ENG-PRI", title: "English Studies" },
    { code: "MTH-PRI", title: "Mathematics" },
    { code: "BST-PRI", title: "Basic Science and Technology" },
    { code: "PHE-PRI", title: "Physical and Health Education" },
    { code: "CCA-PRI", title: "Cultural and Creative Arts" },
    { code: "CRS-PRI", title: "Christian Religious Studies" },
    { code: "IRS-PRI", title: "Islamic Religious Studies" },
    { code: "SOS-PRI", title: "Social Studies" },
    { code: "GAR-PRI", title: "Agricultural Science" }
  ];

  // Combined secondary and junior/senior subjects list spanning JSS1 through SS3
  const secondarySubjectsList = [
    { code: "MTH-SEC", title: "Mathematics (JSS - SS)" },
    { code: "ENG-SEC", title: "English Language (JSS - SS)" },
    { code: "BIO-SEC", title: "Biology (JSS Basic Science / SS Bio)" },
    { code: "CHM-SEC", title: "Chemistry" },
    { code: "PHY-SEC", title: "Physics" },
    { code: "ECO-SEC", title: "Economics" },
    { code: "GOV-SEC", title: "Government" },
    { code: "CRS-SEC", title: "Christian Religious Studies" },
    { code: "AGR-SEC", title: "Agricultural Science" },
    { code: "ACC-SEC", title: "Financial Accounting" },
    { code: "GEO-SEC", title: "Geography" },
    { code: "LIT-SEC", title: "Literature-in-English" },
    { code: "CMP-SEC", title: "Computer Studies / ICT" },
    { code: "BUS-SEC", title: "Business Studies (JSS)" },
    { code: "BAS-SEC", title: "Basic Science (JSS)" },
    { code: "SST-SEC", title: "Social Studies / Civics (JSS)" }
  ];

  // 1. Fetch Teachers from Supabase
  async function fetchTeachers() {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("teachers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTeachers(data || []);
    } catch (error) {
      alert("Error reading database: " + error.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchTeachers();
  }, []);

  // Toggle dynamic class selections in form state array
  const handleClassCheckboxChange = (classLevel) => {
    const currentSelection = [...formData.assigned_classes];
    if (currentSelection.includes(classLevel)) {
      setFormData({
        ...formData,
        assigned_classes: currentSelection.filter((item) => item !== classLevel)
      });
    } else {
      setFormData({
        ...formData,
        assigned_classes: [...currentSelection, classLevel]
      });
    }
  };

  // Toggle dynamic subject selections in form state array
  const handleSubjectCheckboxChange = (subjectCode) => {
    const currentSelection = [...formData.assigned_subjects];
    if (currentSelection.includes(subjectCode)) {
      setFormData({
        ...formData,
        assigned_subjects: currentSelection.filter((item) => item !== subjectCode)
      });
    } else {
      setFormData({
        ...formData,
        assigned_subjects: [...currentSelection, subjectCode]
      });
    }
  };

  // Reset arrays when changing major tracks to demarcate tracks
  const handleTierChange = (tier) => {
    setFormData({
      ...formData,
      school_tier: tier,
      assigned_classes: [],
      assigned_subjects: []
    });
  };

  // Open modal for creating a new teacher record
  const handleOpenCreateModal = () => {
    setEditingTeacherId(null);
    setFormData({
      name: "",
      email: "",
      phone: "",
      status: "Active",
      school_tier: activeTab, // Defaults to whatever tab view admin is currently viewing
      assigned_classes: [],
      assigned_subjects: []
    });
    setIsModalOpen(true);
  };

  // Open modal for updating an existing teacher record
  const handleOpenEditModal = (teacher) => {
    setEditingTeacherId(teacher.id);
    setFormData({
      name: teacher.name || "",
      email: teacher.email || "",
      phone: teacher.phone || "",
      status: teacher.status || "Active",
      school_tier: teacher.school_tier || "secondary",
      assigned_classes: teacher.assigned_classes || [],
      assigned_subjects: teacher.assigned_subjects || []
    });
    setIsModalOpen(true);
  };

  // 2. Handle Form Submission (Create or Update)
  async function handleSubmit(e) {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const validTierOptions = classOptions[formData.school_tier];
      const strictAssignedClasses = formData.assigned_classes.filter(cls => 
        validTierOptions.includes(cls)
      );

      const activeSubjectList = formData.school_tier === "primary" ? primarySubjectsList : secondarySubjectsList;
      const validSubjectCodes = activeSubjectList.map(s => s.code);
      const strictAssignedSubjects = formData.assigned_subjects.filter(subj => 
        validSubjectCodes.includes(subj)
      );

      const payload = {
        name: formData.name,
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        status: formData.status,
        school_tier: formData.school_tier,
        subject_specialization: formData.assigned_subjects.length > 0 ? formData.assigned_subjects[0] : "", // fallback sync
        assigned_classes: strictAssignedClasses,
        assigned_subjects: strictAssignedSubjects,
      };

      if (editingTeacherId) {
        const { error } = await supabase
          .from("teachers")
          .update(payload)
          .eq("id", editingTeacherId);

        if (error) throw error;
        alert("✨ Faculty profile updated successfully!");
      } else {
        const generatedId = `TCH-${Math.floor(100 + Math.random() * 900)}`;
        const { error } = await supabase.from("teachers").insert([
          {
            ...payload,
            teacher_id: generatedId,
            password_configured: false
          },
        ]);

        if (error) throw error;
        alert("🎉 Faculty member successfully onboarded!");
      }

      setIsModalOpen(false);
      fetchTeachers();
    } catch (error) {
      alert("Failed to save record transaction: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  // 3. Handle Record Deletion
  async function handleDelete(id) {
    if (!confirm("Are you sure you want to remove this instructor from the portal?")) return;

    try {
      const { error } = await supabase
        .from("teachers")
        .delete()
        .eq("id", id);

      if (error) throw error;
      alert("🗑️ Teacher record successfully deleted!");
      fetchTeachers();
    } catch (error) {
      alert("Failed to delete record: " + error.message);
    }
  }

  // Helper mapper to show subject title from code in table view
  const getSubjectTitle = (code, tier) => {
    const list = tier === "primary" ? primarySubjectsList : secondarySubjectsList;
    const found = list.find(s => s.code === code);
    return found ? found.title : code;
  };

  // Filter teachers explicitly by selected tier tab view
  const filteredTeachers = teachers.filter(t => t.school_tier === activeTab);

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto p-2 sm:p-4 w-full overflow-x-hidden font-sans">
      {/* Upper Control Strip */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">Faculty Roster & Tracking</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">Organize and manage instructors across separate primary and secondary school tracks.</p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm px-4 py-2.5 rounded-xl transition-all shadow-md shadow-blue-100 flex items-center gap-2 cursor-pointer whitespace-nowrap"
        >
          <span>➕</span> Add New Teacher
        </button>
      </div>

      {/* Tier Switcher Tabs for Easy Tracking */}
      <div className="flex border-b border-slate-200 gap-4 px-2">
        <button
          onClick={() => setActiveTab("secondary")}
          className={`pb-3 text-sm font-bold transition-all cursor-pointer border-b-2 px-2 flex items-center gap-2 ${
            activeTab === "secondary"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          🎓 Secondary School Teachers
          <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === "secondary" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}>
            {teachers.filter(t => t.school_tier === "secondary").length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("primary")}
          className={`pb-3 text-sm font-bold transition-all cursor-pointer border-b-2 px-2 flex items-center gap-2 ${
            activeTab === "primary"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          🎒 Primary School Teachers
          <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === "primary" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}>
            {teachers.filter(t => t.school_tier === "primary").length}
          </span>
        </button>
      </div>

      {/* Main Roster Panel Layout */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden w-full">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500 font-medium text-xs sm:text-sm animate-pulse">
            Connecting to Supabase Database Engine...
          </div>
        ) : filteredTeachers.length === 0 ? (
          <div className="p-12 text-center text-slate-500 font-medium text-xs sm:text-sm">
            No instructors found in the {activeTab} school roster. Click 'Add New Teacher' to add one.
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-4 sm:px-6 py-4">Instructor ID</th>
                  <th className="px-4 sm:px-6 py-4">Full Name / Contacts</th>
                  <th className="px-4 sm:px-6 py-4">Assigned Classrooms</th>
                  <th className="px-4 sm:px-6 py-4">Assigned Subjects</th>
                  <th className="px-4 sm:px-6 py-4">Status Anchor</th>
                  <th className="px-4 sm:px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm text-slate-600">
                {filteredTeachers.map((teacher) => (
                  <tr key={teacher.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 sm:px-6 py-4 font-mono font-bold text-xs text-blue-600 whitespace-nowrap">{teacher.teacher_id}</td>
                    <td className="px-4 sm:px-6 py-4">
                      <div className="font-semibold text-slate-800 text-sm">{teacher.name}</div>
                      <div className="text-[11px] sm:text-xs text-slate-400 break-all">{teacher.email}</div>
                      {teacher.phone && <div className="text-[11px] sm:text-xs text-slate-500 font-mono mt-0.5">📞 {teacher.phone}</div>}
                    </td>
                    <td className="px-4 sm:px-6 py-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {teacher.assigned_classes?.length > 0 ? (
                          teacher.assigned_classes.map((cls) => (
                            <span key={cls} className="bg-slate-100 font-mono border border-slate-200 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                              {cls.replace("_", " ")}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400 italic">None Assigned</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {teacher.assigned_subjects?.length > 0 ? (
                          teacher.assigned_subjects.map((subjCode) => (
                            <span key={subjCode} className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-semibold px-2 py-0.5 rounded">
                              {getSubjectTitle(subjCode, teacher.school_tier)}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400 italic">None Assigned</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                          teacher.status === "Active" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-amber-50 text-amber-700 border border-amber-100"
                        }`}>
                          {teacher.status}
                        </span>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {teacher.password_configured ? "🔐 Portal Active" : "⏳ Pending Set"}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-right whitespace-nowrap">
                      <div className="inline-flex gap-2">
                        <button 
                          onClick={() => handleOpenEditModal(teacher)}
                          className="text-indigo-600 hover:text-indigo-800 font-semibold text-xs transition-colors px-2.5 sm:px-3 py-1.5 rounded-lg hover:bg-indigo-50 cursor-pointer border border-indigo-100 bg-indigo-50/30"
                        >
                          ✏️ Edit
                        </button>
                        <button 
                          onClick={() => handleDelete(teacher.id)}
                          className="text-slate-400 hover:text-rose-600 font-semibold text-xs transition-colors px-2.5 sm:px-3 py-1.5 rounded-lg hover:bg-rose-50 cursor-pointer border border-slate-200 bg-slate-50"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dynamic Assignment Input Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-xl w-full my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 sm:p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-base sm:text-lg font-bold text-slate-800">
                {editingTeacherId ? "Modify Faculty Settings" : "Onboard New Faculty Member"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-xl cursor-pointer">×</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 max-h-[calc(100vh-10rem)] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] sm:text-xs font-bold uppercase text-slate-500 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-sm text-slate-800 outline-none focus:border-blue-600 bg-slate-50/50"
                    placeholder="e.g. Arnold Chike"
                  />
                </div>
                <div>
                  <label className="block text-[10px] sm:text-xs font-bold uppercase text-slate-500 mb-1">Institutional Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-sm text-slate-800 outline-none focus:border-blue-600 bg-slate-50/50"
                    placeholder="teacher@edupulse.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] sm:text-xs font-bold uppercase text-slate-500 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-sm text-slate-800 outline-none focus:border-blue-600 bg-slate-50/50"
                    placeholder="e.g. +225 0700000000"
                  />
                </div>
                <div>
                  <label className="block text-[10px] sm:text-xs font-bold uppercase text-slate-500 mb-1">Operational Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-sm text-slate-800 bg-white"
                  >
                    <option value="Active">Active</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] sm:text-xs font-bold uppercase text-slate-500 mb-1">Operational Track Tier</label>
                <select
                  value={formData.school_tier}
                  onChange={(e) => handleTierChange(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-sm text-slate-800 bg-white"
                >
                  <option value="primary">🎒 Primary School Track</option>
                  <option value="secondary">🎓 Secondary School Track (JSS1 - SS3)</option>
                </select>
              </div>

              {/* Dynamic Checkboxes Container Workspace Matrix for Classes */}
              <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/60">
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-wider">
                  Check Class Assignment Allocations ({formData.school_tier.toUpperCase()})
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {classOptions[formData.school_tier].map((cls) => (
                    <label key={cls} className="flex items-center gap-2 bg-white p-2 border border-slate-200 rounded-lg text-xs font-bold cursor-pointer hover:bg-slate-50 select-none">
                      <input
                        type="checkbox"
                        checked={formData.assigned_classes.includes(cls)}
                        onChange={() => handleClassCheckboxChange(cls)}
                        className="h-3.5 w-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 flex-shrink-0"
                      />
                      <span className="uppercase text-slate-700 font-mono text-[11px] truncate">{cls.replace("_", " ")}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Dynamic Checkboxes Container Workspace Matrix for Subjects */}
              <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/60">
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-wider">
                  Assign Course Subjects ({formData.school_tier.toUpperCase()})
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {(formData.school_tier === "primary" ? primarySubjectsList : secondarySubjectsList).map((subj) => (
                    <label key={subj.code} className="flex items-center gap-2 bg-white p-2 border border-slate-200 rounded-lg text-xs font-bold cursor-pointer hover:bg-slate-50 select-none">
                      <input
                        type="checkbox"
                        checked={formData.assigned_subjects.includes(subj.code)}
                        onChange={() => handleSubjectCheckboxChange(subj.code)}
                        className="h-3.5 w-3.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 flex-shrink-0"
                      />
                      <div className="truncate">
                        <span className="block text-slate-800 text-xs font-medium">{subj.title}</span>
                        <span className="block font-mono text-[9px] text-slate-400">{subj.code}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-4 pt-4 border-t border-slate-100 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-slate-100 text-slate-700 font-semibold text-xs sm:text-sm py-2.5 rounded-xl cursor-pointer">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 bg-blue-600 text-white font-semibold text-xs sm:text-sm py-2.5 rounded-xl cursor-pointer shadow-md">
                  {isSubmitting ? "Saving..." : editingTeacherId ? "Update Record" : "Save Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}