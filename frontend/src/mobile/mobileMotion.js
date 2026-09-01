import { useCallback, useEffect, useRef, useState } from "react";

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Tracks vertical scroll so chrome (header, bottom nav) can compact itself
 * or slide away while the user scrolls down and come back on the way up.
 * `threshold` is the distance from the top before "scrolled" turns on.
 */
export function useScrollDirection(threshold = 24) {
  const [state, setState] = useState({ scrolled: false, hidden: false });
  const lastY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    const update = () => {
      const y = Math.max(window.scrollY || window.pageYOffset || 0, 0);
      const delta = y - lastY.current;
      setState((prev) => {
        const scrolled = y > threshold;
        let hidden = prev.hidden;
        if (Math.abs(delta) > 6) hidden = delta > 0 && y > threshold * 3;
        if (scrolled === prev.scrolled && hidden === prev.hidden) return prev;
        return { scrolled, hidden };
      });
      lastY.current = y;
      ticking.current = false;
    };

    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return state;
}

/**
 * Ref callback that fades a section in the first time it enters the viewport.
 * Elements must carry the `sb-reveal` class from mobiletheme's global styles.
 */
export function useRevealOnScroll() {
  const observerRef = useRef(null);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined" || prefersReducedMotion()) return undefined;
    observerRef.current = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("sb-reveal-in");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 }
    );
    return () => observerRef.current && observerRef.current.disconnect();
  }, []);

  return useCallback((node) => {
    if (!node) return;
    if (!observerRef.current) {
      node.classList.add("sb-reveal-in");
      return;
    }
    observerRef.current.observe(node);
  }, []);
}

/**
 * Horizontal drag/swipe handling for carousels: returns touch handlers plus
 * the live finger offset so the slide can follow the thumb before snapping.
 */
export function useSwipe({ onNext, onPrev, threshold = 48 }) {
  const startX = useRef(null);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);

  const onTouchStart = (e) => {
    startX.current = e.touches[0].clientX;
    setDragging(true);
  };

  const onTouchMove = (e) => {
    if (startX.current === null) return;
    setOffset(e.touches[0].clientX - startX.current);
  };

  const onTouchEnd = () => {
    if (offset <= -threshold) onNext();
    else if (offset >= threshold) onPrev();
    startX.current = null;
    setOffset(0);
    setDragging(false);
  };

  return { offset, dragging, handlers: { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel: onTouchEnd } };
}
