import React, { useRef, useState, useMemo, useEffect } from 'react';
import { UploadCloud, X, Image as ImageIcon, AlertCircle } from 'lucide-react';

export function FileDropzone({
  files = [],
  onChange,
  onFilesChange,
  maxFiles = 3,
  maxSizeMB = 5,
  label = "Upload Problem Photos",
  helperText = "Add up to 3 clear photos of the issue (JPG, PNG, WEBP - max 5MB each)"
}) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const emitChange = (updatedFiles) => {
    if (typeof onChange === 'function') onChange(updatedFiles);
    if (typeof onFilesChange === 'function') onFilesChange(updatedFiles);
  };

  const isAllowedImage = (file) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/pjpeg'];
    if (file.type && allowedMimes.includes(file.type.toLowerCase())) return true;
    const ext = file.name ? file.name.split('.').pop()?.toLowerCase() : '';
    return ['jpg', 'jpeg', 'png', 'webp'].includes(ext);
  };

  const validateAndAdd = (newFilesList) => {
    setErrorMsg('');
    const valid = [];

    if (files.length + newFilesList.length > maxFiles) {
      setErrorMsg(`Maximum ${maxFiles} photos allowed in total.`);
      return;
    }

    for (let f of newFilesList) {
      if (!isAllowedImage(f)) {
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
      emitChange([...files, ...valid]);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer?.files) {
      validateAndAdd(Array.from(e.dataTransfer.files));
    }
  };

  const handleRemove = (index) => {
    const updated = files.filter((_, i) => i !== index);
    emitChange(updated);
  };

  // Create preview URLs
  const previews = useMemo(() => {
    return files.map((file) => {
      let url = '';
      if (typeof file === 'string') {
        url = file;
      } else if (file instanceof Blob || file instanceof File) {
        url = URL.createObjectURL(file);
      }
      return {
        file,
        url,
        name: file?.name || 'Photo attachment',
        size: file?.size ? `${(file.size / 1024).toFixed(0)} KB` : ''
      };
    });
  }, [files]);

  // Clean up object URLs on unmount / change
  useEffect(() => {
    return () => {
      previews.forEach((p) => {
        if (p.url && p.url.startsWith('blob:')) {
          URL.revokeObjectURL(p.url);
        }
      });
    };
  }, [previews]);

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
              ? 'border-signal-yellow bg-yellow-tint/30 dark:bg-yellow-signal/10'
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
              // Reset so selecting the same file triggers change
              e.target.value = '';
            }}
          />
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200 flex items-center justify-center">
              <UploadCloud className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              Drag & drop photos here or <span className="text-teal-600 dark:text-signal-yellow underline">browse</span>
            </p>
            <p className="text-[11px] text-slate-400">{helperText}</p>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium mt-1">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Previews */}
      {previews.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
          {previews.map((item, idx) => (
            <div
              key={idx}
              className="relative rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-100 dark:bg-slate-900 group aspect-video shadow-xs"
            >
              {item.url ? (
                <img
                  src={item.url}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                  <ImageIcon className="w-6 h-6 mb-1" />
                  <span className="text-[10px]">Photo {idx + 1}</span>
                </div>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove(idx);
                }}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/80 text-white hover:bg-rose-600 transition shadow-sm cursor-pointer z-10"
                title="Remove photo"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <div className="absolute bottom-0 inset-x-0 bg-slate-950/85 text-white text-[10px] truncate px-2.5 py-1 flex items-center justify-between">
                <span className="truncate max-w-[70%]">{item.name}</span>
                {item.size && <span className="text-slate-400 text-[9px] shrink-0">{item.size}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

