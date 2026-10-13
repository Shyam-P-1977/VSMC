import React from 'react';

export function NumberPlate({ registrationNumber, plateNumber, size = "md", className = "" }) {
  const formatted = (registrationNumber || plateNumber || "MH 12 AB 1234").trim().toUpperCase();

  const sizeClasses = {
    sm: "h-7 text-xs px-1.5",
    md: "h-9 text-sm px-2",
    lg: "h-11 text-base px-3"
  };

  const blueStripSizes = {
    sm: "w-5 text-[8px]",
    md: "w-7 text-[9px]",
    lg: "w-8 text-[11px]"
  };

  return (
    <div
      className={`inline-flex items-center rounded-md border-2 border-slate-900 bg-white text-slate-900 font-mono font-bold tracking-widest shadow-sm select-none overflow-hidden ${sizeClasses[size] || sizeClasses.md} ${className}`}
      title={formatted}
    >
      {/* Left blue strip with IND and Ashok Chakra representation */}
      <div className={`-ml-2 mr-2 bg-[#003399] text-white flex flex-col items-center justify-center h-full ${blueStripSizes[size] || blueStripSizes.md} font-sans font-black`}>
        <span className="text-[7px] leading-tight text-yellow-signal">★</span>
        <span className="leading-none text-[8px] tracking-normal">IND</span>
      </div>

      <span className="font-mono tracking-wider font-extrabold text-slate-950">
        {formatted}
      </span>
    </div>
  );
}
