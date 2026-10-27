import { useEffect, useRef, useState } from 'react';

const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** True once the element has scrolled into view (fires once). */
export function useInView(options = { rootMargin: '0px 0px -10% 0px', threshold: 0.1 }) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    if (!('IntersectionObserver' in window)) {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true);
        io.disconnect();
      }
    }, options);
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView]);
  return [ref, inView];
}

/**
 * Fades its children up when they scroll into view.
 * `delay` (ms) staggers siblings, e.g. cards in a grid row.
 */
export function Reveal({ as: Tag = 'div', delay = 0, className = '', children, ...rest }) {
  const [ref, inView] = useInView();
  return (
    <Tag ref={ref} className={`reveal ${inView ? 'is-visible' : ''} ${className}`} style={{ '--reveal-delay': `${delay}ms` }} {...rest}>
      {children}
    </Tag>
  );
}

/** Counts from 0 to `value` once visible (eased, ~1.2s). */
export function CountUp({ value, duration = 1200, className = '' }) {
  const [ref, inView] = useInView();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!inView || typeof value !== 'number') return;
    if (reduceMotion()) {
      setN(value);
      return;
    }
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      setN(Math.round(value * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, duration]);
  return (
    <span ref={ref} className={className} aria-label={String(value)}>
      {n}
    </span>
  );
}

/** Stagger helper for grids: delay by column so each row cascades left to right. */
export const stagger = (index, columns = 3, step = 90) => (index % columns) * step;
