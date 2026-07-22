"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabaseClient";

export default function AdminManageStudentsPage() {
  const [students, setStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Active Viewing Tier Matrix Filters
  const [activeTier, setActiveTier] = useState("secondary"); // 'primary' or 'secondary'
  const [activeClass, setActiveClass] = useState("jss1"); // Default active level selection filter

  // Global School Branding Asset States
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [schoolLogo, setSchoolLogo] = useState("");
  const [schoolStamp, setSchoolStamp] = useState("");
  const [adminSignature, setAdminSignature] = useState("");
  const [uploadingAsset, setUploadingAsset] = useState(null);

  // Form payload extended structure mapping dynamic fields
  const [formData, setFormData] = useState({ 
    name: "", 
    email: "",
    school_tier: "secondary",
    class_level: "jss1",
    academic_session: "2026/2027",
    current_term: "term_1"
  });

  // Dynamic lists definitions for forms and selections
  const primaryClasses = ["primary_1", "primary_2", "primary_3", "primary_4", "primary_5", "primary_6"];
  const secondaryClasses = ["jss1", "jss2", "jss3", "ss1", "ss2", "ss3"];

  // Helper formatting engine text tags conversions
  const formatClassLabel = (slug) => {
    return slug.replace("_", " ").toUpperCase();
  };

  // Fetch Global Institutional Settings Assets
  async function fetchSchoolSettings() {
    try {
      setSettingsLoading(true);
      const { data, error } = await supabase
        .from("school_settings")
        .select("*")
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setSchoolLogo(data.school_logo_url || "");
        setSchoolStamp(data.school_stamp_url || "");
        setAdminSignature(data.admin_signature_url || "");
      }
    } catch (err) {
      console.error("Settings Load Exception: ", err.message);
    } finally {
      setSettingsLoading(false);
    }
  }

  // Handle Global Asset File Transfers (Logo, Stamp, Signature)
  async function handleAssetUpload(e, assetKey) {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingAsset(assetKey);
    try {
      const fileExt = file.name.split(".").pop();
      const safeFileName = `institution_${assetKey}_${Date.now()}.${fileExt}`;

      const { error: uploadErr } = await supabase.storage
        .from("passports")
        .upload(`assets/${safeFileName}`, file, { cacheControl: "3600", upsert: true });

      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage
        .from("passports")
        .getPublicUrl(`assets/${safeFileName}`);

      const publicUrl = urlData.publicUrl;

      const { data: existingSettings } = await supabase
        .from("school_settings")
        .select("id")
        .maybeSingle();

      let dbErr;
      if (existingSettings) {
        const { error } = await supabase
          .from("school_settings")
          .update({ [`${assetKey}_url`]: publicUrl })
          .eq("id", existingSettings.id);
        dbErr = error;
      } else {
        const { error } = await supabase
          .from("school_settings")
          .insert({ [`${assetKey}_url`]: publicUrl });
        dbErr = error;
      }

      if (dbErr) throw dbErr;

      if (assetKey === "school_logo") setSchoolLogo(publicUrl);
      if (assetKey === "school_stamp") setSchoolStamp(publicUrl);
      if (assetKey === "admin_signature") setAdminSignature(publicUrl);

      alert(`✨ Institutional ${assetKey.replace("_", " ")} successfully synchronized!`);
    } catch (err) {
      alert("Asset Commit Failure: " + err.message);
    } finally {
      setUploadingAsset(null);
    }
  }

  // Fetch Active Registered Student Profiles
  async function fetchStudents() {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setStudents(data || []);
    } catch (err) {
      alert("Error reading registry: " + err.message);
    } finally {
      setIsLoading(false);
    }
  }

  // Generate Unique 6-Digit Verification Result Pin Mapping
  async function generateStudentPin(studentId) {
    const generatedPin = Math.floor(100000 + Math.random() * 900000).toString();

    try {
      const { error } = await supabase
        .from("students")
        .update({ result_pin: generatedPin })
        .eq("id", studentId);

      if (error) throw error;

      alert("🔑 Unique Access PIN assigned successfully!");
      fetchStudents();
    } catch (err) {
      alert("PIN Allocation Exception: " + err.message);
    }
  }

  useEffect(() => {
    fetchStudents();
    fetchSchoolSettings();
  }, []);

  // Sync state variable cascades when Admin clicks modal setup parameters toggle links switches
  const handleFormTierChange = (tier) => {
    const defaultClass = tier === "primary" ? "primary_1" : "jss1";
    setFormData({ ...formData, school_tier: tier, class_level: defaultClass });
  };

  // Function to securely trigger opening the modal with synchronized viewing targets
  const handleOpenOnboardModal = () => {
    setFormData({
      name: "",
      email: "",
      school_tier: activeTier, // Dynamic form auto-alignment matching background view context
      class_level: activeClass, // Dynamic class room alignment
      academic_session: "2026/2027",
      current_term: "term_1"
    });
    setIsModalOpen(true);
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setIsSubmitting(true);

    const generatedRegNo = `STU-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    try {
      const { error } = await supabase.from("students").insert([
        {
          reg_number: generatedRegNo,
          name: formData.name,
          email: formData.email.trim().toLowerCase(),
          school_tier: formData.school_tier,
          class_level: formData.class_level,
          academic_session: formData.academic_session,
          current_term: formData.current_term,
          courses: [
            { code: "MTH-101", title: "General Mathematics I" },
            { code: "PHY-101", title: "Introductory Physics I" },
            { code: "GNS-101", title: "Use of English" }
          ]
        },
      ]);

      if (error) throw error;

      setFormData({ 
        name: "", 
        email: "", 
        school_tier: "secondary", 
        class_level: "jss1",
        academic_session: "2026/2027",
        current_term: "term_1"
      });
      setIsModalOpen(false);
      fetchStudents();
    } catch (err) {
      alert("Registration failed: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  // Inline dynamic filter processing calculations
  const filteredStudents = students.filter(
    (student) => student.school_tier === activeTier && student.class_level === activeClass
  );

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto p-2 sm:p-4 w-full overflow-x-hidden font-sans">
      
      {/* INSTITUTIONAL SETTINGS MANAGEMENT BLOCK */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div>
          <h2 className="text-sm sm:text-base font-black text-slate-800 tracking-tight uppercase">Institutional Branding & Verification Assets</h2>
          <p className="text-xs text-slate-400 mt-0.5">Upload central graphic properties used to populate headers, stamps, and signatures automatically.</p>
        </div>

        {settingsLoading ? (
          <div className="text-xs font-mono text-slate-400 animate-pulse">Syncing layout asset references...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 pt-2">
            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/60 flex flex-col items-center justify-between space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">1. School Crest Logo</span>
              <div className="h-16 w-16 bg-white border border-slate-200 rounded-xl overflow-hidden flex items-center justify-center p-1">
                {schoolLogo ? <img src={schoolLogo} alt="Logo" className="h-full w-full object-contain" /> : <span className="text-[10px] text-slate-300">Missing</span>}
              </div>
              <label className="text-[11px] font-bold bg-white border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg shadow-sm hover:bg-slate-50 cursor-pointer transition-all">
                {uploadingAsset === "school_logo" ? "Uploading..." : "Upload Logo"}
                <input type="file" accept="image/*" onChange={(e) => handleAssetUpload(e, "school_logo")} className="hidden" disabled={uploadingAsset !== null} />
              </label>
            </div>

            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/60 flex flex-col items-center justify-between space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">2. Official Security Stamp</span>
              <div className="h-16 w-28 bg-white border border-slate-200 rounded-xl overflow-hidden flex items-center justify-center p-1">
                {schoolStamp ? <img src={schoolStamp} alt="Stamp" className="h-full w-full object-contain" /> : <span className="text-[10px] text-slate-300">Missing</span>}
              </div>
              <label className="text-[11px] font-bold bg-white border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg shadow-sm hover:bg-slate-50 cursor-pointer transition-all">
                {uploadingAsset === "school_stamp" ? "Uploading..." : "Upload Stamp"}
                <input type="file" accept="image/*" onChange={(e) => handleAssetUpload(e, "school_stamp")} className="hidden" disabled={uploadingAsset !== null} />
              </label>
            </div>

            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/60 flex flex-col items-center justify-between space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">3. Admin Signature Field</span>
              <div className="h-16 w-28 bg-white border border-slate-200 rounded-xl overflow-hidden flex items-center justify-center p-1">
                {adminSignature ? <img src={adminSignature} alt="Signature" className="h-full w-full object-contain" /> : <span className="text-[10px] text-slate-300">Missing</span>}
              </div>
              <label className="text-[11px] font-bold bg-white border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg shadow-sm hover:bg-slate-50 cursor-pointer transition-all">
                {uploadingAsset === "admin_signature" ? "Uploading..." : "Upload Signature"}
                <input type="file" accept="image/*" onChange={(e) => handleAssetUpload(e, "admin_signature")} className="hidden" disabled={uploadingAsset !== null} />
              </label>
            </div>
          </div>
        )}
      </div>

      {/* REGISTRY BANNER TOOLBAR */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm gap-4">
        <div>
          <h1 className="text-lg sm:text-xl font-black text-slate-800 tracking-tight uppercase">Student Registry Engine</h1>
          <p className="text-xs text-slate-500 mt-0.5">Onboard student profiles, manage passports, and assign result lock key tokens.</p>
        </div>
        <button
          onClick={handleOpenOnboardModal}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md shadow-blue-100 flex items-center gap-2 cursor-pointer whitespace-nowrap"
        >
          <span>➕</span> Onboard New Student
        </button>
      </div>

      {/* WORKSPACE HUB GRID STACK */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* SIDEBAR TIER LEVEL CONTROLS PANEL */}
        <div className="lg:col-span-3 bg-white border border-slate-200 shadow-sm rounded-2xl p-4 space-y-6 w-full">
          
          {/* Master Tier Selector Triggers */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-black tracking-wider text-slate-400 uppercase px-1">Select School Level</span>
            <button
              onClick={() => { setActiveTier("primary"); setActiveClass("primary_1"); }}
              className={`w-full text-left px-4 py-3 rounded-xl font-black text-xs uppercase tracking-wide transition-all border ${
                activeTier === "primary"
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
            >
              🎒 Primary School
            </button>
            <button
              onClick={() => { setActiveTier("secondary"); setActiveClass("jss1"); }}
              className={`w-full text-left px-4 py-3 rounded-xl font-black text-xs uppercase tracking-wide transition-all border ${
                activeTier === "secondary"
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
            >
              🎓 Secondary School
            </button>
          </div>

          <hr className="border-slate-100" />

          {/* Dynamic Class Levels Stack Engine */}
          <div className="space-y-1">
            <span className="text-[10px] font-black tracking-wider text-slate-400 uppercase px-1 block mb-2">Available Classes</span>
            {(activeTier === "primary" ? primaryClasses : secondaryClasses).map((cls) => (
              <button
                key={cls}
                onClick={() => setActiveClass(cls)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeClass === cls
                    ? "bg-blue-50 text-blue-600 font-black border-l-4 border-blue-600"
                    : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                {formatClassLabel(cls)}
              </button>
            ))}
          </div>
        </div>

        {/* MAIN DATA DIRECTORY SHEET */}
        <div className="lg:col-span-9 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden w-full">
          <div className="bg-slate-50/70 p-4 border-b border-slate-200 flex flex-wrap justify-between items-center gap-2">
            <span className="text-xs font-black text-slate-700 tracking-tight uppercase">
              Viewing Roster: <span className="text-blue-600 font-mono bg-blue-50 border border-blue-100 px-2 py-0.5 rounded ml-1">{formatClassLabel(activeClass)}</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono font-bold bg-white px-2.5 py-1 border border-slate-200 rounded-md">
              Total Records matched: {filteredStudents.length}
            </span>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-slate-400 text-xs font-mono animate-pulse">Syncing database records...</div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs font-medium">No students registered under this specific classroom selection stack.</div>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-slate-50/40 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    <th className="px-4 sm:px-6 py-4">Avatar Profile</th>
                    <th className="px-4 sm:px-6 py-4">Reg Number</th>
                    <th className="px-4 sm:px-6 py-4">Full Legal Name</th>
                    <th className="px-4 sm:px-6 py-4">Session/Term Info</th>
                    <th className="px-4 sm:px-6 py-4 text-center">Security Access PIN</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-600 font-medium">
                  {filteredStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="px-4 sm:px-6 py-3">
                        <div className="h-10 w-10 rounded-xl border border-slate-200 bg-slate-100 overflow-hidden flex items-center justify-center flex-shrink-0">
                          {student.passport_url ? (
                            <img src={student.passport_url} alt="passport" className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-[9px] font-bold font-mono text-slate-400 uppercase">Empty</span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 sm:px-6 py-4 font-mono font-bold text-blue-600 whitespace-nowrap">{student.reg_number}</td>
                      
                      <td className="px-4 sm:px-6 py-4">
                        <div className="font-bold text-slate-800 text-sm break-words">{student.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5 break-all">{student.email}</div>
                      </td>
                      
                      <td className="px-4 sm:px-6 py-4 font-mono text-[11px] whitespace-nowrap">
                        <div className="text-slate-700 font-bold">{student.academic_session}</div>
                        <div className="text-indigo-600 text-[10px] font-bold uppercase tracking-wide mt-0.5">{student.current_term?.replace("_", " ")}</div>
                      </td>

                      <td className="px-4 sm:px-6 py-4 text-center whitespace-nowrap">
                        {student.result_pin ? (
                          <div className="inline-flex flex-col items-center space-y-1">
                            <span className="bg-indigo-50 border border-indigo-200 text-indigo-700 font-mono font-black text-sm px-3 py-1 rounded-lg tracking-widest shadow-inner">
                              {student.result_pin}
                            </span>
                            <button type="button" onClick={() => generateStudentPin(student.id)} className="text-[9px] font-bold text-slate-400 hover:text-indigo-600 transition-all cursor-pointer underline">Regenerate</button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => generateStudentPin(student.id)}
                            className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg transition-all shadow-sm tracking-wide cursor-pointer uppercase"
                          >
                            🔑 Lock & Gen PIN
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ONBOARD MODAL INTERFACE */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto">
            <div className="p-4 sm:p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-tight">Onboard Pre-Account System</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-xl cursor-pointer">×</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5 tracking-wider">Student Full Name</label>
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
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5 tracking-wider">Email Address</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-sm text-slate-800 outline-none focus:border-blue-600 bg-slate-50/50"
                    placeholder="arnold@school.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5 tracking-wider">School Level Tier</label>
                  <select
                    value={formData.school_tier}
                    onChange={(e) => handleFormTierChange(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-sm text-slate-800 bg-white outline-none focus:border-blue-600"
                  >
                    <option value="primary">🎒 Primary Track</option>
                    <option value="secondary">🎓 Secondary Track</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5 tracking-wider">Assigned Classroom</label>
                  <select
                    value={formData.class_level}
                    onChange={(e) => setFormData({ ...formData, class_level: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-sm text-slate-800 bg-white outline-none focus:border-blue-600 uppercase"
                  >
                    {(formData.school_tier === "primary" ? primaryClasses : secondaryClasses).map((cls) => (
                      <option key={cls} value={cls}>{formatClassLabel(cls)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5 tracking-wider">Active Calendar Session</label>
                  <select
                    value={formData.academic_session}
                    onChange={(e) => setFormData({ ...formData, academic_session: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-sm text-slate-800 bg-white outline-none focus:border-blue-600"
                  >
                    <option value="2025/2026">2025/2026</option>
                    <option value="2026/2027">2026/2027</option>
                    <option value="2027/2028">2027/2028</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5 tracking-wider">Enrollment Term</label>
                  <select
                    value={formData.current_term}
                    onChange={(e) => setFormData({ ...formData, current_term: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-sm text-slate-800 bg-white outline-none focus:border-blue-600"
                  >
                    <option value="term_1">First Term</option>
                    <option value="term_2">Second Term</option>
                    <option value="term_3">Third Term</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-4 pt-4 border-t border-slate-100 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-slate-100 text-slate-700 font-bold text-xs py-2.5 rounded-xl cursor-pointer">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 bg-blue-600 text-white font-bold text-xs py-2.5 rounded-xl cursor-pointer shadow-md">{isSubmitting ? "Processing..." : "Generate Account"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}