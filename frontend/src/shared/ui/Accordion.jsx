import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export function AccordionItem({ title, children, isOpen, onToggle, id }) {
  return (
    <div className="border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900/60 overflow-hidden transition-all shadow-sm">
      <button
        id={id}
        onClick={onToggle}
        className="w-full flex items-center justify-between p-5 text-left font-semibold text-slate-900 dark:text-white hover:text-teal-700 dark:hover:text-yellow-signal transition"
      >
        <span className="text-base md:text-lg pr-4">{title}</span>
        <ChevronDown
          className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-yellow-signal' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="px-5 pb-5 pt-1 text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800/80">
          {children}
        </div>
      )}
    </div>
  );
}

export function Accordion({ items = [], allowMultiple = false, className = '' }) {
  const [openIndices, setOpenIndices] = useState([0]);

  const handleToggle = (index) => {
    if (allowMultiple) {
      setOpenIndices(prev =>
        prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
      );
    } else {
      setOpenIndices(prev => (prev.includes(index) ? [] : [index]));
    }
  };

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {items.map((item, idx) => (
        <AccordionItem
          key={item.id || idx}
          id={`accordion-item-${item.id || idx}`}
          title={item.title || item.question}
          isOpen={openIndices.includes(idx)}
          onToggle={() => handleToggle(idx)}
        >
          {item.content || item.answer}
        </AccordionItem>
      ))}
    </div>
  );
}
