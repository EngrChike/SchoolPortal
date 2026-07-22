"use client";

import { useState } from "react";

export default function ResultViewer({
  dbResultPin,
  regNumber,
  fullName,
  studentSection,
  classLevel,
  overallAverageScore,
  performanceRecords,
  schoolStamp,
  adminSignature
}) {
  const [inputPin, setInputPin] = useState("");
  const [isResultUnlocked, setIsResultUnlocked] = useState(false);
  const [pinError, setPinError] = useState("");

  // Handle PIN Access Screening Entry Verification Form submission
  function handleVerifyResultPin(e) {
    e.preventDefault();
    setPinError("");
    
    if (!dbResultPin) {
      setPinError("❌ Access Profile Error: No verification PIN has been provisioned for this student profile yet. Contact administration.");
      return;
    }

    if (inputPin.trim() === dbResultPin.trim()) {
      setIsResultUnlocked(true);
      setPinError("");
    } else {
      setPinError("❌ Access Denied: Invalid security PIN entered. Please verify credential key strings and retry.");
    }
  }

  return (
    <div className="space-y-6">
      
      {/* Hyper-compressed print stylesheet optimized to lock everything into 1 single page */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body {
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .no-print-wrapper { 
            display: none !important; 
          }
          .print-root-container { 
            padding: 0 !important; 
            background: white !important; 
            margin: 0 !important; 
            max-width: 100% !important; 
          }
          .print-sheet-node { 
            display: block !important; 
            border: none !important; 
            box-shadow: none !important; 
            padding: 2mm 4mm !important; 
            margin: 0 !important;
            width: 100% !important;
            background: white !important;
            position: relative !important;
            transform: scale(0.97);
            transform-origin: top center;
          }
          .print-stamp-box {
            border: 2px dashed #000000 !important;
            background-color: #fafafa !important;
            display: block !important;
            min-height: 40px !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print-watermark-container {
            display: flex !important;
            opacity: 0.03 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print-signature-line {
            border-bottom: 2px solid #000000 !important;
          }
          @page { 
            size: A4 portrait; 
            margin: 4mm; 
          }
        }
      `}} />

      {!isResultUnlocked ? (
        <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm max-w-md mx-auto text-center no-print-wrapper mt-4">
          <div className="h-14 w-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-xl">🔒</div>
          <h3 className="text-base font-black text-slate-800 tracking-tight">Security Credentials Required</h3>
          <p className="text-xs text-slate-400 mt-1 mb-6">Enter your authorized structural performance access PIN to unlock and view your academic slip matrix rows.</p>
          
          <form onSubmit={handleVerifyResultPin} className="space-y-4">
            <input type="password" required placeholder="••••••" value={inputPin} onChange={(e) => setInputPin(e.target.value)} className="w-full text-center tracking-widest rounded-xl border border-slate-200 p-3 text-lg font-bold bg-slate-50 outline-none focus:border-indigo-600" />
            {pinError && <p className="text-xs text-rose-600 font-bold bg-rose-50 p-2.5 rounded-xl">{pinError}</p>}
            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-3.5 rounded-xl cursor-pointer shadow-md shadow-indigo-100">Unlock Grade Ledger Sheet</button>
          </form>
        </div>
      ) : (
        <>
          <div className="flex justify-end no-print-wrapper">
            <button type="button" onClick={() => window.print()} className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs py-3 px-6 rounded-xl shadow-md cursor-pointer transition-all">🖨️ Print Transcript Statement</button>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-[2.5rem] p-5 sm:p-8 shadow-sm relative print-sheet-node overflow-hidden">
            
            {/* Background Decorative Watermark */}
            <div className="absolute inset-0 pointer-events-none items-center justify-center hidden print-watermark-container select-none opacity-[0.02]">
              <h2 className="text-[7rem] font-black uppercase text-slate-900 tracking-tight rotate-12 select-none">OFFICIAL</h2>
            </div>

            {/* Official Slip Document Header */}
            <div className="border-b-2 border-slate-800 pb-3 mb-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex items-center space-x-3">
                <div className="h-12 w-12 overflow-hidden flex items-center justify-center relative flex-shrink-0">
                  <img src="/logo.png" alt="Institutional Seal" className="w-full h-full object-contain max-h-full" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-none uppercase">Don Chike International School</h2>
                  <p className="text-[9px] font-bold text-slate-500 mt-0.5 uppercase tracking-widest">Office of the Registrar • Student Academic Record</p>
                  <p className="text-[8px] text-slate-400 font-medium">Abidjan, Côte d'Ivoire</p>
                </div>
              </div>
              <div className="text-left sm:text-right border-l-2 sm:border-l-0 sm:border-r-2 border-indigo-600 pl-3 sm:pl-0 sm:pr-3">
                <span className="text-[8px] font-black text-indigo-600 uppercase tracking-widest block">Transcript Identity</span>
                <span className="text-[11px] font-mono font-bold text-slate-700 block">{regNumber || "UNALLOCATED"}</span>
              </div>
            </div>

            {/* Meta Info Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 mb-3 text-[11px]">
              <div>
                <span className="block text-[8px] uppercase font-black text-slate-400 tracking-wider">Student Name</span>
                <p className="font-bold text-slate-800 truncate">{fullName || "N/A"}</p>
              </div>
              <div>
                <span className="block text-[8px] uppercase font-black text-slate-400 tracking-wider">Section Node</span>
                <p className="font-bold text-slate-800">{studentSection || "N/A"}</p>
              </div>
              <div>
                <span className="block text-[8px] uppercase font-black text-slate-400 tracking-wider">Class Level</span>
                <p className="font-bold text-slate-800">{classLevel || "N/A"}</p>
              </div>
              <div>
                <span className="block text-[8px] uppercase font-black text-slate-400 tracking-wider">Cummulative Avg</span>
                <p className="font-mono font-black text-indigo-600 bg-indigo-50/60 border border-indigo-100 px-1.5 py-0.5 w-fit rounded">{overallAverageScore}%</p>
              </div>
            </div>

            {/* Main Performance Grid Table */}
            <div className="overflow-x-auto mb-3">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-700 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                    <th className="py-1.5 px-2">Code</th>
                    <th className="py-1.5 px-2">Course Module Title</th>
                    <th className="py-1.5 px-2 text-center">CA (40)</th>
                    <th className="py-1.5 px-2 text-center">Exam (60)</th>
                    <th className="py-1.5 px-2 text-center">Total (100)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px] text-slate-700">
                  {performanceRecords.map((rec, i) => {
                    const ca = rec.continuous_assessment || 0;
                    const mid = rec.mid_semester || 0;
                    const exam = rec.final_exam || 0;
                    
                    const compositeCA = ca + mid;
                    const totalGrade = compositeCA + exam;

                    return (
                      <tr key={i} className="hover:bg-slate-50/40 transition-colors">
                        <td className="py-1.5 px-2 font-mono font-bold text-indigo-600 uppercase">{rec.courses?.code || "N/A"}</td>
                        <td className="py-1.5 px-2 font-black text-slate-800">{rec.courses?.name || "N/A"}</td>
                        <td className="py-1.5 px-2 text-center font-medium font-mono text-slate-600">{compositeCA}</td>
                        <td className="py-1.5 px-2 text-center font-medium font-mono text-slate-600">{exam}</td>
                        <td className="py-1.5 px-2 text-center font-bold font-mono text-slate-900 bg-slate-50/30">{totalGrade}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Official Certification Attestation Banner Wrapper */}
            <div className="mb-3 border border-slate-200 bg-white rounded-xl p-2.5 text-slate-800 text-center">
              <div className="text-[10px] font-black text-indigo-900 tracking-wider uppercase mb-1">
                OFFICIAL ATTESTATION PROFILE
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-600 font-medium leading-tight max-w-2xl mx-auto">
                This is to certify that <span className="text-slate-900 font-black border-b border-slate-900">{fullName || "Incomplete Profile"}</span> bearing index code <span className="text-slate-900 font-black">{regNumber || "UNALLOCATED"}</span> has completed all scheduled structural terminal performance assessments across the designated course catalog, achieving a cumulative calculated average score of <span className="font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-1 rounded">{overallAverageScore}%</span> over the course of the registered term modules.
              </p>
            </div>
            
            {/* Official Validation Stamp Footer Box Elements */}
            <div className="pt-2 border-t border-slate-200/80 grid grid-cols-2 gap-4 items-end">
              <div className="flex flex-col items-start justify-end">
                <div className="h-10 w-24 flex items-center justify-center mb-0.5 overflow-hidden relative">
                  {schoolStamp && <img src={schoolStamp} alt="Official Stamp" className="max-h-full object-contain" />}
                </div>
                <div className="w-full max-w-[140px] print-stamp-box border-slate-200 border rounded-lg py-1 px-2 bg-slate-50/50 text-center">
                  <span className="text-[7px] uppercase font-bold text-slate-400 tracking-wider">Institutional Stamp</span>
                </div>
              </div>
              <div className="flex flex-col items-center justify-end text-center">
                <div className="h-10 w-28 flex items-center justify-center mb-0.5 overflow-hidden">
                  {adminSignature && <img src={adminSignature} alt="Signature" className="max-h-full object-contain" />}
                </div>
                <div className="w-full max-w-[160px] print-signature-line border-b border-slate-400 pb-0.5">
                  <p className="text-[10px] font-black text-slate-800">Registrar Administration</p>
                </div>
                <span className="text-[7px] uppercase font-bold text-slate-400 tracking-wider mt-0.5">Authorized Signature Validation</span>
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
}