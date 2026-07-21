"use client";

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize the client directly using your environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function AnnouncementsPage() {
  const [title, setTitle] = useState('Important Administrative Update: School Fees Enforcement Drive');
  const [text, setText] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePublish = async (e) => {
    e.preventDefault();
    if (!text || !title) {
      setStatusMessage('❌ Please provide both a title and announcement message.');
      return;
    }

    if (!supabaseUrl || !supabaseAnonKey) {
      setStatusMessage('❌ Supabase environment variables are missing configuration.');
      return;
    }

    setIsUploading(true);
    setStatusMessage('⌛ Syncing files and deploying to front page...');

    try {
      let uploadedImageUrl = "";

      // 1. Upload file to Supabase Storage Bucket if selected
      if (image) {
        const fileExt = image.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `announcements/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('school-assets') // Adjust if your bucket name is named differently
          .upload(filePath, image);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('school-assets')
          .getPublicUrl(filePath);

        uploadedImageUrl = publicUrlData.publicUrl;
      }

      // 2. Insert record into PostgreSQL table
      const { error: dbError } = await supabase
        .from('announcements')
        .insert([
          { 
            title: title, 
            content: text, 
            image_url: uploadedImageUrl || "/logo.png" 
          }
        ]);

      if (dbError) throw dbError;

      setStatusMessage('🚀 Success! Broadcast is now live on the front page.');
      setText('');
      setImage(null);
      setImagePreview('');
    } catch (error) {
      console.error(error);
      setStatusMessage(`❌ Error: ${error.message || 'Failed to save announcement'}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="h-full flex flex-col gap-6 font-sans">
      <div>
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">📢 Broadcast Board Manager</h2>
        <p className="text-sm text-slate-500 mt-1">Compose notices and update front page layout modules instantly.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start flex-1">
        {/* Form Inputs */}
        <form onSubmit={handlePublish} className="bg-slate-50 border border-slate-100 p-6 rounded-2xl space-y-4 shadow-sm">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">Notice Header / Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">Message Content</label>
            <textarea
              rows={5}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste your school fee drive copy here..."
              className="w-full rounded-xl border border-slate-200 p-4 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">Media File Attachment</label>
            <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-slate-300 border-dashed rounded-xl cursor-pointer bg-white hover:bg-slate-50">
              <span className="text-xl mb-1">🖼️</span>
              <p className="text-xs font-semibold text-slate-500">{image ? image.name : "Select cover banner"}</p>
              <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
            </label>
          </div>

          {statusMessage && (
            <p className={`text-xs font-bold p-3 rounded-lg ${statusMessage.includes('🚀') ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-slate-700'}`}>
              {statusMessage}
            </p>
          )}

          {/* Core Action Submit Button Node */}
          <button
            type="submit"
            disabled={isUploading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-md transition-all text-sm disabled:opacity-50"
          >
            {isUploading ? "Processing..." : "💾 Save & Publish Broadcast"}
          </button>
        </form>

        {/* Live Local Sandbox Preview Panel */}
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Sandbox Layout Preview</span>
          <div className="border border-slate-100 rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-4 border p-4 rounded-xl bg-slate-50/50">
              <img src={imagePreview || "/logo.png"} className="w-full h-40 object-cover rounded-lg bg-white" alt="preview" />
              <div>
                <h4 className="font-black text-slate-800 text-base">{title}</h4>
                <p className="text-xs text-slate-500 mt-1 whitespace-pre-wrap">{text || "Type details..."}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}