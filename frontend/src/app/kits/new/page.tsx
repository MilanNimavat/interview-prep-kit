'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../../../lib/api';
import {
  Sparkles,
  Globe,
  Calendar,
  AlertTriangle,
  Upload,
  FileText,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Layers,
} from 'lucide-react';

const PROGRESS_STEPS = [
  { id: 1, label: 'Crawling Company Website & Links' },
  { id: 2, label: 'Extracting Core Requirements & Priorities' },
  { id: 3, label: 'Generating Categorized Question Bank' },
  { id: 4, label: 'Executing Two-Pass Requirement Coverage Check' },
  { id: 5, label: 'Allocating Deterministic Arithmetic Schedule' },
];

export default function NewKitPage() {
  const router = useRouter();

  const [tab, setTab] = useState<'single' | 'batch'>('single');
  const [jd, setJd] = useState('');
  const [companyUrl, setCompanyUrl] = useState('https://apex.io');
  const [days, setDays] = useState(5);

  const [batchJson, setBatchJson] = useState(`[
  {
    "jd": "Senior Full-Stack Engineer at Apex. Required: Node.js, Express, TypeScript, Next.js 14, System Design.",
    "company_url": "https://apex.io",
    "days": 5
  },
  {
    "jd": "React Frontend Developer stub JD.",
    "company_url": "https://example.org",
    "days": 3
  }
]`);

  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const isStubJd = jd.trim().length > 0 && jd.trim().length < 120;

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setCurrentStep(1);

    // Animate progress steps for smooth UX
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev < 5 ? prev + 1 : prev));
    }, 900);

    try {
      const res = await apiFetch('/api/kits', {
        method: 'POST',
        body: JSON.stringify({
          jd,
          company_url: companyUrl,
          days,
        }),
      });

      clearInterval(interval);
      router.push(`/kits/${res.kit.id}`);
    } catch (err: any) {
      clearInterval(interval);
      setLoading(false);
      setError(err.message || 'Failed to generate kit. Please check inputs and retry.');
    }
  };

  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setCurrentStep(1);

    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev < 5 ? prev + 1 : prev));
    }, 1200);

    try {
      let parsedCases;
      try {
        parsedCases = JSON.parse(batchJson);
      } catch (_e) {
        throw new Error('Invalid JSON format in batch input.');
      }

      const res = await apiFetch('/api/kits/batch', {
        method: 'POST',
        body: JSON.stringify({ cases: parsedCases }),
      });

      clearInterval(interval);
      if (res.kits && res.kits.length > 0) {
        router.push(`/kits/${res.kits[0].id}`);
      } else {
        router.push('/kits');
      }
    } catch (err: any) {
      clearInterval(interval);
      setLoading(false);
      setError(err.message || 'Failed to process batch kits.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-white">Create Interview Prep Kit</h1>
        <p className="text-slate-400 text-sm mt-1">
          Provide a Job Description and company website to research background context, extract requirements, and build a personalized schedule.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setTab('single')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
            tab === 'single'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Single Role Generation</span>
        </button>

        <button
          type="button"
          onClick={() => setTab('batch')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
            tab === 'batch'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Batch Multi-Role Import</span>
        </button>
      </div>

      {/* Multi-Step Animated Progress Overlay */}
      {loading && (
        <div className="p-8 rounded-2xl bg-slate-900/90 border border-blue-500/30 shadow-2xl space-y-6">
          <div className="flex items-center space-x-3 text-blue-400 font-semibold">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-lg">AI Pipeline Active...</span>
          </div>

          <div className="space-y-3">
            {PROGRESS_STEPS.map((step) => {
              const isDone = currentStep > step.id;
              const isCurrent = currentStep === step.id;

              return (
                <div
                  key={step.id}
                  className={`flex items-center space-x-3 p-3.5 rounded-xl border transition-all ${
                    isDone
                      ? 'bg-blue-950/40 border-blue-500/40 text-blue-300'
                      : isCurrent
                      ? 'bg-slate-800 border-blue-500 text-white shadow-md'
                      : 'bg-slate-950/40 border-slate-800/80 text-slate-500'
                  }`}
                >
                  {isDone ? (
                    <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0" />
                  ) : isCurrent ? (
                    <Loader2 className="w-5 h-5 text-blue-400 animate-spin shrink-0" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border border-slate-700 shrink-0 flex items-center justify-center text-xs">
                      {step.id}
                    </div>
                  )}
                  <span className="text-sm font-medium">{step.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Single Kit Form */}
      {!loading && tab === 'single' && (
        <form onSubmit={handleSingleSubmit} className="space-y-6 bg-slate-900/60 p-6 sm:p-8 rounded-2xl border border-slate-800">
          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 shrink-0 text-red-400" />
              <div>
                <p className="font-semibold">Generation Error</p>
                <p>{error}</p>
              </div>
            </div>
          )}

          {/* Job Description */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
                <FileText className="w-4 h-4 text-blue-400" />
                <span>Job Description (JD)</span>
              </label>
              <div className="flex items-center space-x-2 text-xs">
                {isStubJd && (
                  <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                    Minimal JD Stub Detected
                  </span>
                )}
                <span className="text-slate-400">{jd.length} chars</span>
              </div>
            </div>

            <textarea
              rows={8}
              required
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              placeholder="Paste the full job description here (responsibilities, required technical skills, qualifications)..."
              className="w-full rounded-xl bg-slate-950 border border-slate-800 p-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono"
            />
          </div>

          {/* Company Website URL & Days */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
                <Globe className="w-4 h-4 text-blue-400" />
                <span>Company Website URL</span>
              </label>
              <input
                type="url"
                required
                value={companyUrl}
                onChange={(e) => setCompanyUrl(e.target.value)}
                placeholder="https://company.com"
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-200 flex items-center justify-between">
                <span className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-blue-400" />
                  <span>Preparation Days Available</span>
                </span>
                <span className="text-blue-400 font-bold">{days} Days</span>
              </label>
              <div className="flex items-center space-x-4">
                <input
                  type="range"
                  min={1}
                  max={60}
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                  className="w-full accent-blue-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
                />
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={days}
                  onChange={(e) => setDays(Math.max(1, Math.min(60, Number(e.target.value))))}
                  className="w-20 rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-center text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-base transition-all shadow-lg shadow-blue-600/25 flex items-center justify-center space-x-2"
          >
            <Sparkles className="w-5 h-5" />
            <span>Generate Prep Kit</span>
          </button>
        </form>
      )}

      {/* Batch Import Form */}
      {!loading && tab === 'batch' && (
        <form onSubmit={handleBatchSubmit} className="space-y-6 bg-slate-900/60 p-6 sm:p-8 rounded-2xl border border-slate-800">
          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 shrink-0 text-red-400" />
              <div>
                <p className="font-semibold">Batch Import Error</p>
                <p>{error}</p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
              <Upload className="w-4 h-4 text-blue-400" />
              <span>Batch Cases JSON Array</span>
            </label>
            <textarea
              rows={12}
              required
              value={batchJson}
              onChange={(e) => setBatchJson(e.target.value)}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 p-4 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <button
            type="submit"
            className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-base transition-all shadow-lg shadow-blue-600/25 flex items-center justify-center space-x-2"
          >
            <Upload className="w-5 h-5" />
            <span>Run Batch Generation</span>
          </button>
        </form>
      )}
    </div>
  );
}
