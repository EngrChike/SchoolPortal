"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

export default function CentralAuthGateway() {
  const router = useRouter();
  
  const [email, setEmail] = useState("");
  const [userRole, setUserRole] = useState(null); 
  const [profile, setProfile] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Set the structural master email endpoint
  const MASTER_ADMIN_EMAIL = "admin@edupulse.com";

  async function handleVerifyEmail(e) {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return;
    
    setIsChecking(true);

    try {
      if (cleanEmail === MASTER_ADMIN_EMAIL) {
        const { data: adminRow, error: adminErr } = await supabase
          .from("admin_auth")
          .select("*")
          .eq("email", cleanEmail)
          .maybeSingle();

        setUserRole("admin");
        setProfile({
          name: "System Director",
          identifier: "Central Admin Node",
          // Fix: Ensure this isn't masking empty fields if you want strict validation checks
          storedPassword: adminRow?.password || null
        });
        setIsChecking(false);
        return;
      }

      const { data: teacher, error: errT } = await supabase
        .from("teachers")
        .select("*")
        .eq("email", cleanEmail)
        .maybeSingle();

      if (teacher) {
        setUserRole("teacher");
        setProfile({
          name: teacher.name,
          identifier: teacher.department || "Faculty Board",
          storedPassword: teacher.password || null
        });
        setIsChecking(false);
        return;
      }

      const { data: student, error: errS } = await supabase
        .from("students")
        .select("*")
        .eq("email", cleanEmail)
        .maybeSingle();

      if (student) {
        setUserRole("student");
        setProfile({
          name: student.name,
          identifier: student.reg_number,
          storedPassword: student.password || null
        });
        setIsChecking(false);
        return;
      }

      alert("Access Denied: This email address is not registered on the institution servers.");
    } catch (err) {
      alert("System Lookup Failure: " + err.message);
    } finally {
      setIsChecking(false);
    }
  }

  async function handleFinalizeAuth(e) {
    e.preventDefault();
    setIsSubmitting(true);
    const cleanEmail = email.trim().toLowerCase();
    const cleanInputPassword = password.trim();

    try {
      let targetTable = "";
      if (userRole === "admin") targetTable = "admin_auth";
      else if (userRole === "teacher") targetTable = "teachers";
      else if (userRole === "student") targetTable = "students";

      // Case A: Stored password field missing entirely -> Commit new profile access string
      if (!profile.storedPassword) {
        const { error } = await supabase
          .from(targetTable)
          .update({ password: cleanInputPassword })
          .eq("email", cleanEmail);

        if (error) throw error;
        
        profile.storedPassword = cleanInputPassword;
        alert("🔒 Password configured and saved permanently for this account profile!");
      } 
      // Case B: Evaluate against exact database string match ruleset securely
      else if (String(profile.storedPassword).trim() !== cleanInputPassword) {
        alert("❌ Incorrect Password! Access verification failed.");
        setIsSubmitting(false);
        return;
      }

      // Commit Active Role Session context to storage
      if (userRole === "student") {
        localStorage.setItem("active_student_email", cleanEmail);
      } else if (userRole === "teacher") {
        localStorage.setItem("active_teacher_email", cleanEmail);
      } else if (userRole === "admin") {
        localStorage.setItem("active_admin_email", cleanEmail);
      }

      // Routing Node Resolver
      if (userRole === "admin") router.push("/admin-dashboard");
      else if (userRole === "teacher") router.push("/teacher-dashboard");
      else if (userRole === "student") router.push("/student-dashboard");
    } catch (err) {
      alert("Authentication error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-indigo-900 flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-[2.5rem] max-w-md w-full p-8 shadow-2xl border-8 border-indigo-950/20 relative">
        
        {/* Unified Branding Header Block */}
        <div className="text-center mb-8">
          <div className="h-16 w-16 rounded-2xl overflow-hidden bg-slate-900 flex items-center justify-center border border-slate-200 mx-auto mb-3 shadow-sm relative">
            <img 
              src="/logo.png" 
              alt="Don Chike International School" 
              className="h-full w-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const fallback = e.currentTarget.nextSibling;
                if (fallback) fallback.style.display = 'flex';
              }}
            />
            <div className="hidden absolute inset-0 bg-indigo-600 text-white font-black text-xl items-center justify-center">
              DC
            </div>
          </div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase leading-none">
            Don Chike
          </h2>
          <span className="block text-[10px] font-bold text-indigo-600 tracking-wider uppercase mt-1">
            International School
          </span>
          <p className="text-[11px] font-mono text-slate-400 mt-2 bg-slate-50 border border-slate-200/60 py-1 px-3 rounded-full w-fit mx-auto">
            EduPulse Gateway Terminal
          </p>
        </div>

        {!profile ? (
          <form onSubmit={handleVerifyEmail} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 tracking-wider mb-1.5">
                Institutional Email Address
              </label>
              <input 
                type="email" 
                required 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 p-3.5 text-sm text-slate-800 outline-none focus:border-indigo-600 bg-slate-50/50" 
                placeholder="name@edupulse.com"
              />
            </div>
            <button type="submit" disabled={isChecking} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm py-4 rounded-2xl transition-all shadow-md shadow-emerald-100 cursor-pointer">
              {isChecking ? "Checking Identity Node..." : "Verify Identity"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleFinalizeAuth} className="space-y-5">
            <div className="bg-indigo-50/60 rounded-2xl p-4 border border-indigo-100 text-xs text-indigo-950 space-y-1">
              <p><strong>User Role:</strong> <span className="uppercase font-bold text-indigo-600">{userRole}</span></p>
              <p><strong>Identity:</strong> {profile.name}</p>
              <p><strong>Registry Anchor:</strong> {profile.identifier}</p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 tracking-wider mb-1.5">
                {!profile.storedPassword ? "✨ Create Your Permanent Password" : "🔑 Enter Security Password"}
              </label>
              <input 
                type="password" 
                required 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 p-3.5 text-sm text-slate-800 outline-none focus:border-indigo-600 bg-slate-50/50" 
                placeholder="••••••••"
              />
            </div>

            <button type="submit" disabled={isSubmitting} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm py-4 rounded-2xl transition-all shadow-md shadow-indigo-100 cursor-pointer">
              {isSubmitting ? "Opening Dashboard..." : !profile.storedPassword ? "Set Password & Save Account" : "Access Workspace"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}