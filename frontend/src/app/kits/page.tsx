'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiFetch } from '../../lib/api';
import { Sparkles, Calendar, Trash2, ArrowRight, BookOpen, Clock, Loader2 } from 'lucide-react';

export default function KitsListPage() {
  const [kits, setKits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchKits = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/api/kits');
      setKits(res.kits || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load kits');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKits();
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this kit?')) return;

    try {
      await apiFetch(`/api/kits/${id}`, { method: 'DELETE' });
      setKits(kits.filter((k) => k.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete kit');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <p className="text-slate-400 text-sm font-medium">Loading your interview prep kits...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white">My Interview Prep Kits</h1>
          <p className="text-slate-400 text-sm mt-1">
            Access, study, edit, and practice mock interviews with your personalized kits.
          </p>
        </div>

        <Link
          href="/kits/new"
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all shadow-md shadow-blue-600/20"
        >
          <Sparkles className="w-4 h-4" />
          <span>New Kit</span>
        </Link>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
          {error}
        </div>
      )}

      {kits.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-slate-800 space-y-4">
          <BookOpen className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-lg font-bold text-white">No Prep Kits Generated Yet</h3>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            Create your first custom interview prep kit by providing a Job Description and company website.
          </p>
          <Link
            href="/kits/new"
            className="inline-flex items-center space-x-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span>Generate First Kit</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {kits.map((item) => {
            const kit = item.kitData;
            return (
              <Link
                key={item.id}
                href={`/kits/${item.id}`}
                className="group relative rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-blue-500/50 p-6 flex flex-col justify-between transition-all hover:shadow-xl hover:shadow-blue-500/5"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {kit.source.company}
                      </span>
                      <h3 className="text-lg font-bold text-white mt-2 group-hover:text-blue-400 transition-colors">
                        {kit.role.title}
                      </h3>
                    </div>

                    <button
                      onClick={(e) => handleDelete(item.id, e)}
                      className="text-slate-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                      title="Delete Kit"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-slate-400 text-xs line-clamp-2 leading-relaxed">
                    {kit.company_brief.summary}
                  </p>

                  <div className="flex items-center space-x-4 text-xs text-slate-400">
                    <span className="flex items-center space-x-1">
                      <Calendar className="w-3.5 h-3.5 text-blue-400" />
                      <span>{kit.schedule.days_available} Days</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{kit.questions.length} Questions</span>
                    </span>
                  </div>
                </div>

                <div className="pt-6 mt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-blue-400 group-hover:translate-x-1 transition-transform">
                  <span>Open Prep Kit</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
