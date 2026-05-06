import React, { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, X, ZoomIn, Grid3X3 } from "lucide-react";

// â”€â”€ Full-screen Lightbox â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function Lightbox({ images, startIndex, onClose }) {
  const [current, setCurrent] = useState(startIndex);

  const prev = useCallback(() => setCurrent(i => (i - 1 + images.length) % images.length), [images.length]);
  const next = useCallback(() => setCurrent(i => (i + 1) % images.length), [images.length]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "ArrowLeft")  prev();
      if (e.key === "ArrowRight") next();
      if (e.key === "Escape")     onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [prev, next, onClose]);

  return (
    <div className="fixed inset-0 z-[9999] bg-black/95 flex flex-col" onClick={onClose}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 shrink-0" onClick={e => e.stopPropagation()}>
        <span className="text-white/60 text-sm font-semibold">{current + 1} / {images.length}</span>
        <button onClick={onClose} className="text-white/60 hover:text-white transition p-2 rounded-full hover:bg-white/10">
          <X size={24} />
        </button>
      </div>

      {/* Main image */}
      <div className="flex-1 flex items-center justify-center px-16 min-h-0" onClick={e => e.stopPropagation()}>
        <button onClick={prev}
          className="absolute left-4 text-white/60 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-3 transition z-10">
          <ChevronLeft size={28} />
        </button>

        <img
          src={images[current]}
          alt={`Photo ${current + 1}`}
          className="max-h-full max-w-full object-contain rounded-xl shadow-2xl select-none"
          draggable={false}
        />

        <button onClick={next}
          className="absolute right-4 text-white/60 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-3 transition z-10">
          <ChevronRight size={28} />
        </button>
      </div>

      {/* Thumbnail strip */}
      <div className="shrink-0 px-6 py-4 flex gap-2 overflow-x-auto justify-center" onClick={e => e.stopPropagation()}>
        {images.map((src, i) => (
          <button key={i} onClick={() => setCurrent(i)}
            className={`shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition ${i === current ? "border-white opacity-100" : "border-transparent opacity-40 hover:opacity-70"}`}>
            <img src={src} alt="" className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}

// â”€â”€ Main Carousel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function ImageCarousel({ mainImage, extraImages = [], propertyName }) {
  const [current, setCurrent]       = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxStart, setLightboxStart] = useState(0);
  const [showGrid, setShowGrid]     = useState(false);

  // Build full image array: main first, then extras
  const allImages = [
    ...(mainImage ? [mainImage] : []),
    ...extraImages.map(img => img.image_url || img.image),
  ].filter(Boolean);

  const total = allImages.length;

  const prev = () => setCurrent(i => (i - 1 + total) % total);
  const next = () => setCurrent(i => (i + 1) % total);

  const openLightbox = (index) => { setLightboxStart(index); setLightboxOpen(true); };

  if (total === 0) {
    return (
      <div className="h-[450px] md:h-[550px] bg-surface-200 flex items-center justify-center rounded-[2.5rem]">
        <p className="text-surface-400 font-medium">No images available</p>
      </div>
    );
  }

  // Single image â€” simple display
  if (total === 1) {
    return (
      <div className="relative rounded-[2.5rem] overflow-hidden shadow-2xl group cursor-zoom-in" onClick={() => openLightbox(0)}>
        <div className="h-[450px] md:h-[550px]">
          <img src={allImages[0]} alt={propertyName} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />
          <div className="absolute top-6 right-6 bg-black/40 backdrop-blur text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5">
            <ZoomIn size={13} /> View Full
          </div>
        </div>
        {lightboxOpen && <Lightbox images={allImages} startIndex={lightboxStart} onClose={() => setLightboxOpen(false)} />}
      </div>
    );
  }

  return (
    <>
      <div className="relative rounded-[2.5rem] overflow-hidden shadow-2xl">

        {/* Main display image */}
        <div className="h-[450px] md:h-[550px] relative overflow-hidden bg-surface-200">
          <img
            key={current}
            src={allImages[current]}
            alt={`${propertyName} â€” photo ${current + 1}`}
            className="w-full h-full object-cover transition-all duration-500 ease-in-out cursor-zoom-in"
            onClick={() => openLightbox(current)}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent pointer-events-none" />

          {/* Prev / Next arrows */}
          <button onClick={prev}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 backdrop-blur text-white rounded-full p-3 transition shadow-lg z-10">
            <ChevronLeft size={24} />
          </button>
          <button onClick={next}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 backdrop-blur text-white rounded-full p-3 transition shadow-lg z-10">
            <ChevronRight size={24} />
          </button>

          {/* Counter pill */}
          <div className="absolute top-6 right-6 bg-black/50 backdrop-blur text-white text-xs font-bold px-3 py-1.5 rounded-full z-10">
            {current + 1} / {total}
          </div>

          {/* All photos button */}
          <button onClick={() => setShowGrid(true)}
            className="absolute top-6 left-6 bg-black/50 hover:bg-black/70 backdrop-blur text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 transition z-10">
            <Grid3X3 size={13} /> All Photos
          </button>
        </div>

        {/* Dot indicators */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
          {allImages.map((_, i) => (
            <button key={i} onClick={() => setCurrent(i)}
              className={`rounded-full transition-all duration-300 ${i === current ? "w-6 h-2 bg-white" : "w-2 h-2 bg-white/50 hover:bg-white/80"}`}
            />
          ))}
        </div>

        {/* Thumbnail strip below hero (shows first 5) */}
        <div className="absolute bottom-14 right-6 flex gap-2 z-10">
          {allImages.slice(0, 5).map((src, i) => (
            <button key={i} onClick={() => setCurrent(i)}
              className={`w-12 h-9 rounded-lg overflow-hidden border-2 transition-all ${i === current ? "border-white scale-110" : "border-white/40 hover:border-white/80 opacity-70"}`}>
              <img src={src} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      </div>

      {/* Grid overlay â€” "All Photos" view */}
      {showGrid && (
        <div className="fixed inset-0 z-[9998] bg-black/90 overflow-y-auto p-6" onClick={() => setShowGrid(false)}>
          <div className="max-w-4xl mx-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white font-bold text-xl">{propertyName} â€” {total} Photos</h2>
              <button onClick={() => setShowGrid(false)} className="text-white/60 hover:text-white p-2 rounded-full hover:bg-white/10 transition">
                <X size={24} />
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {allImages.map((src, i) => (
                <div key={i} onClick={() => { setCurrent(i); setShowGrid(false); openLightbox(i); }}
                  className="aspect-video rounded-xl overflow-hidden cursor-zoom-in group relative">
                  <img src={src} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  {i === 0 && (
                    <div className="absolute top-2 left-2 bg-violet-600 text-white text-[9px] font-bold px-2 py-0.5 rounded">COVER</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxOpen && <Lightbox images={allImages} startIndex={lightboxStart} onClose={() => setLightboxOpen(false)} />}
    </>
  );
}
