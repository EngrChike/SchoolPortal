"use client";

import { useState, useEffect } from "react";

export default function StudentAssignmentsPanel({
  performanceRecords,
  courseAssignments,
  setSelectedAssignment,
  assignmentTimers
}) {
  return (
    <div className="bg-white p-5 sm:p-6 md:p-8 rounded-3xl sm:rounded-[2rem] border border-slate-100 shadow-sm no-print-wrapper">
      <div className="mb-6">
        <h3 className="text-base font-black text-slate-800 tracking-tight">Active Assignment Pipelines</h3>
        <p className="text-xs text-slate-400 mt-0.5">Task sheets distributed by faculty for your registered coursework units.</p>
      </div>
      {performanceRecords.length === 0 ? (
        <div className="text-center py-12">
          <div className="h-12 w-12 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center mx-auto mb-4 text-xl">📂</div>
          <h3 className="text-sm font-bold text-slate-700">No Assessment Task Profiles Formed</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">Register courses inside the enrollment hub to automatically mount distinct continuous task paths here.</p>
        </div>
      ) : courseAssignments.length === 0 ? (
        <p className="text-sm font-medium text-slate-400 text-center py-8">No published tasks uploaded by instructors for your registered modules yet.</p>
      ) : (
        <div className="space-y-4">
          {courseAssignments.map((asm) => {
            const timer = assignmentTimers[asm.id] || { displayString: "Syncing...", isExpired: false };
            return (
              <div key={asm.id} className="p-4 sm:p-5 bg-slate-50/50 border border-slate-200/60 rounded-2xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-mono font-bold text-indigo-600 uppercase tracking-wider">{asm.courses?.code}</span>
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
                    <button type="button" disabled={timer.isExpired} onClick={() => setSelectedAssignment(asm)} className={`flex-1 sm:flex-none font-bold text-xs px-3.5 py-2.5 rounded-xl transition-all shadow-md items-center justify-center cursor-pointer ${timer.isExpired ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none" : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100"}`}>
                      {timer.isExpired ? "🔒 Locked" : "📤 Upload Task"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}