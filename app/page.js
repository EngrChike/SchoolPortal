"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

// Initialize the client directly using your environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function RootLandingPage() {
  // Dynamic announcement states initialized with defaults
  const [announcementText, setAnnouncementText] = useState(
    "We are proud to activate our unified campus dashboard ecosystem. Students and incoming scholars can now officially interface with their internal configuration profiles via the EduPulse module. Make sure all parent metadata relationship info and emergency contacts are accurately logged."
  );
  const [announcementImage, setAnnouncementImage] = useState("/logo.png");
  const [announcementTitle, setAnnouncementTitle] = useState(
    "Academic Portals and Bio-Data Registration Now Live"
  );
  const [announcementDate, setAnnouncementDate] = useState("July 2, 2026");

  // Fetch the latest published broadcast dynamically on mount
  useEffect(() => {
    // Prevent execution if environmental keys aren't set up yet
    if (!supabaseUrl || !supabaseAnonKey) return;

    async function fetchLatestAnnouncement() {
      try {
        const { data, error } = await supabase
          .from('announcements')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) throw error;

        if (data && data.length > 0) {
          const latest = data[0];
          setAnnouncementTitle(latest.title);
          setAnnouncementText(latest.content);
          setAnnouncementImage(latest.image_url || "/logo.png");
          
          if (latest.created_at) {
            const formattedDate = new Date(latest.created_at).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            });
            setAnnouncementDate(formattedDate);
          }
        }
      } catch (err) {
        console.error("Error fetching announcement from front page:", err.message);
      }
    }

    fetchLatestAnnouncement();
  }, []);

  return (
    <div className="min-h-screen bg-indigo-900 flex flex-col items-center justify-center p-4 md:p-8 font-sans space-y-8">
      
      {/* Main Floating Card Workspace Container */}
      <div className="bg-white rounded-[2.5rem] w-full max-w-6xl shadow-2xl overflow-hidden relative border-8 border-indigo-950/20">
        
        {/* Navigation Header Strip */}
        <header className="px-8 py-6 flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl overflow-hidden bg-slate-900 flex-shrink-0 flex items-center justify-center border border-slate-200 relative shadow-sm">
              <img 
                src="/logo.png" 
                alt="Don Chike International School Logo" 
                className="h-full w-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const fallback = e.currentTarget.nextSibling;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
              <div className="hidden absolute inset-0 bg-indigo-600 text-white font-black text-lg items-center justify-center">
                DC
              </div>
            </div>
            <div>
              <span className="block text-lg font-black text-slate-800 tracking-tight leading-none uppercase">
                Don Chike
              </span>
              <span className="block text-[10px] font-bold text-indigo-600 tracking-wider uppercase mt-1">
                International School
              </span>
            </div>
          </div>

          <nav className="flex items-center gap-6 text-xs font-bold uppercase tracking-wider text-slate-600">
            <a href="#about" className="hover:text-indigo-600 transition-colors">About</a>
            
            {/* Blinking Dynamic Announcement Anchor Node */}
            <a 
              href="#announcements" 
              className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 text-red-600 border border-red-100 animate-pulse hover:scale-105 transition-transform"
            >
              <span className="h-2 w-2 rounded-full bg-red-500 relative flex">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              </span>
              <span className="font-extrabold tracking-wide">Announcements</span>
            </a>

            <a href="#contact" className="hover:text-indigo-600 transition-colors">Contact</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-bold text-slate-700 hover:text-indigo-600 px-4 py-2 transition-colors">
              Sign Up
            </Link>
            <Link href="/login" className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold px-6 py-2.5 rounded-full shadow-lg shadow-emerald-200 transition-all">
              EduPulse Portal
            </Link>
          </div>
        </header>

        {/* Hero Segment Hero Matrix Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[500px] border-b border-slate-100">
          
          {/* Left Feature Action Panel */}
          <div className="lg:col-span-6 p-8 md:p-14 flex flex-col justify-center space-y-6 relative">
            
            {/* Location Badge */}
            <div className="flex items-center gap-2 text-[10px] font-bold tracking-widest text-slate-500 uppercase font-mono bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-full w-fit">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Abobo, Abidjan — Côte d&apos;Ivoire</span>
            </div>

            {/* Core Message Typography */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-800 leading-[1.1] tracking-tight">
              Welcome to <br />
              <span className="text-indigo-600">Don Chike</span> <br />
              <span className="text-slate-800 text-3xl md:text-4xl lg:text-5xl block mt-1">International School</span>
            </h1>
            <p className="text-sm md:text-base text-slate-400 leading-relaxed max-w-md font-medium">
              Access your cloud-driven academic workspace ecosystem instantly. We blend disciplined traditional excellence with digital capacity-building to raise global leaders.
            </p>

            {/* Quick Portal Entrance Form Action Strip */}
            <div className="pt-2 max-w-md">
              <div className="bg-slate-50 p-1.5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row gap-2">
                <input 
                  type="email" 
                  placeholder="Enter your institutional email" 
                  className="bg-transparent pl-4 pr-2 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none flex-1 font-mono"
                />
                <Link href="/login" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-6 py-3.5 rounded-xl text-center shadow-md shadow-indigo-200 transition-all whitespace-nowrap">
                  Get Started Fast
                </Link>
              </div>
            </div>

            {/* Institutional Motto Section */}
            <div className="p-4 rounded-xl bg-indigo-50 border-l-4 border-indigo-600">
              <p className="text-[10px] font-mono font-bold text-indigo-600 uppercase tracking-wider">Institutional Motto</p>
              <blockquote className="text-base font-black italic text-slate-700 mt-0.5">
                &ldquo;Skill is the catalyst of the Future.&rdquo;
              </blockquote>
            </div>
          </div>

          {/* Right Visual Graphical Canvas Frame — Enhanced with exact full-bleed hero image matching nmnnm.PNG */}
          <div className="lg:col-span-6 bg-slate-100 relative min-h-[400px] lg:min-h-full overflow-hidden flex items-stretch">
            <img 
              src="/hero-banner.png" 
              alt="Don Chike Students Gateway Portal" 
              className="w-full h-full object-cover object-center absolute inset-0"
              onError={(e) => {
                // Safe absolute fallback if image is missing in project directory
                e.currentTarget.src = "https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=1200";
              }}
            />
            {/* Soft border accent alignment shadowing inside grid cell */}
            <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent pointer-events-none hidden lg:block" />
          </div>

        </div>

        {/* ADMIN ANNOUNCEMENT SECTION */}
        <section id="announcements" className="p-8 md:p-14 bg-white border-b border-slate-100">
          <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <span className="text-xs font-mono font-bold text-indigo-600 tracking-wider uppercase block">Official Broadcasts</span>
              <h2 className="text-2xl md:text-3xl font-black tracking-tight text-slate-800 mt-0.5">Latest Announcements</h2>
            </div>
            <span className="text-xs text-slate-400 font-semibold font-mono bg-slate-50 px-3 py-1 rounded-md border border-slate-200/60 w-fit">
              Published by Management
            </span>
          </div>

          <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-6 flex flex-col md:flex-row gap-8 items-start">
            
            {/* Aspect 9:16 Portrait Styled Image Container */}
            <div className="w-full md:w-64 aspect-[9/16] rounded-2xl bg-white overflow-hidden relative flex-shrink-0 border border-slate-200 shadow-sm flex items-center justify-center">
              <img 
                src={announcementImage} 
                alt="Announcement Graphic Banner" 
                className="w-full h-full object-cover"
              />
            </div>

            <div className="space-y-4 flex-1 w-full pt-2">
              <div className="text-slate-400 text-xs font-bold font-mono flex items-center gap-2">
                <span>{announcementDate}</span>
                <span>•</span>
                <span className="text-indigo-600">Administrative Office</span>
              </div>
              <h3 className="text-2xl font-black text-slate-800 tracking-tight leading-tight">
                {announcementTitle}
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed font-medium whitespace-pre-wrap bg-white/60 p-4 border border-slate-100 rounded-xl shadow-sm">
                {announcementText}
              </p>
              <div className="pt-2">
                <Link href="/login" className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors bg-indigo-50 px-4 py-2 rounded-lg border border-indigo-100/50">
                  <span>Open Registration Dashboard</span>
                  <span>→</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* INSTITUTIONAL PROFILE TRILOGY */}
        <section id="about" className="p-8 md:p-14 bg-slate-50/50 grid grid-cols-1 md:grid-cols-3 gap-8 border-b border-slate-100">
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex flex-col justify-between">
            <div className="space-y-3">
              <div className="text-2xl">🏛️</div>
              <h3 className="text-base font-black tracking-tight text-slate-800 uppercase">About Our School</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                Based strategically out of Abobo, Abidjan, Don Chike International School functions as an academic center of excellence designed to give students a comprehensive global education edge.
              </p>
            </div>
            <span className="text-[9px] font-mono font-bold text-slate-300 block mt-6 tracking-wider uppercase">Abidjan Hub Node</span>
          </div>

          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex flex-col justify-between">
            <div className="space-y-3">
              <div className="text-2xl">🎯</div>
              <h3 className="text-base font-black tracking-tight text-slate-800 uppercase">Our Core Mission</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                To transform traditional learning metrics through direct integration of deep functional programming and digital skills workflows right into general studies modules.
              </p>
            </div>
            <span className="text-[9px] font-mono font-bold text-slate-300 block mt-6 tracking-wider uppercase">Strategic Competency</span>
          </div>

          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex flex-col justify-between">
            <div className="space-y-3">
              <div className="text-2xl">👁️</div>
              <h3 className="text-base font-black tracking-tight text-slate-800 uppercase">Institutional Vision</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                To stand as the absolute elite benchmark for international learning systems across Côte d&apos;Ivoire where high technical skill remains the primary vehicle for societal transformation.
              </p>
            </div>
            <span className="text-[9px] font-mono font-bold text-slate-300 block mt-6 tracking-wider uppercase">Catalysts of Tomorrow</span>
          </div>
        </section>

        {/* PREMIUM INSTITUTIONAL FOOTER */}
        <section id="contact" className="px-8 py-8 bg-white flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-semibold border-t border-slate-100">
          <div className="flex flex-wrap items-center justify-center gap-6 text-slate-500">
            <p className="flex items-center gap-1.5">
              <span className="text-indigo-600">📍</span> 
              <span className="text-slate-600 font-medium">Abobo, Abidjan — Côte d&apos;Ivoire</span>
            </p>
            <p className="flex items-center gap-1.5">
              <span className="text-emerald-500">✉️</span> 
              <span className="text-slate-600 font-mono font-medium">info@donchike.international</span>
            </p>
          </div>
          <div className="text-slate-400 font-mono text-[11px] font-bold">
            © 2026 Don Chike International School. All rights reserved.
          </div>
        </section>

      </div>
    </div>
  );
}