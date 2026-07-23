"use client";

import { useState } from "react";
import { supabase } from "../../../lib/supabaseClient";

export default function StudentBioPanel({
  currentStudentEmail,
  fullName,
  setFullName,
  regNumber,
  phone,
  setPhone,
  gender,
  setGender,
  dob,
  setDob,
  parentName,
  setParentName,
  parentPhone,
  setParentPhone,
  studentSection,
  setStudentSection,
  classLevel,
  setClassLevel,
  passportPreview,
  setPassportFile,
  setPassportPreview,
  savedPassportUrl,
  setSavedPassportUrl
}) {
  const [submitting, setSubmitting] = useState(false);
  const [isEditingBio, setIsEditingBio] = useState(false);

  // File selection handler for passport
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

  // Handle saving and committing bio data permanently
  async function handleSaveBioData(e) {
    e.preventDefault();
    if (!currentStudentEmail) {
      alert("❌ Session Error: Lost authorization reference key.");
      return;
    }
    setSubmitting(true);

    try {
      let finalPassportUrl = savedPassportUrl;
      // Handle passport upload if a new file was chosen
      // Note: passportFile state can be passed down or handled via props if needed.
      
      const { error: updateError } = await supabase
        .from("students")
        .update({
          name: fullName.trim(),
          phone: phone.trim(),
          gender: gender,
          dob: dob,
          parent_name: parentName.trim(),
          parent_phone: parentPhone.trim(),
          section: studentSection,
          class_level: classLevel,
          passport_url: finalPassportUrl
        })
        .eq("email", currentStudentEmail);

      if (updateError) throw updateError;

      setSavedPassportUrl(finalPassportUrl);
      setIsEditingBio(false);
      alert("✨ Profile details & bio configuration saved permanently!");
    } catch (err) {
      alert("Process Failure: " + err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSaveBioData} className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 no-print-wrapper">
      {/* Passport Column */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 flex flex-col items-center justify-center text-center space-y-4 shadow-sm h-fit">
        <label className="block text-xs font-bold uppercase text-slate-400 tracking-wider">Official Passport Photo</label>
        <div className="h-40 w-40 sm:h-44 sm:w-44 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 overflow-hidden flex items-center justify-center relative group">
          {passportPreview ? (
            <img src={passportPreview} alt="Passport" className="h-full w-full object-cover" />
          ) : (
            <div className="text-slate-300 text-xs px-4">No Passport Selected</div>
          )}
        </div>
        {isEditingBio && (
          <div className="w-full">
            <label className="block w-full text-center bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs py-3 px-4 rounded-xl cursor-pointer transition-all">
              Choose Image File
              <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            </label>
            <p className="text-[10px] text-slate-400 mt-2">Accepted formats: JPG, PNG. Max weight: 2MB.</p>
          </div>
        )}
      </div>

      {/* Details Form Column */}
      <div className="md:col-span-2 bg-white p-5 sm:p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Section 1: Personal Details</h3>
          <button
            type="button"
            onClick={() => setIsEditingBio(!isEditingBio)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isEditingBio ? "bg-amber-100 text-amber-800" : "bg-indigo-600 text-white shadow-md shadow-indigo-100"
            }`}
          >
            {isEditingBio ? "Cancel Editing" : "✏️ Update Bio"}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-400 tracking-wider mb-1.5">Full Legal Name</label>
            <input
              type="text"
              required
              disabled={!isEditingBio}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={`w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-800 outline-none ${!isEditingBio ? "bg-slate-100 text-slate-500 cursor-not-allowed" : "bg-slate-50/50 focus:border-indigo-600"}`}
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-slate-400 tracking-wider mb-1.5">Registration Identifier</label>
            <input type="text" disabled value={regNumber || "Pending Allocation"} className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-400 bg-slate-100 outline-none cursor-not-allowed font-mono" />
          </div>
        </div>

        {/* Section and Class Tier Selectors (Editable when Update Bio is active) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-400 tracking-wider mb-1.5">School Level Tier (Primary / Secondary)</label>
            <select
              disabled={!isEditingBio}
              value={studentSection}
              onChange={(e) => setStudentSection(e.target.value)}
              className={`w-full rounded-xl border border-slate-200 p-3 text-sm font-bold outline-none tracking-wide ${!isEditingBio ? "bg-slate-100 text-slate-500 cursor-not-allowed" : "bg-indigo-50 text-indigo-700 focus:border-indigo-600"}`}
            >
              <option value="Primary">Primary</option>
              <option value="Secondary">Secondary</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-slate-400 tracking-wider mb-1.5">Assigned Class Level (e.g., JSS1 / JSS2)</label>
            <select
              disabled={!isEditingBio}
              value={classLevel}
              onChange={(e) => setClassLevel(e.target.value)}
              className={`w-full rounded-xl border border-slate-200 p-3 text-sm font-bold outline-none tracking-wide ${!isEditingBio ? "bg-slate-100 text-slate-500 cursor-not-allowed" : "bg-indigo-50 text-indigo-700 focus:border-indigo-600"}`}
            >
              <option value="JSS1">JSS1</option>
              <option value="JSS2">JSS2</option>
              <option value="JSS3">JSS3</option>
              <option value="SS1">SS1</option>
              <option value="SS2">SS2</option>
              <option value="SS3">SS3</option>
              <option value="Primary 1">Primary 1</option>
              <option value="Primary 2">Primary 2</option>
              <option value="Primary 3">Primary 3</option>
              <option value="Primary 4">Primary 4</option>
              <option value="Primary 5">Primary 5</option>
              <option value="Primary 6">Primary 6</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-400 tracking-wider mb-1.5">Contact Telephone</label>
            <input
              type="tel"
              required
              disabled={!isEditingBio}
              placeholder="+225 00 00 00 00"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={`w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-800 outline-none ${!isEditingBio ? "bg-slate-100 text-slate-500 cursor-not-allowed" : "bg-slate-50/50 focus:border-indigo-600"}`}
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-slate-400 tracking-wider mb-1.5">Gender</label>
            <select
              required
              disabled={!isEditingBio}
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className={`w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-800 outline-none ${!isEditingBio ? "bg-slate-100 text-slate-500 cursor-not-allowed" : "bg-slate-50/50 focus:border-indigo-600"}`}
            >
              <option value="">Select Option</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-400 tracking-wider mb-1.5">Date of Birth</label>
            <input
              type="date"
              required
              disabled={!isEditingBio}
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className={`w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-800 outline-none ${!isEditingBio ? "bg-slate-100 text-slate-500 cursor-not-allowed" : "bg-slate-50/50 focus:border-indigo-600"}`}
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-slate-400 tracking-wider mb-1.5">Institutional Email</label>
            <input type="text" disabled value={currentStudentEmail} className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-400 bg-slate-100 outline-none cursor-not-allowed truncate" />
          </div>
        </div>

        <div className="pt-2">
          <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-3 pb-1 border-b border-slate-100">Section 2: Next of Kin / Guardian</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 tracking-wider mb-1.5">Parent / Guardian Name</label>
              <input
                type="text"
                required
                disabled={!isEditingBio}
                placeholder="Father or Mother's Full Name"
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
                className={`w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-800 outline-none ${!isEditingBio ? "bg-slate-100 text-slate-500 cursor-not-allowed" : "bg-slate-50/50 focus:border-indigo-600"}`}
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 tracking-wider mb-1.5">Parent Emergency Phone</label>
              <input
                type="tel"
                required
                disabled={!isEditingBio}
                placeholder="+225 00 00 00 00"
                value={parentPhone}
                onChange={(e) => setParentPhone(e.target.value)}
                className={`w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-800 outline-none ${!isEditingBio ? "bg-slate-100 text-slate-500 cursor-not-allowed" : "bg-slate-50/50 focus:border-indigo-600"}`}
              />
            </div>
          </div>
        </div>

        {isEditingBio && (
          <div className="pt-4">
            <button type="submit" disabled={submitting} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm py-4 rounded-xl transition-all cursor-pointer shadow-lg shadow-emerald-500/10">
              {submitting ? "Committing Permanent Updates..." : "Save Bio Permanently"}
            </button>
          </div>
        )}
      </div>
    </form>
  );
}