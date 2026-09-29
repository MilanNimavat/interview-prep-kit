'use client';

import Link from 'next/link';
import { Sparkles, PlusCircle, ArrowRight, ShieldCheck, Cpu, Calendar, CheckCircle2 } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 p-8 sm:p-12 shadow-2xl">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold tracking-wide uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI-Driven Engineering Assessment</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Tailored Interview Kits for <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent">Every Developer Role</span>
          </h1>

          <p className="text-slate-400 text-lg leading-relaxed">
            Generate custom research briefs, categorized questions, rapid revision flashcards, and a deterministic arithmetic study schedule from any Job Description.
          </p>

          <div className="flex flex-wrap gap-4 pt-2">
            <Link
              href="/kits/new"
              className="inline-flex items-center space-x-2 px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-base transition-all shadow-lg shadow-blue-600/25 hover:scale-[1.02]"
            >
              <PlusCircle className="w-5 h-5" />
              <span>Generate New Prep Kit</span>
            </Link>

            <Link
              href="/kits"
              className="inline-flex items-center space-x-2 px-6 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-base transition-all border border-slate-700"
            >
              <span>View My Kits</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Core Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Cpu className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white">Heuristic Site Research</h3>
          <p className="text-slate-400 text-sm leading-relaxed">
            Crawls company homepages, ranks links for engineering blogs, handbooks, and values, and builds an honest company brief.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white">Two-Pass Coverage Engine</h3>
          <p className="text-slate-400 text-sm leading-relaxed">
            Checks generated questions against extracted mandatory (<code className="text-xs text-amber-400">must</code>) requirements. Automatically executes Pass 2 for missing skills.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Calendar className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white">Deterministic Arithmetic Schedule</h3>
          <p className="text-slate-400 text-sm leading-relaxed">
            100% deterministic math allocation (0 LLM calls). Prioritizes difficulty 3 and core requirements into earlier days with integer minutes.
          </p>
        </div>
      </div>
    </div>
  );
}
