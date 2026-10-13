import React from 'react';
import { Check } from 'lucide-react';

export function Stepper({ steps = [], currentStep = 1, onStepClick }) {
  return (
    <div className="w-full py-4">
      <div className="flex items-center justify-between relative">
        {/* Connector line behind steps */}
        <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-0.5 bg-slate-200 dark:bg-slate-800 z-0" />
        <div
          className="absolute top-1/2 left-0 -translate-y-1/2 h-0.5 bg-teal-600 transition-all duration-300 z-0"
          style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
        />

        {steps.map((step, idx) => {
          const stepNumber = idx + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;

          return (
            <div
              key={step.id || idx}
              onClick={() => onStepClick && isCompleted && onStepClick(stepNumber)}
              className={`relative z-10 flex flex-col items-center group ${
                isCompleted ? 'cursor-pointer' : ''
              }`}
            >
              <div
                className={`w-9 h-9 md:w-11 md:h-11 rounded-full flex items-center justify-center font-bold text-xs md:text-sm transition-all duration-200 border-2 ${
                  isCompleted
                    ? 'bg-teal-900 border-teal-900 text-white shadow-sm'
                    : isCurrent
                    ? 'bg-yellow-signal border-yellow-signal text-ink shadow-yellow-glow scale-110'
                    : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-400'
                }`}
              >
                {isCompleted ? <Check className="w-5 h-5" /> : stepNumber}
              </div>

              <span
                className={`mt-2 text-[11px] md:text-xs font-semibold whitespace-nowrap hidden sm:block ${
                  isCurrent
                    ? 'text-teal-900 dark:text-yellow-signal font-bold'
                    : isCompleted
                    ? 'text-slate-700 dark:text-slate-300'
                    : 'text-slate-400'
                }`}
              >
                {step.title || step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
