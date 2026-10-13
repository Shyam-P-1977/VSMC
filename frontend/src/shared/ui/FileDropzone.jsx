import React, { useRef, useState } from 'react';
import { UploadCloud, X, Image as ImageIcon } from 'lucide-react';

export function FileDropzone({
  files = [],
  onChange,
  maxFiles = 3,
  maxSizeMB = 5,
  label = "Upload Problem Photos",
  helperText = "Add up to 3 clear photos of the issue (JPG, PNG, WEBP - max 5MB each)"
}) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const validateAndAdd = (newFilesList) => {
    setErrorMsg('');
    const valid = [];
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];

    if (files.length + newFilesList.length > maxFiles) {
      setErrorMsg(`Maximum ${maxFiles} photos allowed in total.`);
      return;
    }

    for (let f of newFilesList) {
      if (!allowed.includes(f.type)) {
        setErrorMsg(`"${f.name}" has invalid format. Only JPG, PNG, and WEBP supported.`);
        return;
      }
      if (f.size > maxSizeMB * 1024 * 1024) {
        setErrorMsg(`"${f.name}" exceeds ${maxSizeMB}MB file limit.`);
        return;
      }
      valid.push(f);
    }

    if (valid.length > 0) {
      onChange([...files, ...valid]);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) {
      validateAndAdd(Array.from(e.dataTransfer.files));
    }
  };

  const handleRemove = (index) => {
    const updated = files.filter((_, i) => i !== index);
    onChange(updated);
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      {label && (
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          {label}
        </label>
      )}

      {/* Drop Target */}
      {files.length < maxFiles && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
            dragOver
              ? 'border-yellow-signal bg-yellow-tint/30 dark:bg-yellow-signal/10'
              : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 hover:bg-slate-100/60 dark:hover:bg-slate-800/40'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/png, image/jpeg, image/webp"
            className="hidden"
            onChange={(e) => {
              if (e.target.files) {
                validateAndAdd(Array.from(e.target.files));
              }
            }}
          />
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200 flex items-center justify-center">
              <UploadCloud className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              Drag & drop photos here or <span className="text-teal-600 dark:text-yellow-signal underline">browse</span>
            </p>
            <p className="text-[11px] text-slate-400">{helperText}</p>
          </div>
        </div>
      )}

      {errorMsg && (
        <p className="text-xs text-rose-600 font-medium">{errorMsg}</p>
      )}

      {/* Previews */}
      {files.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mt-2">
          {files.map((file, idx) => {
            const previewUrl = URL.createObjectURL(file);
            return (
              <div
                key={idx}
                className="relative rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-900 group aspect-video"
              >
                <img
                  src={previewUrl}
                  alt={file.name}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => handleRemove(idx)}
                  className="absolute top-1.5 right-1.5 p-1 rounded-full bg-ink/70 text-white hover:bg-rose-600 transition"
                  title="Remove image"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <div className="absolute bottom-0 inset-x-0 bg-ink/80 text-white text-[10px] truncate px-2 py-0.5">
                  {file.name}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
