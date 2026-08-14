import React from 'react';

export default function BrandLogo({ className = "", admin = false, medWear = true, dark = false,  }) {
  return (
    <div className={`flex flex-wrap items-center space-x-2 shrink-0 ${className}`}>
      <span className={`font-sans font-light tracking-[0.25em] uppercase text-2xl flex items-center select-none ${dark ? 'text-primary' : 'text-white'}`}>
        C&nbsp;A&nbsp;
        <span 
          className="font-light origin-center leading-none text-3xl mx-0.5" 
          style={{ transform: 'scaleY(1.35)', display: 'inline-block' }}
        >
          V
        </span>
        &nbsp;A&nbsp;N&nbsp;I
      </span>
      {admin && (
        <span className={`text-[9px] tracking-widest border px-1.5 py-0.5 rounded font-bold uppercase ${dark ? 'border-primary/30 text-primary' : 'border-white/30 text-white'}`}>
          ADMIN
        </span>
      )}
      {!admin && medWear && (
        <span className={`text-[9px] tracking-widest border px-1.5 py-0.5 rounded font-bold uppercase ${dark ? 'border-primary/30 text-primary' : 'border-white/30 text-white'}`}>
          MED WEAR
        </span>
      )}
    </div>
  );
}
