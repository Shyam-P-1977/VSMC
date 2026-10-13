import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';

export function Carousel({ items = [], autoPlayInterval = 5000, className = '' }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (items.length <= 1 || isPaused) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, autoPlayInterval);
    return () => clearInterval(interval);
  }, [items.length, autoPlayInterval, isPaused]);

  if (!items || items.length === 0) return null;

  const current = items[currentIndex];

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % items.length);
  };

  return (
    <div
      className={`relative w-full overflow-hidden ${className}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-10 border border-slate-200/80 dark:border-slate-800 shadow-soft-lg flex flex-col justify-between min-h-[260px]">
        {/* Stars */}
        <div className="flex items-center gap-1 mb-4 text-yellow-signal">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className="w-5 h-5 fill-current" />
          ))}
        </div>

        {/* Quote */}
        <p className="text-base md:text-xl font-medium text-slate-800 dark:text-slate-100 italic leading-relaxed mb-6">
          "{current.quote || current.content}"
        </p>

        {/* Author Info */}
        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200 font-bold flex items-center justify-center text-sm">
              {current.author ? current.author.charAt(0) : 'C'}
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                {current.author || current.name}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {current.vehicle || current.role || 'Verified Customer'}
              </p>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              className="p-2 rounded-full border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
              aria-label="Previous testimonial"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNext}
              className="p-2 rounded-full border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
              aria-label="Next testimonial"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Pagination Dots */}
      <div className="flex items-center justify-center gap-2 mt-4">
        {items.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`h-2 rounded-full transition-all duration-200 ${
              idx === currentIndex
                ? 'w-6 bg-yellow-signal'
                : 'w-2 bg-slate-300 dark:bg-slate-700'
            }`}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
