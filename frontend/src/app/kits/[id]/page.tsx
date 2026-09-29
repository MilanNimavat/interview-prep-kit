'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch } from '../../../lib/api';
import {
  Sparkles,
  Pin,
  RefreshCw,
  Edit3,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Calendar,
  CheckCircle2,
  AlertCircle,
  PlayCircle,
  ExternalLink,
  BookOpen,
  Loader2,
  X,
  Send,
  Award,
} from 'lucide-react';

export default function KitDetailPage() {
  const params = useParams();
  const kitId = params.id as string;
  const router = useRouter();

  const [kitRecord, setKitRecord] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Category filter tab
  const [activeCategory, setActiveCategory] = useState<string>('all');

  // Regeneration modal state
  const [regenModalCategory, setRegenModalCategory] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);

  // Practice Simulator Modal state
  const [practiceQuestion, setPracticeQuestion] = useState<any | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [evaluating, setEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<any | null>(null);

  const fetchKit = async () => {
    try {
      setLoading(true);
      const res = await apiFetch(`/api/kits/${kitId}`);
      setKitRecord(res.kit);
    } catch (err: any) {
      setError(err.message || 'Failed to load kit details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (kitId) fetchKit();
  }, [kitId]);

  const saveKitChanges = async (updatedKitData: any) => {
    try {
      setSaving(true);
      const res = await apiFetch(`/api/kits/${kitId}`, {
        method: 'PUT',
        body: JSON.stringify({ kitData: updatedKitData }),
      });
      setKitRecord(res.kit);
    } catch (err: any) {
      alert(err.message || 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  // Inline edit handler for company brief
  const handleBriefEdit = (field: 'summary' | 'what_they_do', val: string) => {
    const updated = { ...kitRecord.kitData };
    updated.company_brief[field] = val;
    setKitRecord({ ...kitRecord, kitData: updated });
  };

  // Toggle question pin state
  const togglePinQuestion = (qId: string) => {
    const updated = { ...kitRecord.kitData };
    updated.questions = updated.questions.map((q: any) => {
      if (q.id === qId) {
        const nextState = q.user_state === 'pinned' ? 'generated' : 'pinned';
        return { ...q, user_state: nextState };
      }
      return q;
    });
    saveKitChanges(updated);
  };

  // Edit question field
  const handleQuestionEdit = (qId: string, field: string, val: any) => {
    const updated = { ...kitRecord.kitData };
    updated.questions = updated.questions.map((q: any) => {
      if (q.id === qId) {
        return {
          ...q,
          [field]: val,
          user_state: q.user_state === 'pinned' ? 'pinned' : 'edited',
        };
      }
      return q;
    });
    setKitRecord({ ...kitRecord, kitData: updated });
  };

  const handleBlurSave = () => {
    saveKitChanges(kitRecord.kitData);
  };

  // Move question position
  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    const questions = [...kitRecord.kitData.questions];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= questions.length) return;

    const temp = questions[index];
    questions[index] = questions[targetIdx];
    questions[targetIdx] = temp;

    const updated = { ...kitRecord.kitData, questions };
    saveKitChanges(updated);
  };

  // Delete question
  const deleteQuestion = (qId: string) => {
    if (!confirm('Delete this question?')) return;
    const updated = { ...kitRecord.kitData };
    updated.questions = updated.questions.filter((q: any) => q.id !== qId);
    saveKitChanges(updated);
  };

  // Add new question
  const addQuestion = () => {
    const updated = { ...kitRecord.kitData };
    const newId = `q_custom_${Date.now()}`;
    const newQ = {
      id: newId,
      requirement_ids: updated.role.requirements.slice(0, 1).map((r: any) => r.id),
      category: activeCategory === 'all' ? 'technical' : activeCategory,
      prompt: 'New custom interview question prompt...',
      answer_outline: 'Key points for answer outline...',
      difficulty: 2,
      user_state: 'edited',
    };
    updated.questions.push(newQ);
    saveKitChanges(updated);
  };

  // Regenerate section handler
  const handleRegenerateSection = async (section: string, categoryName?: string) => {
    try {
      setRegenerating(true);
      const res = await apiFetch(`/api/kits/${kitId}/regenerate-section`, {
        method: 'POST',
        body: JSON.stringify({ section, categoryName }),
      });
      setKitRecord(res.kit);
      setRegenModalCategory(null);
    } catch (err: any) {
      alert(err.message || 'Failed to regenerate section.');
    } finally {
      setRegenerating(false);
    }
  };

  // Handle Mock Evaluator Submission
  const handleEvaluateAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userAnswer.trim()) return;

    try {
      setEvaluating(true);
      const res = await apiFetch(`/api/kits/${kitId}/evaluate-answer`, {
        method: 'POST',
        body: JSON.stringify({
          questionId: practiceQuestion.id,
          userAnswer,
        }),
      });
      setEvaluationResult(res.evaluation);
    } catch (err: any) {
      alert(err.message || 'Evaluation failed.');
    } finally {
      setEvaluating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <p className="text-slate-400 text-sm font-medium">Loading kit details & workspace...</p>
      </div>
    );
  }

  if (error || !kitRecord) {
    return (
      <div className="p-8 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 space-y-4">
        <h2 className="text-xl font-bold">Error Loading Kit</h2>
        <p>{error || 'Kit not found'}</p>
        <Link href="/kits" className="inline-block px-4 py-2 rounded-lg bg-slate-800 text-white font-medium text-sm">
          Return to Kits List
        </Link>
      </div>
    );
  }

  const kit = kitRecord.kitData;
  const filteredQuestions = kit.questions.filter((q: any) =>
    activeCategory === 'all' ? true : q.category === activeCategory
  );

  return (
    <div className="space-y-10">
      {/* Top Header Card */}
      <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-6 sm:p-8 space-y-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3">
              <span className="px-3 py-1 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-semibold">
                {kit.source.company}
              </span>
              <a
                href={kit.source.company_url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-slate-400 hover:text-blue-400 flex items-center space-x-1"
              >
                <span>{kit.source.company_url}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <h1 className="text-3xl font-extrabold text-white mt-2">{kit.role.title}</h1>
            <p className="text-slate-400 text-sm mt-1">{kit.role.seniority} Seniority</p>
          </div>

          <div className="flex items-center space-x-4">
            <Link
              href={`/kits/${kitId}/practice`}
              className="flex items-center space-x-2 px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-blue-500/20 transition-all hover:scale-105"
            >
              <PlayCircle className="w-5 h-5" />
              <span>Practice Flashcards</span>
            </Link>
          </div>
        </div>

        {/* Coverage & Days Badges */}
        <div className="flex flex-wrap gap-4 pt-4 border-t border-slate-800/80 text-xs font-medium">
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-800/60 text-slate-300">
            <Calendar className="w-4 h-4 text-blue-400" />
            <span>{kit.schedule.days_available} Days Prep Schedule</span>
          </div>

          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-800/60 text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Coverage Passes: {kit.coverage.passes}</span>
          </div>

          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-800/60 text-slate-300">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            <span>
              Uncovered Must-Haves: {kit.coverage.uncovered_requirement_ids.length}
            </span>
          </div>
        </div>
      </div>

      {/* Section 1: Company Brief */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <BookOpen className="w-5 h-5 text-blue-400" />
            <span>Company Background Brief</span>
          </h2>

          <button
            onClick={() => handleRegenerateSection('company_brief')}
            disabled={regenerating}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin' : ''}`} />
            <span>Regenerate Brief</span>
          </button>
        </div>

        <div className="space-y-4 text-sm">
          <div>
            <label className="text-xs text-slate-500 font-semibold uppercase block mb-1">Summary Overview</label>
            <textarea
              rows={2}
              value={kit.company_brief.summary}
              onChange={(e) => handleBriefEdit('summary', e.target.value)}
              onBlur={handleBlurSave}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-blue-500 font-sans"
            />
          </div>

          <div>
            <label className="text-xs text-slate-500 font-semibold uppercase block mb-1">What They Do</label>
            <textarea
              rows={3}
              value={kit.company_brief.what_they_do}
              onChange={(e) => handleBriefEdit('what_they_do', e.target.value)}
              onBlur={handleBlurSave}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-blue-500 font-sans"
            />
          </div>
        </div>
      </div>

      {/* Section 2: Reshapeable Question Bank */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-white flex items-center space-x-2">
              <Sparkles className="w-6 h-6 text-blue-400" />
              <span>Reshapeable Question Bank</span>
            </h2>
            <p className="text-slate-400 text-xs mt-1">
              Inline edit, reorder, or pin questions. Regenerate categories without losing your edits.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={addQuestion}
              className="flex items-center space-x-1 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
            >
              <Plus className="w-4 h-4 text-blue-400" />
              <span>Add Question</span>
            </button>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-3">
          <div className="flex space-x-2">
            {['all', 'technical', 'system-design', 'behavioural', 'company-fit'].map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                  activeCategory === cat
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {cat.replace('-', ' ')}
              </button>
            ))}
          </div>

          {activeCategory !== 'all' && (
            <button
              onClick={() => setRegenModalCategory(activeCategory)}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-semibold transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Regenerate Category ({activeCategory})</span>
            </button>
          )}
        </div>

        {/* Questions Cards List */}
        <div className="space-y-4">
          {filteredQuestions.map((q: any, idx: number) => {
            const isPinned = q.user_state === 'pinned';
            const isEdited = q.user_state === 'edited';

            return (
              <div
                key={q.id}
                className={`rounded-2xl bg-slate-900/70 border p-6 space-y-4 transition-all ${
                  isPinned
                    ? 'border-blue-500/50 bg-blue-950/10 shadow-lg shadow-blue-500/5'
                    : isEdited
                    ? 'border-amber-500/40 bg-amber-950/5'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center space-x-3 flex-wrap gap-y-2">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 uppercase">
                      {q.category}
                    </span>

                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                      Difficulty {q.difficulty}
                    </span>

                    {/* State machine badge */}
                    {isPinned && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/40 flex items-center space-x-1">
                        <Pin className="w-3 h-3" />
                        <span>Pinned</span>
                      </span>
                    )}

                    {isEdited && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center space-x-1">
                        <Edit3 className="w-3 h-3" />
                        <span>User Edited</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    {/* Pin button */}
                    <button
                      onClick={() => togglePinQuestion(q.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        isPinned
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                      }`}
                      title={isPinned ? 'Unpin question' : 'Pin question (preserve during category regeneration)'}
                    >
                      <Pin className="w-4 h-4" />
                    </button>

                    {/* Move Up / Down */}
                    <button
                      onClick={() => moveQuestion(idx, 'up')}
                      disabled={idx === 0}
                      className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => moveQuestion(idx, 'down')}
                      disabled={idx === filteredQuestions.length - 1}
                      className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => deleteQuestion(q.id)}
                      className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Prompt */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">
                    Question Prompt
                  </label>
                  <textarea
                    rows={2}
                    value={q.prompt}
                    onChange={(e) => handleQuestionEdit(q.id, 'prompt', e.target.value)}
                    onBlur={handleBlurSave}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-100 font-medium text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Answer Outline */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">
                    Expected Answer Outline
                  </label>
                  <textarea
                    rows={2}
                    value={q.answer_outline}
                    onChange={(e) => handleQuestionEdit(q.id, 'answer_outline', e.target.value)}
                    onBlur={handleBlurSave}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-300 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Creative Feature B: AI Mock Interview Answer Evaluator button */}
                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => {
                      setPracticeQuestion(q);
                      setUserAnswer('');
                      setEvaluationResult(null);
                    }}
                    className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-bold transition-all hover:scale-105"
                  >
                    <Award className="w-4 h-4 text-blue-400" />
                    <span>Open Practice Simulator (AI Evaluation)</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 3: Arithmetic Schedule View */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-blue-400" />
              <span>Deterministic Arithmetic Study Schedule</span>
            </h2>
            <p className="text-slate-400 text-xs mt-1">
              Calculated dynamically with difficulty-weighted integer minute allocations.
            </p>
          </div>

          <button
            onClick={() => handleRegenerateSection('schedule')}
            disabled={regenerating}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin' : ''}`} />
            <span>Recalculate Schedule</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {kit.schedule.days.map((dayItem: any) => (
            <div
              key={dayItem.day}
              className="rounded-xl bg-slate-950 border border-slate-800/90 p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold px-2.5 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  Day {dayItem.day}
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  {dayItem.minutes} Minutes
                </span>
              </div>

              <p className="text-xs font-semibold text-white">{dayItem.focus}</p>

              <div className="space-y-1 pt-2 border-t border-slate-900 text-xs text-slate-400">
                {dayItem.question_ids.length > 0 ? (
                  dayItem.question_ids.map((qId: string) => {
                    const qObj = kit.questions.find((q: any) => q.id === qId);
                    return (
                      <div key={qId} className="truncate">
                        • {qObj ? qObj.prompt : qId}
                      </div>
                    );
                  })
                ) : (
                  <span className="text-slate-600 italic">Comprehensive Review & Mock Practice</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Regeneration Modal */}
      {regenModalCategory && (
        <div 
          className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-20 pb-20 bg-slate-950/80 backdrop-blur-sm overflow-y-auto"
          onClick={() => setRegenModalCategory(null)}
        >
          <div 
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl relative my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <RefreshCw className="w-5 h-5 text-blue-400" />
                <span className="capitalize">Regenerate {regenModalCategory}</span>
              </h3>
              <button
                onClick={() => setRegenModalCategory(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 space-y-2">
              <p className="font-semibold flex items-center space-x-1">
                <Pin className="w-4 h-4 text-blue-400" />
                <span>State Machine Preservation Active</span>
              </p>
              <p>
                All questions in this category marked <span className="text-white font-bold">Pinned</span> or{' '}
                <span className="text-white font-bold">User Edited</span> will be strictly preserved. Only items with{' '}
                <span className="text-slate-400 font-bold">Generated</span> state will be replaced.
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setRegenModalCategory(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-sm font-semibold hover:bg-slate-700"
              >
                Cancel
              </button>

              <button
                onClick={() => handleRegenerateSection('category', regenModalCategory)}
                disabled={regenerating}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold flex items-center space-x-2"
              >
                {regenerating && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Confirm Regeneration</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Practice Simulator (AI Answer Evaluator) Modal */}
      {practiceQuestion && (
        <div 
          className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-20 pb-20 bg-slate-950/80 backdrop-blur-sm overflow-y-auto"
          onClick={() => {
            setPracticeQuestion(null);
            setEvaluationResult(null);
          }}
        >
          <div 
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-6 shadow-2xl relative my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-2">
                <Award className="w-6 h-6 text-blue-400" />
                <h3 className="text-lg font-bold text-white">AI Mock Interview Simulator</h3>
              </div>
              <button
                onClick={() => {
                  setPracticeQuestion(null);
                  setEvaluationResult(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Question Details */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center space-x-2 text-xs text-blue-400 font-semibold uppercase">
                <span>{practiceQuestion.category}</span>
                <span>•</span>
                <span>Difficulty {practiceQuestion.difficulty}</span>
              </div>
              <p className="text-sm font-bold text-white">{practiceQuestion.prompt}</p>
            </div>

            {/* Form */}
            <form onSubmit={handleEvaluateAnswer} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase block mb-1">
                  Type / Paste Your Spoken Answer
                </label>
                <textarea
                  rows={5}
                  required
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  placeholder="Explain your approach, design principles, algorithm, or STAR method answer..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={evaluating}
                className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all shadow-lg shadow-blue-600/25 flex items-center justify-center space-x-2"
              >
                {evaluating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Evaluating Response with Groq AI...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Evaluate My Answer with AI</span>
                  </>
                )}
              </button>
            </form>

            {/* Evaluation Results */}
            {evaluationResult && (
              <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-6 pt-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-extrabold ${
                        evaluationResult.score >= 7
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : evaluationResult.score >= 5
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                          : 'bg-red-500/20 text-red-400 border border-red-500/40'
                      }`}
                    >
                      {evaluationResult.score}/10
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-white">Answer Score</h4>
                      <p className="text-xs text-slate-400">Evaluated against senior expectations</p>
                    </div>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      evaluationResult.ready_for_interview
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {evaluationResult.ready_for_interview ? 'READY FOR INTERVIEW' : 'NEEDS PRACTICE'}
                  </span>
                </div>

                {/* Strengths */}
                <div className="space-y-2">
                  <h5 className="text-xs font-bold uppercase text-emerald-400 flex items-center space-x-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Key Strengths</span>
                  </h5>
                  <ul className="space-y-1 text-xs text-slate-300">
                    {evaluationResult.strengths.map((st: string, idx: number) => (
                      <li key={idx} className="flex items-start space-x-2">
                        <span>•</span>
                        <span>{st}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Missing Points */}
                {evaluationResult.missing_key_points.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-xs font-bold uppercase text-amber-400 flex items-center space-x-1">
                      <AlertCircle className="w-4 h-4" />
                      <span>Missing Key Concepts</span>
                    </h5>
                    <ul className="space-y-1 text-xs text-slate-300">
                      {evaluationResult.missing_key_points.map((mp: string, idx: number) => (
                        <li key={idx} className="flex items-start space-x-2">
                          <span>•</span>
                          <span>{mp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Suggested Refinement */}
                <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 space-y-1">
                  <span className="font-bold block text-blue-400">Suggested Answer Refinement:</span>
                  <p className="leading-relaxed">{evaluationResult.suggested_refinement}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
