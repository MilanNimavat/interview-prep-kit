'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiFetch } from '../../../../lib/api';
import {
  Sparkles,
  RotateCw,
  ArrowLeft,
  CheckCircle2,
  ThumbsDown,
  Minus,
  ThumbsUp,
  Loader2,
  BookOpen,
} from 'lucide-react';

export default function PracticeFlashcardsPage() {
  const params = useParams();
  const kitId = params.id as string;

  const [flashcards, setFlashcards] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  // Confidence ratings per flashcard ID: Map card ID -> confidence number (1: Low, 2: Med, 3: High)
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchKit() {
      try {
        setLoading(true);
        const res = await apiFetch(`/api/kits/${kitId}`);
        const cards = res.kit?.kitData?.flashcards || [];
        setFlashcards(cards);
      } catch (_err) {
        // Handle error
      } finally {
        setLoading(false);
      }
    }

    if (kitId) fetchKit();
  }, [kitId]);

  const handleRate = (confidence: number) => {
    if (flashcards.length === 0) return;

    const currentCard = flashcards[currentIndex];
    const newRatings = { ...ratings, [currentCard.id]: confidence };
    setRatings(newRatings);

    setFlipped(false);

    // Confidence-weighted sorting: sort unstudied or lowest confidence first
    const updatedSorted = [...flashcards].sort((a, b) => {
      const scoreA = newRatings[a.id] ?? 0;
      const scoreB = newRatings[b.id] ?? 0;
      return scoreA - scoreB;
    });

    setFlashcards(updatedSorted);
    setCurrentIndex((prev) => (prev + 1) % updatedSorted.length);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <p className="text-slate-400 text-sm font-medium">Loading Flashcard Studio...</p>
      </div>
    );
  }

  if (flashcards.length === 0) {
    return (
      <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-slate-800 space-y-4">
        <BookOpen className="w-12 h-12 text-slate-600 mx-auto" />
        <h3 className="text-lg font-bold text-white">No Flashcards Available</h3>
        <p className="text-slate-400 text-sm">Return to kit detail page to generate revision flashcards.</p>
        <Link href={`/kits/${kitId}`} className="inline-block px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold">
          Back to Kit
        </Link>
      </div>
    );
  }

  const currentCard = flashcards[currentIndex];
  const studiedCount = Object.keys(ratings).length;
  const progressPercent = Math.round((studiedCount / flashcards.length) * 100);

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href={`/kits/${kitId}`}
          className="flex items-center space-x-2 text-slate-400 hover:text-white text-sm font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Prep Kit</span>
        </Link>

        <div className="flex items-center space-x-2 text-xs font-semibold text-blue-400">
          <Sparkles className="w-4 h-4" />
          <span>Flashcard Revision Studio</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs font-semibold text-slate-400">
          <span>Studied {studiedCount} of {flashcards.length} Cards</span>
          <span>{progressPercent}% Complete</span>
        </div>
        <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
          <div
            className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Interactive Card */}
      <div
        onClick={() => setFlipped(!flipped)}
        className="cursor-pointer min-h-[300px] rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 hover:border-blue-500/50 p-8 flex flex-col justify-between items-center text-center shadow-2xl transition-all hover:scale-[1.01] relative overflow-hidden"
      >
        <div className="flex items-center justify-between w-full text-xs font-semibold text-slate-500">
          <span>Card {currentIndex + 1} of {flashcards.length}</span>
          <span className="flex items-center space-x-1 text-blue-400">
            <RotateCw className="w-3.5 h-3.5" />
            <span>Click card to flip</span>
          </span>
        </div>

        <div className="my-auto space-y-4 max-w-lg">
          {!flipped ? (
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-400 block mb-2">
                Prompt / Front
              </span>
              <h2 className="text-2xl font-extrabold text-white leading-snug">
                {currentCard.front}
              </h2>
            </div>
          ) : (
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 block mb-2">
                Answer Key / Back
              </span>
              <p className="text-lg font-medium text-slate-200 leading-relaxed">
                {currentCard.back}
              </p>
            </div>
          )}
        </div>

        <div className="text-xs text-slate-500 font-medium">
          {ratings[currentCard.id]
            ? `Rated: ${ratings[currentCard.id] === 3 ? 'High' : ratings[currentCard.id] === 2 ? 'Medium' : 'Low'} Confidence`
            : 'Unrated'}
        </div>
      </div>

      {/* Confidence Rating Buttons */}
      <div className="space-y-3">
        <label className="text-xs font-semibold text-slate-400 uppercase text-center block">
          Rate Your Confidence (Triggers Spaced Repetition Re-sorting)
        </label>

        <div className="grid grid-cols-3 gap-4">
          <button
            onClick={() => handleRate(1)}
            className="flex items-center justify-center space-x-2 py-3.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold transition-all"
          >
            <ThumbsDown className="w-4 h-4" />
            <span>Low (1)</span>
          </button>

          <button
            onClick={() => handleRate(2)}
            className="flex items-center justify-center space-x-2 py-3.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold transition-all"
          >
            <Minus className="w-4 h-4" />
            <span>Medium (2)</span>
          </button>

          <button
            onClick={() => handleRate(3)}
            className="flex items-center justify-center space-x-2 py-3.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all"
          >
            <ThumbsUp className="w-4 h-4" />
            <span>High (3)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
