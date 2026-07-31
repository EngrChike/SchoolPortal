"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function StudentAssignmentsPanel({
  performanceRecords,
  courseAssignments,
  assignmentTimers = {},
  studentProfile,
  onSubmissionSuccess
}) {
  const [activeModalAssignment, setActiveModalAssignment] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Safely derive and normalize the student's active class level/tier
  const rawTier = studentProfile?.class_level || studentProfile?.school_level_tier || studentProfile?.section || "PRIMARY 1";
  const activeClassTier = String(rawTier).toUpperCase().trim();

  // Filter assignments strictly to match the student's locked class tier
  const filteredCourseAssignments = (courseAssignments || []).filter((asm) => {
    const asmTier = String(asm.school_level_tier || asm.class_level || "").toUpperCase().trim();
    // If an assignment doesn't specify a tier, fallback to showing or hiding; here we enforce an exact match or inclusion check
    if (!asmTier) return true; 
    return asmTier === activeClassTier || asmTier.includes(activeClassTier) || activeClassTier.includes(asmTier);
  });

  async function handleTurnInAssignment(e) {
    e.preventDefault();
    if (!activeModalAssignment || !uploadFile) {
      alert("Please select a file document to upload.");
      return;
    }

    setIsSubmitting(true);
    try {
      const fileExt = uploadFile.name.split(".").pop();
      const safeStudentName = (studentProfile?.name || "student").replace(/\s+/g, "_");
      const safeFileName = `submission_${safeStudentName}_${activeModalAssignment.id}_${Date.now()}.${fileExt}`;

      const { error: uploadErr } = await supabase.storage
        .from("assignments")
        .upload(safeFileName, uploadFile, { cacheControl: "3600", upsert: true });

      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from("assignments").getPublicUrl(safeFileName);
      const publicFileUrl = urlData.publicUrl;

      const { error: dbErr } = await supabase
        .from("assignment_submissions")
        .insert({
          assignment_id: activeModalAssignment.id,
          student_email: (studentProfile?.email || "").trim().toLowerCase(),
          student_name: studentProfile?.name || "Student",
          reg_number: studentProfile?.reg_number || "",
          passport_url: studentProfile?.passport_url || null,
          file_url: publicFileUrl
        });

      if (dbErr) throw dbErr;

      alert("🎉 Assignment successfully turned in to your instructor!");
      setActiveModalAssignment(null);
      setUploadFile(null);
      if (onSubmissionSuccess) onSubmissionSuccess();
    } catch (err) {
      alert("Turn-In Error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="bg-white p-5 sm:p-6 md:p-8 rounded-3xl sm:rounded-[2rem] border border-slate-100 shadow-sm no-print-wrapper relative">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-base font-black text-slate-800 tracking-tight">Active Assignment Pipelines</h3>
          <p className="text-xs text-slate-400 mt-0.5">Task sheets distributed by faculty for your registered coursework units ({activeClassTier}).</p>
        </div>
        <div className="bg-indigo-50 text-indigo-700 border border-indigo-200 font-black py-1.5 px-3 rounded-xl text-xs uppercase tracking-wider flex items-center gap-1.5 self-start">
          🎯 Tier: {activeClassTier}
        </div>
      </div>

      {filteredCourseAssignments.length === 0 ? (
        <div className="text-center py-12">
          <div className="h-12 w-12 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center mx-auto mb-4 text-xl">📂</div>
          <h3 className="text-sm font-bold text-slate-700">No Assessment Tasks Published</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">No published tasks have been broadcast by instructors for your tier ({activeClassTier}) yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredCourseAssignments.map((asm) => {
            const timer = assignmentTimers[asm.id] || { displayString: "Syncing...", isExpired: false };
            return (
              <div key={asm.id} className="p-4 sm:p-5 bg-slate-50/50 border border-slate-200/60 rounded-2xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-mono font-bold text-indigo-600 uppercase tracking-wider">{asm.courses?.code || asm.courses?.section || asm.school_level_tier || "COURSE"}</span>
                    <span className={`text-[9px] px-2 py-0.5 rounded font-black uppercase ${asm.hasSubmitted ? "bg-emerald-100 text-emerald-800" : timer.isExpired ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"}`}>
                      {asm.hasSubmitted ? "Turned In" : timer.isExpired ? "Terminated" : "Pending Action"}
                    </span>
                  </div>
                  <h4 className="text-sm font-black text-slate-800 mt-1 break-words">{asm.title}</h4>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-[11px] text-slate-400 pt-1">
                    <p className="truncate">⏳ Assigned: <span className="font-medium text-slate-600">{new Date(asm.created_at).toLocaleString()}</span></p>
                    {!asm.hasSubmitted && (
                      <p className={`font-mono font-bold ${timer.isExpired ? "text-rose-500" : "text-indigo-600"}`}>
                        🕒 Remaining: {timer.displayString}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap sm:flex-nowrap gap-2 items-center w-full md:w-auto">
                  <a href={asm.file_url} target="_blank" rel="noreferrer" className="flex-1 sm:flex-none text-center bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3.5 py-2.5 rounded-xl transition-all">📖 Briefing File</a>
                  {asm.hasSubmitted ? (
                    <a href={asm.submittedFileUrl} target="_blank" rel="noreferrer" className="flex-1 sm:flex-none text-center bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-xs px-3.5 py-2.5 rounded-xl transition-all">📁 View Turn-In</a>
                  ) : (
                    <button 
                      type="button" 
                      disabled={timer.isExpired} 
                      onClick={() => setActiveModalAssignment(asm)} 
                      className={`flex-1 sm:flex-none font-bold text-xs px-3.5 py-2.5 rounded-xl transition-all shadow-md items-center justify-center cursor-pointer ${timer.isExpired ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none" : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100"}`}
                    >
                      {timer.isExpired ? "🔒 Locked" : "📤 Upload Task"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Submission Upload Modal Popup */}
      {activeModalAssignment && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-[2rem] border-8 border-indigo-950/10 max-w-md w-full overflow-hidden shadow-2xl my-auto">
            <div className="p-4 sm:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="font-black text-slate-800 text-base">Submit Task Solution</h3>
                <p className="text-[11px] font-mono text-indigo-600 font-bold mt-0.5 truncate max-w-[260px]">{activeModalAssignment.title}</p>
              </div>
              <button type="button" onClick={() => setActiveModalAssignment(null)} className="text-slate-400 hover:text-slate-600 text-2xl p-1 cursor-pointer">×</button>
            </div>

            <form onSubmit={handleTurnInAssignment} className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 tracking-wider mb-1.5">Select Completed Assignment File</label>
                <input
                  type="file"
                  required
                  onChange={(e) => setUploadFile(e.target.files[0])}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 border border-slate-200 p-2 rounded-xl bg-slate-50/50"
                />
                <p className="text-[10px] text-slate-400 mt-1">Upload your finished document sheet (PDF, Word, or Image scan).</p>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100 mt-6">
                <button type="button" onClick={() => setActiveModalAssignment(null)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm py-3 rounded-xl transition-colors cursor-pointer">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-sm py-3 rounded-xl shadow-md transition-colors cursor-pointer">
                  {isSubmitting ? "Submitting..." : "🚀 Turn In Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}