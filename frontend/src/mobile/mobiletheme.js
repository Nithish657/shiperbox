import React from "react";

export const COLOR = {
  primary: "#8ec5fc",
  primaryDark: "#2c7be5",
  primarySoft: "#e8f0ff",
  ink: "#0f172a",
  muted: "#64748b",
  line: "#e2e8f0",
  paper: "#ffffff",
  mist: "#f2f5f9",
  pop: "#99f6e4",
  error: "#e53935",
  errorSoft: "#fdecea",
  gradientHeader: "linear-gradient(135deg, #8ec5fc 0%, #6baaf5 100%)",
  gradientCTA: "linear-gradient(135deg, #6baaf5 0%, #2c7be5 100%)",
};

export const FONT = {
  display: `"Segoe UI", "Inter", system-ui, -apple-system, sans-serif`,
  body: `"Segoe UI", "Inter", system-ui, -apple-system, sans-serif`,
  mono: `"SFMono-Regular", "Roboto Mono", ui-monospace, Menlo, monospace`,
};

export const RADIUS = {
  sm: "8px",
  md: "12px",
  lg: "18px",
  xl: "26px",
  pill: "999px",
};

export const SHADOW = {
  rest: "0 1px 3px rgba(15,23,42,0.06)",
  cta: "0 8px 20px rgba(44,123,229,0.28)",
};

export const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
export const EASE_SPRING = "cubic-bezier(0.34, 1.56, 0.64, 1)";

const GLOBAL_CSS = `
  @keyframes sb-fadeSlide { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes sb-pop { 0% { transform: scale(0.86); opacity: 0; } 60% { transform: scale(1.06); opacity: 1; } 100% { transform: scale(1); } }
  @keyframes sb-pulseGlow {
    0% { box-shadow: 0 0 0 0 rgba(44,123,229,0.45); }
    70% { box-shadow: 0 0 0 16px rgba(44,123,229,0); }
    100% { box-shadow: 0 0 0 0 rgba(44,123,229,0); }
  }
  @keyframes sb-shimmer { 0% { background-position: -300px 0; } 100% { background-position: 300px 0; } }

  .sb-tap {
    -webkit-tap-highlight-color: transparent;
    -webkit-user-select: none;
    user-select: none;
    touch-action: manipulation;
    transition: transform 0.16s ${EASE_SPRING}, opacity 0.16s ${EASE};
  }
  .sb-tap:active { transform: scale(0.96); }

  .sb-scroll-x {
    display: flex;
    overflow-x: auto;
    scroll-snap-type: x proximity;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    overscroll-behavior-x: contain;
  }
  .sb-scroll-x::-webkit-scrollbar { display: none; }
  .sb-snap { scroll-snap-align: start; }

  .sb-reveal { opacity: 0; transform: translateY(14px); transition: opacity 0.42s ${EASE}, transform 0.42s ${EASE}; }
  .sb-reveal.sb-reveal-in { opacity: 1; transform: translateY(0); }

  .sb-shimmer {
    background: linear-gradient(90deg, #eef1f5 0%, #f7f9fb 50%, #eef1f5 100%);
    background-size: 600px 100%;
    animation: sb-shimmer 1.4s linear infinite;
  }

  @media (prefers-reduced-motion: reduce) {
    .sb-tap, .sb-reveal, .sb-shimmer { transition: none !important; animation: none !important; }
    .sb-reveal { opacity: 1; transform: none; }
  }
`;

export function GlobalMobileStyles() {
  return <style>{GLOBAL_CSS}</style>;
}

const theme = { COLOR, FONT, RADIUS, SHADOW, EASE, EASE_SPRING, GlobalMobileStyles };

export default theme;
