"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabaseClient";

export default function ManageTeachersPage() {
  const [teachers, setTeachers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingTeacherId, setEditingTeacherId] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    department: "",
    status: "Active",
    school_tier: "secondary",
    subject_specialization: "",
    assigned_classes: []
  });

  const classOptions = {
    primary: ["primary_1", "primary_2", "primary_3", "primary_4", "primary_5", "primary_6"],
    secondary: ["jss1", "jss2", "jss3", "ss1", "ss2", "ss3"]
  };

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

  // Reset arrays when changing major tracks to demarcate tracks
  const handleTierChange = (tier) => {
    setFormData({
      ...formData,
      school_tier: tier,
      assigned_classes: []
    });
  };

  // Open modal for creating a new teacher record
  const handleOpenCreateModal = () => {
    setEditingTeacherId(null);
    setFormData({
      name: "",
      email: "",
      phone: "",
      department: "",
      status: "Active",
      school_tier: "secondary",
      subject_specialization: "",
      assigned_classes: []
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
      department: teacher.department || "",
      status: teacher.status || "Active",
      school_tier: teacher.school_tier || "secondary",
      subject_specialization: teacher.subject_specialization || "",
      assigned_classes: teacher.assigned_classes || []
    });
    setIsModalOpen(true);
  };

  // 2. Handle Form Submission (Create or Update)
  async function handleSubmit(e) {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // DEMARCATION GUARD: Filter assignments to match only options belonging to the chosen school tier
      const validTierOptions = classOptions[formData.school_tier];
      const strictAssignedClasses = formData.assigned_classes.filter(cls => 
        validTierOptions.includes(cls)
      );

      const payload = {
        name: formData.name,
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        department: formData.department,
        status: formData.status,
        school_tier: formData.school_tier,
        subject_specialization: formData.subject_specialization,
        assigned_classes: strictAssignedClasses, // Uses clean, isolated array
      };

      if (editingTeacherId) {
        // Update Action Block
        const { error } = await supabase
          .from("teachers")
          .update(payload)
          .eq("id", editingTeacherId);

        if (error) throw error;
      } else {
        // Create Action Block
        const generatedId = `TCH-${Math.floor(100 + Math.random() * 900)}`;
        const { error } = await supabase.from("teachers").insert([
          {
            ...payload,
            teacher_id: generatedId,
            password_configured: false
          },
        ]);

        if (error) throw error;
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
      fetchTeachers();
    } catch (error) {
      alert("Failed to delete record: " + error.message);
    }
  }

  return (
    <div className="space-y-6">
      {/* Upper Control Strip */}
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Faculty Roster</h1>
          <p className="text-sm text-slate-500 mt-1">Manage, onboard, and assign departmental roles to school instructors.</p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-all shadow-md shadow-blue-100 flex items-center gap-2 cursor-pointer"
        >
          <span>➕</span> Add New Teacher
        </button>
      </div>

      {/* Main Roster Panel Layout */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500 font-medium">
            Connecting to Supabase Database Engine...
          </div>
        ) : teachers.length === 0 ? (
          <div className="p-12 text-center text-slate-500 font-medium">
            No instructors currently found in database. Click 'Add New Teacher' to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Instructor ID</th>
                  <th className="px-6 py-4">Full Name / Contacts</th>
                  <th className="px-6 py-4">Track/Subject</th>
                  <th className="px-6 py-4">Assigned Classrooms</th>
                  <th className="px-6 py-4">Status Anchor</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
                {teachers.map((teacher) => (
                  <tr key={teacher.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-xs text-blue-600">{teacher.teacher_id}</td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-800">{teacher.name}</div>
                      <div className="text-xs text-slate-400">{teacher.email}</div>
                      {teacher.phone && <div className="text-xs text-slate-500 font-mono mt-0.5">📞 {teacher.phone}</div>}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700">
                      <div className="font-bold text-slate-800 text-xs uppercase tracking-wide text-indigo-600">{teacher.school_tier} Track</div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">{teacher.subject_specialization || "Unassigned"}</div>
                    </td>
                    <td className="px-6 py-4">
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
                    <td className="px-6 py-4">
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
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex gap-2">
                        <button 
                          onClick={() => handleOpenEditModal(teacher)}
                          className="text-indigo-600 hover:text-indigo-800 font-semibold text-xs transition-colors px-3 py-1.5 rounded-lg hover:bg-indigo-50 cursor-pointer"
                        >
                          ✏️ Edit
                        </button>
                        <button 
                          onClick={() => handleDelete(teacher.id)}
                          className="text-slate-400 hover:text-rose-600 font-semibold text-xs transition-colors px-3 py-1.5 rounded-lg hover:bg-rose-50 cursor-pointer"
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
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800">
                {editingTeacherId ? "Modify Faculty Settings" : "Onboard New Faculty Member"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-xl cursor-pointer">×</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[calc(100vh-10rem)] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-sm text-slate-800 outline-none focus:border-blue-600"
                    placeholder="e.g. Arnold Chike"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Institutional Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-sm text-slate-800 outline-none focus:border-blue-600"
                    placeholder="teacher@edupulse.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-sm text-slate-800 outline-none focus:border-blue-600"
                    placeholder="e.g. +225 0700000000"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Operational Status</label>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Department Branch</label>
                  <input
                    type="text"
                    required
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-sm text-slate-800 outline-none focus:border-blue-600"
                    placeholder="e.g. Sciences"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Core Subject Focus</label>
                  <input
                    type="text"
                    required
                    value={formData.subject_specialization}
                    onChange={(e) => setFormData({ ...formData, subject_specialization: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-sm text-slate-800 outline-none focus:border-blue-600"
                    placeholder="e.g. Mathematics"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Operational Track Tier</label>
                <select
                  value={formData.school_tier}
                  onChange={(e) => handleTierChange(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-sm text-slate-800 bg-white"
                >
                  <option value="primary">🎒 Primary School Track</option>
                  <option value="secondary">🎓 Secondary School Track</option>
                </select>
              </div>

              {/* Dynamic Checkboxes Container Workspace Matrix */}
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
                        className="h-3.5 w-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                      />
                      <span className="uppercase text-slate-700 font-mono text-[11px]">{cls.replace("_", " ")}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-4 pt-4 border-t border-slate-100 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-slate-100 text-slate-700 font-semibold text-sm py-2.5 rounded-xl cursor-pointer">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 bg-blue-600 text-white font-semibold text-sm py-2.5 rounded-xl cursor-pointer shadow-md">
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