import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Images, X } from 'lucide-react';

export default function Gallery({ images = [], title }) {
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const n = images.length;
  const go = (d) => setI((x) => (x + d + n) % n);

  useEffect(() => {
    if (!open) return;
    const h = (e) => {
      if (e.key === 'Escape') setOpen(false);
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'ArrowRight') go(1);
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  });

  if (!n) return <div className="aspect-[16/9] rounded-2xl bg-slate-200 dark:bg-slate-800" />;
  const show = (k) => {
    setI(k);
    setOpen(true);
  };

  return (
    <>
      <div className="relative grid h-[280px] gap-2 overflow-hidden rounded-2xl sm:h-[440px] sm:grid-cols-4 sm:grid-rows-2">
        <button onClick={() => show(0)} className="sm:col-span-2 sm:row-span-2">
          <img src={images[0].url} alt={title} className="size-full object-cover" />
        </button>
        {images.slice(1, 5).map((img, k) => (
          <button key={img.url} onClick={() => show(k + 1)} className="hidden sm:block">
            <img src={img.url} alt={`${title} photo ${k + 2}`} loading="lazy" className="size-full object-cover transition hover:opacity-90" />
          </button>
        ))}
        <button onClick={() => show(0)} className="btn absolute bottom-3 right-3 bg-white/95 text-slate-800 shadow hover:bg-white">
          <Images className="size-4" /> {n} photos
        </button>
      </div>
      {open && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/95" role="dialog" aria-label="Photo viewer">
          <button className="absolute right-4 top-4 p-2 text-white" onClick={() => setOpen(false)} aria-label="Close">
            <X className="size-7" />
          </button>
          <button className="absolute left-2 p-3 text-white sm:left-6" onClick={() => go(-1)} aria-label="Previous">
            <ChevronLeft className="size-8" />
          </button>
          <img src={images[i].url} alt={`${title} ${i + 1}`} className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain" />
          <button className="absolute right-2 p-3 text-white sm:right-6" onClick={() => go(1)} aria-label="Next">
            <ChevronRight className="size-8" />
          </button>
          <span className="absolute bottom-6 text-sm text-white/80">{i + 1} / {n}</span>
        </div>
      )}
    </>
  );
}
