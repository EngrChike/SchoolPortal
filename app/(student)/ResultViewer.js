"use client";

import { useState } from "react";

export default function ResultViewer({
  dbResultPin,
  regNumber,
  fullName,
  studentSection,
  classLevel,
  termName,
  overallAverageScore,
  performanceRecords,
  schoolStamp,
  adminSignature
}) {
  const [inputPin, setInputPin] = useState("");
  const [isResultUnlocked, setIsResultUnlocked] = useState(false);
  const [pinError, setPinError] = useState("");

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

  // Calculate status based on average score rule (<= 49 is Fail, else Pass)
  const isFailed = Number(overallAverageScore) <= 49;

  return (
    <div className="w-full max-w-4xl mx-auto px-2 sm:px-4">
      
      {/* Advanced Print CSS to wipe out browser headers/footers, lock everything into page 1, and force image rendering */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page {
            size: A4 portrait;
            margin: 0mm !important;
          }
          
          body, html {
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .no-print-wrapper { 
            display: none !important; 
          }

          .print-sheet-node { 
            display: block !important; 
            border: none !important; 
            box-shadow: none !important; 
            padding: 6mm 8mm !important; 
            margin: 0 auto !important;
            width: 100% !important;
            max-width: 210mm !important;
            background: white !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            transform: scale(0.90);
            transform-origin: top center;
          }

          /* Force Images to render and prevent parent containers from collapsing */
          .print-sheet-node img {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            max-width: 100% !important;
            max-height: 100% !important;
          }
            
          .print-image-container {
            display: flex !important;
            min-height: 40px !important;
            min-width: 80px !important;
          }

          .print-stamp-box {
            border: 2px dashed #000000 !important;
            background-color: #f8fafc !important;
            display: block !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .print-watermark-container {
            display: flex !important;
            opacity: 0.025 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .print-signature-line {
            border-bottom: 2px solid #000000 !important;
          }
        }
      `}} />

      {!isResultUnlocked ? (
        <div className="bg-white p-6 sm:p-8 rounded-[2rem] border border-slate-200 shadow-sm max-w-md mx-auto text-center no-print-wrapper mt-4">
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
          <div className="flex justify-end mb-4 no-print-wrapper">
            <button type="button" onClick={() => window.print()} className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs py-3 px-6 rounded-xl shadow-md cursor-pointer transition-all w-full sm:w-auto">🖨️ Print Transcript Statement</button>
          </div>

          <div className="bg-white border border-slate-200/85 rounded-3xl p-4 sm:p-6 shadow-sm relative print-sheet-node overflow-hidden space-y-4 font-sans">
            
            {/* Background Watermark */}
            <div className="absolute inset-0 pointer-events-none items-center justify-center hidden print-watermark-container select-none opacity-[0.02]">
              <h2 className="text-[7rem] font-black uppercase text-slate-900 tracking-tight rotate-12 select-none">OFFICIAL</h2>
            </div>

            {/* Centered Header Section */}
            <div className="flex flex-col items-center justify-center text-center border-b border-slate-100 pb-3">
              <div className="h-12 w-12 mb-2 overflow-hidden flex items-center justify-center print-image-container">
                <img src="/logo.png" alt="Institutional Seal" className="w-full h-full object-contain" />
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight uppercase">Don Chike International School</h2>
              <p className="text-[9px] sm:text-[10px] font-bold text-indigo-600 mt-0.5 uppercase tracking-widest">Official Academic Performance Record</p>
            </div>

            {/* Student Info Box */}
            <div className="border border-slate-200 rounded-xl p-3.5 bg-white flex flex-col sm:flex-row justify-between gap-3 text-xs">
              <div className="space-y-1.5">
                <p><span className="font-bold text-slate-600">Student Full Name:</span> <span className="font-black text-slate-800 ml-1">{fullName || "N/A"}</span></p>
                <p><span className="font-bold text-slate-600">Class Level & Term:</span> <span className="font-black text-slate-800 ml-1">{classLevel || "N/A"} ({termName})</span></p>
              </div>
              <div className="space-y-1.5">
                <p><span className="font-bold text-slate-600">Registration Number:</span> <span className="font-black text-slate-800 ml-1">{regNumber || "UNALLOCATED"}</span></p>
                <p><span className="font-bold text-slate-600">Terminal Course Count:</span> <span className="font-black text-slate-800 ml-1">{performanceRecords?.length || 0} Units</span></p>
              </div>
            </div>

            {/* Performance Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="border-b border-slate-200 text-[9px] font-black uppercase text-slate-800 bg-slate-50/50">
                      <th className="py-2.5 px-4 w-1/6">Module Code</th>
                      <th className="py-2.5 px-4 w-2/6">Module Description</th>
                      <th className="py-2.5 px-4 text-center">CA (30)</th>
                      <th className="py-2.5 px-4 text-center">Mid Sem (20)</th>
                      <th className="py-2.5 px-4 text-center">Final Exam (50)</th>
                      <th className="py-2.5 px-4 text-center">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px] text-slate-800 font-medium">
                    {performanceRecords.map((rec, i) => {
                      const rawCA = rec.continuous_assessment;
                      const rawMid = rec.mid_semester;
                      const rawExam = rec.final_exam;
                      
                      const caScore = Number(rawCA) || 0;
                      const midScore = Number(rawMid) || 0;
                      const examScore = Number(rawExam) || 0;
                      const totalScore = caScore + midScore + examScore;

                      const displayCA = rawCA != null && rawCA !== "" ? rawCA : "-";
                      const displayMid = rawMid != null && rawMid !== "" ? rawMid : "-";
                      const displayExam = rawExam != null && rawExam !== "" ? rawExam : "-";

                      const courseCode = rec.courses?.code || rec.course_id || "N/A";
                      const courseName = rec.courses?.name || rec.courses?.title || rec.course_name || courseCode.replace(/-/g, " ");

                      // 🔥 Strip teacher initials from module code (e.g. JSS1_AGR-JD becomes JSS1_AGR)
                      const displayCourseCode = courseCode.split('-')[0];

                      return (
                        <tr key={i} className="hover:bg-slate-50/30 transition-colors">
                          <td className="py-2 px-4 font-bold text-indigo-600 uppercase">{displayCourseCode}</td>
                          <td className="py-2 px-4 font-black text-slate-900">{courseName}</td>
                          <td className="py-2 px-4 text-center text-slate-600">{displayCA}</td>
                          <td className="py-2 px-4 text-center text-slate-600">{displayMid}</td>
                          <td className="py-2 px-4 text-center text-slate-600">{displayExam}</td>
                          <td className="py-2 px-4 text-center font-black text-slate-900">{totalScore}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Attestation Statement */}
            <div className="border border-slate-200 bg-slate-50/60 rounded-xl p-3 text-slate-800 text-center">
              <div className="text-[9px] font-black text-indigo-900 uppercase mb-1">Official Attestation Profile</div>
              <p className="text-[10px] text-slate-600 leading-relaxed max-w-2xl mx-auto">
                This is to certify that <span className="text-slate-900 font-black">{fullName || "Student"}</span> bearing index code <span className="text-slate-900 font-black">{regNumber || "N/A"}</span> completed terminal assessments for <span className="text-slate-900 font-black">{termName}</span> under the <span className="text-slate-900 font-black">{studentSection || "General"}</span> section, with a cumulative score average of <span className="font-mono font-bold text-indigo-700">{overallAverageScore}%</span>, resulting in an official standing status of <span className={`font-black uppercase ${isFailed ? 'text-rose-600' : 'text-emerald-600'}`}>{isFailed ? 'Fail' : 'Pass'}</span>.
              </p>
            </div>
            
            {/* Stamp & Signature Section */}
            <div className="pt-3 border-t-2 border-slate-200 grid grid-cols-2 gap-6 items-end">
              <div className="flex flex-col items-start">
                <div className="h-12 w-28 flex items-center justify-center mb-1 relative print-image-container">
                  {schoolStamp && <img src={schoolStamp} alt="Official Stamp" className="max-h-full object-contain" />}
                </div>
                <div className="w-full max-w-[130px] print-stamp-box border border-slate-300 rounded-xl py-1 px-2 bg-slate-50 text-center shadow-xs">
                  <span className="text-[7px] uppercase font-bold text-slate-400">Institutional Stamp</span>
                </div>
              </div>
              
              <div className="flex flex-col items-end text-right">
                <div className="h-12 w-32 flex items-center justify-end mb-1 print-image-container">
                  {adminSignature && <img src={adminSignature} alt="Signature" className="max-h-full object-contain" />}
                </div>
                <div className="w-full max-w-[150px] print-signature-line border-b-2 border-slate-400 pb-1 text-center">
                  <p className="text-[10px] font-black text-slate-800">Registrar Administration</p>
                </div>
                <span className="text-[7px] uppercase font-bold text-slate-400 mt-1">Authorized Signature Validation</span>
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
}