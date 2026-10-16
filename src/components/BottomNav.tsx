// @ts-nocheck
import { useEffect, useRef, useState } from "react";
import { AlarmClock, Bell, BookOpen, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, Clock3, Compass, Flag, Home, Mic, Newspaper, Pause, Play, Search, Square, Store, Timer, Trash2, UserRound, X } from "lucide-react";
import CornerKit from '@cornerkit/core';
import { AnimatePresence, motion } from 'motion/react';
import { getNavDesign, type NavDesign } from '../profileStorage';

/* ------------------------------------------------------------------
   Liquid Glass Navbar — dark, thin, single file React
   Safari (iOS/macOS) + Chrome (desktop/Android)

   - Icons: Google Material Symbols (Rounded, Filled, weight 500) embedded
     as inline SVG paths. No font or network request, so they render
     everywhere (Safari, Chrome, strict CSP, offline).
   - Tabs: a glass pill slides between tabs with a liquid stretch.
   - Search: tap the search pill and the tab bar fades away while the
     pill grows into a search field. X (or Escape) collapses it back.
     Enter calls onSearch(query).
   - Keyboard: on iOS Safari the on-screen keyboard overlays fixed
     elements, so the bar is lifted above it using visualViewport.
   - Input font-size is 16px on purpose: smaller makes iOS Safari
     zoom the page when the field is focused.

   Props:
     onChange(tabId)              fired when a tab is selected (home, explore, browse, profile)
     avatarSrc                    URL of the profile picture shown in the last tab
     menuItems                    [{ id, label, icon }] shown by the grid tab (icons: see PATHS)
     onMenuSelect(itemId)         fired when a menu item is chosen
     onSearch(query)              fired when Enter is pressed
     onSearchOpenChange(isOpen)   fired when search opens/closes
------------------------------------------------------------------- */

const EASE_OUT = "cubic-bezier(.22,1,.36,1)"; // long, buttery deceleration
const SPRING = "cubic-bezier(.34,1.35,.55,1)"; // slight overshoot

const supportsBlur =
  typeof CSS !== "undefined" &&
  (CSS.supports("backdrop-filter", "blur(1px)") ||
    CSS.supports("-webkit-backdrop-filter", "blur(1px)"));

/* ---------- Height of the on-screen keyboard (0 when closed) ---------- */
function useKeyboardOffset(active) {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    if (!active || !vv) {
      setOffset(0);
      return undefined;
    }
    const update = () => {
      const kb = Math.round(window.innerHeight - vv.height - vv.offsetTop);
      setOffset(kb > 120 ? kb : 0); // ignore small browser-toolbar changes
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      setOffset(0);
    };
  }, [active]);

  return offset;
}

/* ---------- Styles that need real CSS ---------- */
const CSS_TEXT = `
.lgn-ico {
  display: grid;
  place-items: center;
  opacity: 0.5; /* frosted when its tab is not selected */
  transform: scale(1);
  transition: transform 420ms ${SPRING}, opacity 300ms ease;
}
.lgn-tab[aria-selected="true"] .lgn-ico { opacity: 1; transform: scale(1.1); }
.lgn-tab:active .lgn-ico { transform: scale(0.88); transition-duration: 120ms; }
.lgn-s-ico .lgn-ico,
.lgn-item .lgn-ico { opacity: 1; }
.lgn-item {
  -webkit-appearance: none;
  appearance: none;
  border: 0;
  margin: 0;
  width: 100%;
  height: 46px;
  padding: 0 14px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  gap: 14px;
  background: transparent;
  color: #fff;
  font-family: inherit;
  font-size: 15px;
  font-weight: 500;
  letter-spacing: 0.1px;
  text-align: left;
  white-space: nowrap;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.lgn-item { position: relative; z-index: 1; transition: background 160ms ease; }
.lgn-item:focus-visible { outline: none; }
.lgn-item:active { background: rgba(255,255,255,0.07); }
.lgn-open:active + .lgn-s-ico .lgn-ico { transform: scale(0.88); transition-duration: 120ms; }
.lgn-close:active { transform: translateY(-50%) scale(0.9) !important; }

.lgn-slider {
  transition: transform 480ms ${SPRING};
  will-change: transform;
}
.lgn-blob.is-moving { animation: lgn-stretch 520ms cubic-bezier(.3,.9,.4,1); }
@keyframes lgn-stretch {
  0%   { transform: scale(1, 1); }
  35%  { transform: scale(1.22, 0.92); }
  70%  { transform: scale(0.97, 1.03); }
  100% { transform: scale(1, 1); }
}

.lgn-input {
  -webkit-appearance: none;
  appearance: none;
  background: transparent !important;
  background-color: transparent !important;
  border: 0;
  outline: 0;
  margin: 0;
  padding: 0;
  border-radius: 0;
  box-sizing: border-box;
  min-width: 0;
  width: 100%;
  height: 100%;
  color: #fff;
  caret-color: #fff;
  font-family: inherit;
  font-size: 16px; /* >=16px stops iOS Safari zooming on focus */
  font-weight: 500;
  letter-spacing: 0.1px;
}
.lgn-input::placeholder { color: rgba(255,255,255,0.62); opacity: 1; }
.lgn-input::-webkit-input-placeholder { color: rgba(255,255,255,0.62); opacity: 1; }
.lgn-input::-webkit-search-cancel-button { display: none; }
.lgn-input:-webkit-autofill,
.lgn-input:-webkit-autofill:hover,
.lgn-input:-webkit-autofill:focus {
  -webkit-box-shadow: 0 0 0 1000px transparent inset !important;
  box-shadow: 0 0 0 1000px transparent inset !important;
  -webkit-text-fill-color: #fff !important;
  caret-color: #fff;
  transition: background-color 999999s ease-out 0s;
}

@media (prefers-reduced-motion: reduce) {
  .lgn-slider, .lgn-ico, .lgn-row, .lgn-tabbar, .lgn-search-wrap,
  .lgn-s-ico, .lgn-input, .lgn-close, .lgn-menu, .lgn-item { transition: none !important; }
  .lgn-blob.is-moving { animation: none; }
}
@media (min-width: 1024px) {
  .lgn-row { display: contents !important; }
  .lgn-tabbar, .lgn-search-wrap { display: none !important; }
  .pn-desktop-topbar { display: flex !important; }
  .lgn-menu { left: auto !important; right: 18px !important; top: 72px !important; bottom: auto !important; width: min(360px, calc(100vw - 36px)) !important; max-width: 360px !important; margin-inline: 0 !important; z-index: 65 !important; transform-origin: 100% 0 !important; }
}
@media (max-width: 1023px) {
  .pn-desktop-topbar { display: none !important; }
}
.pn-progressive-nav { isolation: isolate; background: transparent !important; border: 0 !important; box-shadow: none !important; }
.pn-progressive-nav::before { content: ""; position: absolute; inset: 0 -24px -34px; z-index: -1; pointer-events: none; background: linear-gradient(to bottom, rgba(27,28,30,.8), rgba(27,28,30,.42) 64%, transparent); -webkit-backdrop-filter: blur(18px) saturate(145%); backdrop-filter: blur(18px) saturate(145%); -webkit-mask-image: linear-gradient(to bottom, #000 0%, #000 50%, transparent 100%); mask-image: linear-gradient(to bottom, #000 0%, #000 50%, transparent 100%); }
.pn-progressive-mobile::before { content: ""; position: absolute; inset: -47px 0 0; z-index: 0; pointer-events: none; background: linear-gradient(to top, rgba(27,28,30,.88), rgba(27,28,30,.4) 58%, transparent); -webkit-backdrop-filter: blur(18px) saturate(145%); backdrop-filter: blur(18px) saturate(145%); -webkit-mask-image: linear-gradient(to top, #000 0%, #000 50%, transparent 100%); mask-image: linear-gradient(to top, #000 0%, #000 50%, transparent 100%); }
@media (min-width: 1024px) { .pn-progressive-mobile::before { display: none; } }
`;

const PATHS = {
  home:
    "M154.02-182.15v-386.89q0-16.17 7.09-30.59 7.1-14.42 20.02-23.87l257.85-193.57q17.83-13.67 40.86-13.67t41.18 13.67L778.87-623.5q12.92 9.45 20.14 23.87 7.21 14.42 7.21 30.59v386.89q0 28.33-20.02 48.23t-48.35 19.9H595.5q-14.42 0-24.24-9.82-9.83-9.82-9.83-24.25v-219.28q0-14.42-9.82-24.24-9.82-9.82-24.24-9.82h-94.74q-14.42 0-24.24 9.82-9.82 9.82-9.82 24.24v219.28q0 14.43-9.83 24.25-9.82 9.82-24.24 9.82H222.15q-28.33 0-48.23-19.9t-19.9-48.23Z",
  explore:
    "m333.83-312.43 204.63-61.7q16.95-5.22 29.07-17.34 12.12-12.12 17.34-29.07l61.7-204.63q3.23-9.96-4.1-17.3-7.34-7.33-17.3-4.1l-204.63 61.7q-16.95 5.22-29.07 17.34-12.12 12.12-17.34 29.07l-61.7 204.63q-3.23 9.96 4.1 17.3 7.34 7.33 17.3 4.1Zm146.11-131.16q-15.27 0-25.81-10.6t-10.54-25.87q0-15.27 10.6-25.81t25.87-10.54q15.27 0 25.81 10.6t10.54 25.87q0 15.27-10.6 25.81t-25.87 10.54Zm.09 369.57q-83.46 0-157.54-31.88-74.07-31.88-129.39-87.2-55.32-55.32-87.2-129.36-31.88-74.04-31.88-157.51 0-84.46 31.88-158.54 31.88-74.07 87.16-128.9 55.28-54.84 129.34-86.82 74.06-31.99 157.55-31.99 84.48 0 158.59 31.97 74.1 31.97 128.91 86.77 54.82 54.8 86.79 128.88 31.98 74.08 31.98 158.6 0 83.5-31.99 157.57-31.98 74.07-86.82 129.36-54.83 55.29-128.87 87.17-74.04 31.88-158.51 31.88Z",
  grid_view:
    "M182.15-510q-28.09 0-48.11-20.02t-20.02-48.35v-199.48q0-28.09 20.02-48.23 20.02-20.14 48.11-20.14h199.72q28.09 0 48.11 20.14T450-777.85v199.48q0 28.33-20.02 48.35Q409.96-510 381.87-510H182.15Zm0 395.98q-28.09 0-48.11-20.02t-20.02-48.11v-199.72q0-28.09 20.02-48.11T182.15-450h199.72q28.09 0 48.11 20.02T450-381.87v199.72q0 28.09-20.02 48.11t-48.11 20.02H182.15ZM578.37-510q-28.33 0-48.35-20.02Q510-550.04 510-578.37v-199.48q0-28.09 20.02-48.23 20.02-20.14 48.35-20.14h199.48q28.09 0 48.23 20.14 20.14 20.14 20.14 48.23v199.48q0 28.33-20.14 48.35Q805.94-510 777.85-510H578.37Zm0 395.98q-28.33 0-48.35-20.02Q510-154.06 510-182.15v-199.72q0-28.09 20.02-48.11T578.37-450h199.48q28.09 0 48.23 20.02 20.14 20.02 20.14 48.11v199.72q0 28.09-20.14 48.11t-48.23 20.02H578.37Z",
  video_library:
    "M4 20H20V22H4C2.9 22 2 21.1 2 20V6H4V20ZM20 2C21.1 2 22 2.9 22 4V16C22 17.1 21.1 18 20 18H8C6.9 18 6 17.1 6 16V4C6 2.9 6.9 2 8 2H20ZM11 6V14L17 10L11 6Z",
  search:
    "M376.57-324.93q-109.84 0-185.96-76.2Q114.5-477.33 114.5-585t76.2-183.87q76.19-76.2 184.37-76.2 108.17 0 183.86 76.2 75.7 76.2 75.7 184.02 0 43.33-13.64 82.97t-40.92 74.4l240.56 238.57q10.2 9.99 10.2 24.76 0 14.78-10.2 24.98-10.43 10.43-25.21 10.43-14.78 0-24.53-10.43L531.33-378.5q-29.76 25.28-69.6 39.42-39.84 14.15-85.16 14.15Zm-1-68.14q79.81 0 135.37-56.18T566.5-585q0-79.57-55.56-135.75-55.56-56.18-135.37-56.18-80.41 0-136.68 56.18-56.26 56.18-56.26 135.75t56.26 135.75q56.27 56.18 136.68 56.18Z",
  storefront:
    "M180.43-111.87q-27.59 0-47.86-20.27Q112.3-152.4 112.3-180v-337.09q-28.47-25.43-36.76-61.4-8.28-35.97 2.72-71.18l43-135q8.72-28.92 30.15-45.23 21.44-16.32 49.59-16.32h553q29.86 0 52.56 16.82 22.7 16.81 31.18 44.73l44 135q11 35 1.98 70.71-9.02 35.72-36.79 60.92V-180q0 27.6-20.33 47.86-20.34 20.27-48.03 20.27H180.43ZM570-552.15q27.92 0 47.38-18.17 19.47-18.16 15.47-44.44l-24.76-163.09h-95.94V-615q0 25.33 16.37 44.09 16.38 18.76 41.48 18.76Zm-187 0q26.88 0 45.87-18.26 18.98-18.26 18.98-44.59v-162.85h-95.94l-24.76 163.09q-3.76 25.04 13.31 43.83 17.07 18.78 42.54 18.78Zm-181.94 0q23.22 0 40.12-16.14 16.91-16.14 19.67-39.19l25.76-170.37h-95.94l-45.52 144.33q-9.76 30.57 7.52 55.97 17.29 25.4 48.39 25.4Zm556.94 0q31.04 0 48.83-24.93 17.78-24.92 8.02-56.44l-45.52-144.33h-95.7l25.52 170.37q2.76 23.05 19.64 39.19 16.88 16.14 39.21 16.14Z",
  newspaper:
    "M144.07-113.3q-28.11 0-48.12-20.01-20.02-20.01-20.02-48.12v-646.79q0-5.93 5.1-8.06 5.1-2.13 9.58 2.11l53.52 53.04 54.28-55.04q5.16-5.48 12.28-5.48 7.11 0 12.59 5.48l55.05 55.04 55.28-55.04q4.87-5.48 12.08-5.48 7.2 0 12.79 5.48l54.04 54.8 55.05-54.56q5.15-5.72 12.27-5.72 7.12 0 12.59 5.72l55.05 54.56 54.28-54.8q4.88-5.48 12.08-5.48t12.79 5.48l55.04 55.04 55.05-55.04q5.16-5.48 12.27-5.48 7.12 0 12.6 5.48l54.28 55.04 53.52-53.04q4.48-4.24 9.58-2.11 5.1 2.13 5.1 8.06v646.79q0 28.11-20.02 48.12-20.01 20.01-48.12 20.01H144.07Zm0-68.13h303.3v-280h-303.3v280Zm368.56 0h303.3v-107.14h-303.3v107.14Zm0-172.64h303.3v-107.36h-303.3v107.36ZM144.07-526.93h671.86v-114.5H144.07v114.5Z",
  menu_book:
    "M512-243.3q50-25 98-37.5t102-12.5q38 0 78.5 6t69.5 16v-429q-34-17.24-72-25.12-38-7.88-76-7.88-54 0-104.5 16.5T512-670.3v427Zm-44.5 83.47q-6.98-1.5-12.46-5.73-46.76-29-99.56-45.24-52.81-16.24-107.48-16.24-36.42 0-70.87 9.12-34.46 9.12-68.98 21.64-25.39 12.43-49.52-2.8-24.13-15.24-24.13-44.27v-462.76q0-17.39 7.96-31.97 7.95-14.58 23.87-22.68 42.47-19.52 88.21-28.9 45.74-9.38 92.96-9.38 63.26 0 122.88 17.12T482-729.33q51-35.24 109.62-52.47 58.62-17.24 120.88-17.24 47.22 0 92.46 9.5 45.24 9.5 87.71 28.78 15.92 8.1 24.37 22.68 8.46 14.58 8.46 31.97v465.39q0 30.16-25.01 45.01-25.01 14.86-49.64-.57-33.52-13.52-67.98-22.14-34.45-8.62-70.87-8.62-53.76 0-105.04 16.36-51.29 16.35-97.05 45.12-5.24 4.23-12.21 5.73-6.98 1.5-15.1 1.5t-15.1-1.5ZM560-601.78q0-5.77 3.88-11.03t8.88-7.49q30-11 61.5-17t65.74-6q22 0 43 2.51 21 2.52 41 7.54 6 1.78 11 7.45t5 12.5q0 11.23-7.5 17.12-7.5 5.88-18.5 2.88-17.24-5-35.62-7.5T700-603.3q-29 0-55.88 5.38-26.88 5.38-52.64 16.38-14.21 5-22.85-.66-8.63-5.66-8.63-19.58Zm0 220q0-5.77 3.88-11.53t8.88-7.99q30-11 61.5-16.5t65.74-5.5q22 0 43 2.51 21 2.52 41 7.54 6 1.78 11 7.45t5 12.5q0 11.23-7.5 17.12-7.5 5.88-18.5 2.88-17.24-5-35.62-7.5T700-383.3q-29 0-55.88 4.88-26.88 4.88-52.64 15.88-14.21 5-22.85-.04-8.63-5.04-8.63-19.2Zm0-110q0-5.77 3.88-11.03t8.88-7.49q30-11 61.5-17t65.74-6q22 0 43 2.51 21 2.52 41 7.54 6 1.78 11 7.45t5 12.5q0 11.23-7.5 17.12-7.5 5.88-18.5 2.88-17.24-5-35.62-7.5T700-493.3q-29 0-55.88 5.38-26.88 5.38-52.64 16.38-14.21 5-22.85-.66-8.63-5.66-8.63-19.58Z",
  add:
    "M445.93-445.93H228.09q-14.43 0-24.25-9.88-9.82-9.87-9.82-24.37 0-14.49 9.82-24.19 9.82-9.7 24.25-9.7h217.84v-217.84q0-14.43 9.88-24.37 9.87-9.94 24.37-9.94 14.49 0 24.19 9.94 9.7 9.94 9.7 24.37v217.84h217.84q14.43 0 24.37 9.88 9.94 9.87 9.94 24.37 0 14.49-9.94 24.19-9.94 9.7-24.37 9.7H514.07v217.84q0 14.43-9.88 24.25-9.87 9.82-24.37 9.82-14.49 0-24.19-9.82-9.7-9.82-9.7-24.25v-217.84Z",
  auto_awesome:
    "M19 8.375q-.125 0-.288-.088-.162-.087-.212-.262L17.7 6.3l-1.725-.775q-.175-.075-.25-.225-.075-.15-.075-.3t.075-.3q.075-.15.25-.225L17.7 3.7l.8-1.725q.05-.175.212-.263.163-.087.288-.087.15 0 .3.087.15.088.225.263l.8 1.725 1.7.775q.175.075.263.225.087.15.087.3t-.087.3q-.088.15-.263.225l-1.7.775-.8 1.725q-.075.175-.225.262-.15.088-.3.088Zm0 14q-.125 0-.288-.087-.162-.088-.212-.263l-.8-1.725-1.725-.775q-.175-.075-.25-.225-.075-.15-.075-.3t.075-.3q.075-.15.25-.225L17.7 17.7l.8-1.725q.05-.175.212-.263.163-.087.288-.087.15 0 .3.087.15.088.225.263l.8 1.725 1.7.775q.175.075.263.225.087.15.087.3t-.087.3q-.088.15-.263.225l-1.7.775-.8 1.725q-.075.175-.225.263-.15.087-.3.087ZM9.025 18.6q-.3 0-.587-.162-.288-.163-.438-.488l-1.525-3.375-3.4-1.55q-.3-.15-.475-.438-.175-.287-.175-.587t.175-.588q.175-.287.475-.437l3.4-1.55L8 6.05q.15-.325.438-.488.287-.162.587-.162.325 0 .612.162.288.163.438.488L11.6 9.425l3.4 1.55q.3.15.475.437.175.288.175.588t-.175.587q-.175.288-.475.438l-3.4 1.55-1.525 3.375q-.15.325-.438.488-.287.162-.612.162Z",
};

/* ---------- Icon ---------- */
const Icon = ({ name, size = 22 }) => (
  <span className="lgn-ico">
    <svg
      viewBox="0 -960 960 960"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      style={{ display: "block" }}
    >
      <path
        d={PATHS[name]}
        fill="url(#lgn-glass)"
        transform={name === "auto_awesome" || name === "video_library" ? "translate(0 -960) scale(40)" : undefined}
      />
    </svg>
  </span>
);

/* ---------- Profile picture (falls back to a silhouette) ---------- */
const AVATAR = 30;
const Avatar = ({ src, alt, timerActive = false }) => {
  const [failed, setFailed] = useState(false);
  return (
    <span className={`lgn-ico relative rounded-full ${timerActive ? 'ring-[2.5px] ring-[#ff9f0a] ring-offset-2 ring-offset-[#242321]' : ''}`}>
      {src && !failed ? (
        <img
          src={src}
          alt={alt}
          width={AVATAR}
          height={AVATAR}
          draggable={false}
          onError={() => setFailed(true)}
          style={{ width: AVATAR, height: AVATAR, borderRadius: "50%", objectFit: "cover", display: "block" }}
        />
      ) : (
        <svg viewBox="0 0 32 32" width={AVATAR} height={AVATAR} aria-hidden="true" style={{ display: "block" }}>
          <defs>
            <linearGradient id="lgn-av" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ffffff" stopOpacity="0.9" />
              <stop offset="1" stopColor="#ffffff" stopOpacity="0.6" />
            </linearGradient>
            <clipPath id="lgn-av-clip"><circle cx="16" cy="16" r="16" /></clipPath>
          </defs>
          <circle cx="16" cy="16" r="16" fill="rgba(255,255,255,0.28)" />
          <g clipPath="url(#lgn-av-clip)" fill="url(#lgn-av)">
            <circle cx="16" cy="12.5" r="5.5" />
            <ellipse cx="16" cy="30" rx="11" ry="9" />
          </g>
        </svg>
      )}
    </span>
  );
};

/* ---------- Dark liquid glass tokens ---------- */
const BLUR = "blur(6px) saturate(190%) brightness(1.06)";

const darkGlass = (tint) => ({
  background: supportsBlur
    ? `linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 45%, rgba(255,255,255,0.05) 100%), ${tint}`
    : "rgba(70,62,56,0.82)",
  backdropFilter: BLUR,
  WebkitBackdropFilter: BLUR,
  boxShadow: [
    "inset 0 10px 16px -10px rgba(255,255,255,0.22)",
    "inset 0 -10px 16px -12px rgba(255,255,255,0.10)",
    "inset 0 0 22px rgba(255,255,255,0.07)",
    "0 8px 24px rgba(0,0,0,0.14)",
  ].join(", "),
  isolation: "isolate",
  transform: "translateZ(0)", // fixes Safari's rounded-corner backdrop bug
});

const TABS = [
  { id: "home", label: "Home", icon: "home" },
  { id: "explore", label: "Explore", icon: "explore" },
  { id: "puntoshorts", label: "PuntoShorts", icon: "video_library" },
  { id: "profile", label: "Profile", avatar: true },
];

const MENU_W = 236;
const DEFAULT_MENU = [
  { id: 'puntoshorts', label: 'PuntoShorts', icon: 'video_library' },
  { id: "eventos", label: "Eventos", icon: "event" },
  { id: "videos", label: "Mercado", icon: "storefront" },
  { id: "noticias", label: "Noticias", icon: "newspaper" },
  { id: "guias", label: "Artículos", icon: "menu_book" },
  { id: "ask-nochi", label: "Pregúntale a Nochi", icon: "auto_awesome" },
  { id: "voice-search", label: "Búsqueda por voz", icon: "mic" },
];
const COMING_SOON = [
  { label: "Temporizador", symbol: "timer" },
  { label: "Cronómetro", symbol: "timer" },
  { label: "Alarmas", symbol: "alarm" },
  { label: "Notas rápidas", symbol: "description" },
  { label: "Recordatorios", symbol: "notifications" },
  { label: "Calendario", symbol: "calendar_month" },
];
const QUICK_NOTES_KEY = 'puntonochi-quick-notes-v1';
const REMINDERS_KEY = 'puntonochi-reminders-v1';
const ALARMS_KEY = 'puntonochi-alarms-v1';
const NOTE_COLORS = [
  { name: 'Amarillo', value: '#fff0a6' },
  { name: 'Rosa', value: '#ffd0dc' },
  { name: 'Azul', value: '#c9e5ff' },
  { name: 'Verde', value: '#d6f1c4' },
  { name: 'Lavanda', value: '#e6d8ff' },
  { name: 'Durazno', value: '#ffd8bd' },
  { name: 'Menta', value: '#bfeee2' },
  { name: 'Lila', value: '#d7c9ff' },
  { name: 'Coral', value: '#ffbdb5' },
  { name: 'Crema', value: '#f5e6c8' },
  { name: 'Cielo', value: '#bde8f5' },
  { name: 'Limón', value: '#e5f5a9' },
];

function readQuickNotes() {
  try {
    const saved = JSON.parse(localStorage.getItem(QUICK_NOTES_KEY) || '[]');
    return Array.isArray(saved) ? saved : [];
  } catch { return []; }
}

function readSavedList(key) {
  try { const value = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(value) ? value : []; } catch { return []; }
}

const dayKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
function AppleUtilitySheets({ active, onClose }) {
  const [reminders, setReminders] = useState(() => readSavedList(REMINDERS_KEY));
  const [alarms, setAlarms] = useState(() => readSavedList(ALARMS_KEY));
  const [reminderComposer, setReminderComposer] = useState(false);
  const [reminderTitle, setReminderTitle] = useState('');
  const [reminderDueDate, setReminderDueDate] = useState('');
  const [reminderDueTime, setReminderDueTime] = useState('');
  const [reminderNotes, setReminderNotes] = useState('');
  const [reminderPriority, setReminderPriority] = useState('normal');
  const [reminderListMenuOpen, setReminderListMenuOpen] = useState(false);
  const [reminderDateVisible, setReminderDateVisible] = useState(false);
  const [reminderTimeVisible, setReminderTimeVisible] = useState(false);
  const reminderComposerScrollRef = useRef(null);
  const [reminderFilter, setReminderFilter] = useState('all');
  const [alarmComposer, setAlarmComposer] = useState(false);
  const [alarmTime, setAlarmTime] = useState('08:00');
  const [alarmLabel, setAlarmLabel] = useState('Alarma');
  const [alarmRepeats, setAlarmRepeats] = useState(false);
  const [ringingAlarm, setRingingAlarm] = useState(null);
  const [dueReminder, setDueReminder] = useState(null);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState(() => dayKey(new Date()));
  const [calendarQuickAddOpen, setCalendarQuickAddOpen] = useState(false);
  const [calendarQuickTitle, setCalendarQuickTitle] = useState('');
  const calendarQuickAddRef = useRef(null);

  useEffect(() => { try { localStorage.setItem(REMINDERS_KEY, JSON.stringify(reminders)); } catch { /* Keep the in-memory list usable if storage is unavailable. */ } }, [reminders]);
  useEffect(() => { try { localStorage.setItem(ALARMS_KEY, JSON.stringify(alarms)); } catch { /* Keep the in-memory list usable if storage is unavailable. */ } }, [alarms]);
  useEffect(() => {
    const interval = window.setInterval(() => {
      const now = Date.now();
      if (!ringingAlarm) {
        const due = alarms.find((alarm) => alarm.enabled && alarm.nextAt <= now);
        if (due) {
          setRingingAlarm(due);
          setAlarms((current) => current.map((alarm) => alarm.id !== due.id ? alarm : alarm.repeatDaily ? { ...alarm, nextAt: new Date(alarm.nextAt).setDate(new Date(alarm.nextAt).getDate() + 1) } : { ...alarm, enabled: false }));
        }
      }
      if (!dueReminder) {
        const due = reminders.find((reminder) => !reminder.completed && !reminder.notified && reminder.dueAt && reminder.dueAt <= now);
        if (due) { setDueReminder(due); setReminders((current) => current.map((item) => item.id === due.id ? { ...item, notified: true } : item)); }
      }
    }, 1000);
    return () => window.clearInterval(interval);
  }, [alarms, reminders, ringingAlarm, dueReminder]);
  useEffect(() => {
    if (!active) return undefined;
    const timer = window.setTimeout(() => { const corners = new CornerKit(); corners.applyAll('[data-lgn-utility-sheet]', { radius: 30, smoothing: 1 }); corners.applyAll('[data-lgn-reminder-composer]', { radius: 30, smoothing: 1 }); corners.applyAll('[data-lgn-reminder-pill]', { radius: 22, smoothing: 1 }); }, 40);
    return () => window.clearTimeout(timer);
  }, [active, reminderComposer]);
  useEffect(() => {
    if (!active) return undefined;
    const handleKeyDown = (event) => { if (event.key === 'Escape') { event.preventDefault(); if (reminderComposer) closeReminderComposer(); else onClose(); } };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [active, reminderComposer, onClose]);
  useEffect(() => {
    if (!calendarQuickAddOpen) return undefined;
    const closeOnOutsidePress = (event) => {
      if (calendarQuickAddRef.current?.contains(event.target)) return;
      setCalendarQuickAddOpen(false);
      setCalendarQuickTitle('');
    };
    document.addEventListener('pointerdown', closeOnOutsidePress);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePress);
  }, [calendarQuickAddOpen]);
  useEffect(() => {
    if (!reminderDateVisible && !reminderTimeVisible) return undefined;
    const frame = window.requestAnimationFrame(() => {
      const scroller = reminderComposerScrollRef.current;
      if (scroller) scroller.scrollTo({ top: scroller.scrollHeight, behavior: 'smooth' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [reminderDateVisible, reminderTimeVisible]);

  const openReminderComposer = (due = '') => { const date = due ? new Date(due) : null; setReminderTitle(''); setReminderNotes(''); setReminderPriority('normal'); setReminderDueDate(date ? dayKey(date) : ''); setReminderDueTime(date ? `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}` : ''); setReminderDateVisible(Boolean(due)); setReminderTimeVisible(Boolean(due)); setReminderListMenuOpen(false); setReminderComposer(true); };
  const closeReminderComposer = () => { setReminderComposer(false); setReminderListMenuOpen(false); setReminderDateVisible(false); setReminderTimeVisible(false); };
  const selectReminderSchedule = (schedule) => {
    setReminderListMenuOpen(false);
    if (schedule === 'none') { setReminderDueDate(''); setReminderDueTime(''); setReminderDateVisible(false); setReminderTimeVisible(false); return; }
    const date = new Date();
    if (schedule === 'today') date.setHours(date.getHours() + 1, 0, 0, 0);
    else date.setDate(date.getDate() + 1), date.setHours(9, 0, 0, 0);
    setReminderDueDate(dayKey(date)); setReminderDueTime(`${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`); setReminderDateVisible(true); setReminderTimeVisible(true);
  };
  const createReminder = () => {
    const title = reminderTitle.trim(); if (!title) return;
    const dueAt = reminderDueDate ? new Date(`${reminderDueDate}T${reminderDueTime || '09:00'}`).getTime() : null;
    setReminders((current) => [...current, { id: globalThis.crypto?.randomUUID?.() || `reminder-${Date.now()}`, title, notes: reminderNotes.trim(), priority: reminderPriority, dueAt, completed: false, notified: false, createdAt: Date.now() }]);
    setReminderTitle(''); setReminderNotes(''); setReminderDueDate(''); setReminderDueTime(''); setReminderPriority('normal'); setReminderDateVisible(false); setReminderTimeVisible(false); setReminderComposer(false);
  };
  const createAlarm = () => {
    if (!alarmTime) return;
    const [hour, minute] = alarmTime.split(':').map(Number);
    const next = new Date(); next.setHours(hour, minute, 0, 0); if (next.getTime() <= Date.now()) next.setDate(next.getDate() + 1);
    setAlarms((current) => [...current, { id: globalThis.crypto?.randomUUID?.() || `alarm-${Date.now()}`, label: alarmLabel.trim() || 'Alarma', time: alarmTime, nextAt: next.getTime(), enabled: true, repeatDaily: alarmRepeats }]);
    setAlarmLabel('Alarma'); setAlarmComposer(false);
  };
  const dates = (() => { const first = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1); const start = new Date(first); start.setDate(1 - ((first.getDay() + 6) % 7)); return Array.from({ length: 42 }, (_, index) => { const date = new Date(start); date.setDate(start.getDate() + index); return date; }); })();
  const selectedCalendarDate = new Date(`${selectedDay}T12:00:00`);
  const weekStart = new Date(selectedCalendarDate); weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const weekDates = Array.from({ length: 7 }, (_, index) => { const date = new Date(weekStart); date.setDate(weekStart.getDate() + index); return date; });
  const selectCalendarDate = (date) => { const key = dayKey(date); setSelectedDay(key); setCalendarMonth(new Date(date.getFullYear(), date.getMonth(), 1)); };
  const createCalendarEvent = () => {
    const eventTitle = calendarQuickTitle.trim(); if (!eventTitle) return;
    const now = new Date();
    const due = new Date(`${selectedDay}T09:00:00`);
    if (selectedDay === dayKey(now)) due.setHours(now.getHours() + 1, 0, 0, 0);
    setReminders((current) => [...current, { id: globalThis.crypto?.randomUUID?.() || `event-${Date.now()}`, title: eventTitle, notes: '', priority: 'normal', dueAt: due.getTime(), completed: false, notified: false, createdAt: Date.now() }]);
    setCalendarQuickTitle(''); setCalendarQuickAddOpen(false);
  };
  const selectedReminders = reminders.filter((item) => item.dueAt && dayKey(new Date(item.dueAt)) === selectedDay).sort((a, b) => a.dueAt - b.dueAt);
  const nextAlarm = alarms.filter((item) => item.enabled).sort((a, b) => a.nextAt - b.nextAt)[0];
  const pendingReminders = reminders.filter((item) => !item.completed).sort((a, b) => (a.dueAt || Infinity) - (b.dueAt || Infinity));
  const todayKey = dayKey(new Date());
  const reminderGroups = [
    { id: 'today', label: 'Hoy', icon: CalendarDays, color: '#ff9f0a', items: pendingReminders.filter((item) => item.dueAt && dayKey(new Date(item.dueAt)) === todayKey) },
    { id: 'scheduled', label: 'Programado', icon: Clock3, color: '#0a84ff', items: pendingReminders.filter((item) => item.dueAt && dayKey(new Date(item.dueAt)) !== todayKey) },
    { id: 'all', label: 'Todos', icon: Bell, color: '#bf5af2', items: pendingReminders },
    { id: 'completed', label: 'Completados', icon: Check, color: '#30d158', items: reminders.filter((item) => item.completed) },
  ];
  const visibleReminderItems = reminderGroups.find((group) => group.id === reminderFilter)?.items || pendingReminders;
  const dateLabel = (value) => new Intl.DateTimeFormat('es-MX', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(value));

  if (!active) return null;
  const title = active === 'alarms' ? 'Alarmas' : active === 'reminders' ? 'Recordatorios' : 'Calendario';
  return <>
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[139] bg-black/50 backdrop-blur-sm"/>
    <motion.section data-lgn-utility-sheet data-desktop-sheet="side-right" role="dialog" aria-modal="false" aria-label={title} initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }} className={`pointer-events-auto fixed inset-x-[5px] bottom-[5px] z-[140] mx-auto flex h-[min(84dvh,780px)] max-w-[680px] flex-col overflow-hidden rounded-[30px] text-white shadow-[0_-18px_70px_rgba(0,0,0,.48)] ${active === 'calendar' ? 'bg-[#111214]' : active === 'alarms' ? 'bg-[#08090b]' : 'bg-[#1c1d20]'}`}>
      <header className="flex shrink-0 items-start justify-between px-5 pb-3 pt-5"><div className={active === 'calendar' ? 'flex min-w-0 flex-1 items-start justify-between pr-3' : ''}>{active === 'calendar' ? <><div className="flex items-center gap-1.5"><h2 className="text-[25px] font-semibold leading-7 tracking-tight capitalize">{new Intl.DateTimeFormat('es-MX', { weekday: 'short' }).format(selectedCalendarDate).replace('.', '')}</h2><span aria-hidden="true" className="mt-1 h-2 w-2 rounded-full bg-[#ff5b52]"/></div><p className="pt-0.5 text-right text-[11px] leading-[14px] text-white/55">{new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long' }).format(selectedCalendarDate)}<br/>{selectedCalendarDate.getFullYear()}</p></> : <><h2 className="text-[21px] font-bold tracking-tight">{title}</h2>{active === 'reminders' && <p className="mt-0.5 text-xs text-white/45">{pendingReminders.length} pendientes · {reminders.filter((item) => item.completed).length} completados</p>}{active === 'alarms' && <p className="mt-0.5 text-xs text-white/40">Reloj</p>}</>}</div><button type="button" onClick={onClose} aria-label={`Cerrar ${title}`} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[.09] text-white/75"><X className="h-4 w-4"/></button></header>
      {active === 'alarms' && <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-5 pt-4">
        <div className="mb-4 rounded-[24px] bg-[#17181b] px-5 pb-5 pt-4 shadow-[inset_0_1px_0_rgba(255,255,255,.05)]"><div className="flex items-center justify-between"><span className="text-[10px] font-semibold uppercase tracking-[.18em] text-white/40">Siguiente</span><AlarmClock className="h-4 w-4 text-[#ff9f0a]"/></div><p className="mt-2 font-mono text-[54px] font-light leading-[1.05] tracking-[-.06em] tabular-nums">{nextAlarm?.time || '—:—'}</p><p className="mt-2 text-xs text-white/45">{nextAlarm ? `${nextAlarm.label}${nextAlarm.repeatDaily ? ' · Todos los días' : ''}` : 'Añade una alarma para empezar'}</p></div>
        <div className="mb-2 flex items-center justify-between px-1"><h3 className="text-[11px] font-semibold uppercase tracking-[.16em] text-white/40">Alarmas</h3><button type="button" onClick={() => setAlarmComposer(true)} aria-label="Añadir alarma" className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ff9f0a] text-black"><Plus className="h-4 w-4"/></button></div>
        <div className="overflow-hidden rounded-[18px] bg-[#17181b]">{alarms.length ? alarms.slice().sort((a,b) => a.time.localeCompare(b.time)).map((alarm, index) => <div key={alarm.id} className={`flex items-center gap-3 px-4 py-3 ${index ? '' : ''}`}><div className="min-w-0 flex-1"><p className={`font-mono text-[27px] leading-8 tabular-nums ${alarm.enabled ? 'text-white' : 'text-white/35'}`}>{alarm.time}</p><p className="mt-0.5 text-xs text-white/40">{alarm.label}{alarm.repeatDaily ? ' · Diario' : ''}</p></div><button type="button" role="switch" aria-checked={alarm.enabled} aria-label={`Activar ${alarm.label}`} onClick={() => setAlarms((current) => current.map((item) => item.id !== alarm.id ? item : { ...item, enabled: !item.enabled, nextAt: !item.enabled ? (() => { const next = new Date(); const [h,m] = item.time.split(':').map(Number); next.setHours(h,m,0,0); if (next.getTime() <= Date.now()) next.setDate(next.getDate()+1); return next.getTime(); })() : item.nextAt }))} className={`relative h-[28px] w-[48px] rounded-full transition-colors ${alarm.enabled ? 'bg-[#30d158]' : 'bg-[#25262a]/20'}`}><span className={`absolute top-[2px] h-6 w-6 rounded-full bg-white shadow transition-transform ${alarm.enabled ? 'translate-x-[20px]' : 'translate-x-[2px]'}`}/></button><button type="button" onClick={() => setAlarms((current) => current.filter((item) => item.id !== alarm.id))} aria-label="Eliminar alarma" className="p-1 text-white/35"><Trash2 className="h-4 w-4"/></button></div>) : <p className="px-4 py-5 text-sm text-white/40">No tienes alarmas guardadas.</p>}</div>
        {alarmComposer && <div className="mt-4 rounded-[22px] bg-[#202125] p-4"><div className="mb-3 flex items-center justify-between"><h3 className="font-semibold">Nueva alarma</h3><button onClick={() => setAlarmComposer(false)} className="text-sm text-[#ff9f0a]">Cancelar</button></div><input type="time" value={alarmTime} onChange={(event) => setAlarmTime(event.target.value)} className="w-full rounded-2xl bg-black/30 px-4 py-3 font-mono text-3xl text-white outline-none [color-scheme:dark]"/><input value={alarmLabel} onChange={(event) => setAlarmLabel(event.target.value)} maxLength={48} placeholder="Etiqueta" className="mt-3 w-full rounded-xl bg-black/25 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/35"/><label className="mt-3 flex items-center justify-between text-sm text-white/75">Repetir cada día<input type="checkbox" checked={alarmRepeats} onChange={(event) => setAlarmRepeats(event.target.checked)} className="h-5 w-5 accent-[#ff9f0a]"/></label><button type="button" onClick={createAlarm} className="mt-4 h-11 w-full rounded-full bg-[#ff9f0a] text-sm font-semibold text-black">Guardar alarma</button></div>}
      </div>}
      {active === 'reminders' && <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 pt-2">
        <div className="mb-5 grid grid-cols-2 gap-3">{reminderGroups.map((group) => { const Icon = group.icon; const selected = reminderFilter === group.id; return <button key={group.id} type="button" onClick={() => setReminderFilter(group.id)} className={`flex min-h-[108px] flex-col justify-between rounded-[21px] bg-[#25262a] p-4 text-left transition-transform active:scale-[.98] ${selected ? 'brightness-110' : ''}`}><div className="flex w-full items-center justify-between"><span className="flex h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: `${group.color}24`, color: group.color }}><Icon className="h-[18px] w-[18px]"/></span><span className="text-[22px] font-semibold leading-none tabular-nums text-white/90">{group.items.length}</span></div><span className="block text-[13px] font-semibold leading-4 text-white/80">{group.label}</span></button>; })}</div>
        <div className="mb-3 flex min-h-11 items-center justify-between gap-3"><div className="min-w-0"><h3 className="truncate text-[17px] font-semibold leading-5 tracking-tight">{reminderGroups.find((group) => group.id === reminderFilter)?.label || 'Todos'}</h3><p className="mt-1 text-[11px] leading-4 text-white/40">{visibleReminderItems.length} {visibleReminderItems.length === 1 ? 'recordatorio' : 'recordatorios'}</p></div><button type="button" onClick={() => { openReminderComposer(); }} aria-label="Nuevo recordatorio" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0a84ff] text-white"><Plus className="h-[18px] w-[18px]"/></button></div>
        <div className="flex flex-col gap-2">{visibleReminderItems.length ? visibleReminderItems.map((item) => <div key={item.id} className="flex min-h-[66px] items-center gap-3 rounded-[17px] bg-[#25262a] px-3.5 py-3"><button type="button" onClick={() => setReminders((current) => current.map((entry) => entry.id === item.id ? { ...entry, completed: !entry.completed } : entry))} aria-label={item.completed ? 'Reabrir recordatorio' : 'Completar recordatorio'} className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full ${item.completed ? 'bg-[#30d158] text-black' : 'bg-white/[.1] text-transparent'}`}>{item.completed && <Check className="h-3 w-3"/>}</button><div className="min-w-0 flex-1"><p className={`break-words text-[14px] leading-[19px] ${item.completed ? 'text-white/40 line-through' : 'font-medium text-white/90'}`}>{item.title}</p>{item.notes && <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-white/45">{item.notes}</p>}<div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] leading-4 text-white/40">{item.dueAt ? <span className="flex items-center gap-1"><Clock3 className="h-3 w-3 shrink-0"/>{dateLabel(item.dueAt)}</span> : <span>Sin fecha</span>}{item.priority && item.priority !== 'normal' && <span className={`flex items-center gap-1 ${item.priority === 'urgent' ? 'text-[#ff6961]' : 'text-[#ffb347]'}`}><Flag className="h-3 w-3"/>{item.priority === 'urgent' ? 'Urgente' : 'Importante'}</span>}</div></div><button type="button" onClick={() => setReminders((current) => current.filter((entry) => entry.id !== item.id))} aria-label="Eliminar recordatorio" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/35"><Trash2 className="h-4 w-4"/></button></div>) : <div className="rounded-[18px] bg-[#25262a] px-4 py-7 text-center"><span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[#30d158]/15 text-[#30d158]"><Check className="h-5 w-5"/></span><p className="mt-3 text-sm font-medium text-white/80">Todo al día</p><p className="mt-1 text-xs text-white/40">Los recordatorios de esta lista aparecerán aquí.</p></div>}</div>
      </div>}
      {active === 'calendar' && <div className="relative min-h-0 flex-1 overflow-hidden px-5 pt-1">
        <div className="h-full overflow-y-auto overscroll-contain pb-32 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="mb-3 flex items-center justify-between"><p className="text-[11px] font-medium text-white/40">{new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' }).format(selectedCalendarDate)}</p><div className="flex gap-1"><button type="button" aria-label="Semana anterior" onClick={() => { const date = new Date(selectedCalendarDate); date.setDate(date.getDate() - 7); selectCalendarDate(date); }} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[.06] text-white/55"><ChevronLeft className="h-4 w-4"/></button><button type="button" aria-label="Semana siguiente" onClick={() => { const date = new Date(selectedCalendarDate); date.setDate(date.getDate() + 7); selectCalendarDate(date); }} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[.06] text-white/55"><ChevronRight className="h-4 w-4"/></button></div></div>
          <div className="mb-5 grid grid-cols-7 gap-1">{weekDates.map((date) => { const key = dayKey(date); const isSelected = key === selectedDay; const isToday = key === dayKey(new Date()); const hasEvents = reminders.some((item) => item.dueAt && dayKey(new Date(item.dueAt)) === key); return <button key={key} type="button" onClick={() => selectCalendarDate(date)} className={`flex min-w-0 flex-col items-center gap-1.5 rounded-[18px] py-2 transition-colors ${isSelected ? 'bg-[#292a2e]' : 'bg-transparent hover:bg-white/[.04]'}`}><span className="text-[9px] font-medium uppercase leading-none text-white/40">{new Intl.DateTimeFormat('es-MX', { weekday: 'short' }).format(date).replace('.', '')}</span><span className={`flex h-8 w-8 items-center justify-center rounded-full text-[13px] tabular-nums ${isSelected ? 'bg-[#3a3b40] font-semibold text-white' : 'text-white/75'}`}>{date.getDate()}</span><span className={`h-1 w-1 rounded-full ${hasEvents ? 'bg-[#ff9f0a]' : isToday ? 'bg-[#ff5b52]' : 'bg-transparent'}`}/></button>; })}</div>
          <div className="mb-3 flex items-end justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-white/35">Agenda</p><h3 className="mt-1 text-[17px] font-semibold leading-5">{new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }).format(selectedCalendarDate)}</h3></div><span className="pb-0.5 text-[10px] text-white/35">{selectedReminders.length} {selectedReminders.length === 1 ? 'evento' : 'eventos'}</span></div>
          <motion.div key={selectedDay} initial={{ opacity: .45, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .2 }} className="flex flex-col">{selectedReminders.length ? selectedReminders.map((item) => <div key={item.id} className="flex min-h-[52px] items-center gap-3 py-2"><button type="button" onClick={() => setReminders((current) => current.map((entry) => entry.id === item.id ? { ...entry, completed: !entry.completed } : entry))} aria-label={item.completed ? 'Reabrir evento' : 'Completar evento'} className={`flex h-[17px] w-[17px] shrink-0 items-center justify-center rounded-full ${item.completed ? 'bg-[#30d158] text-black' : 'bg-white/[.08] text-transparent'}`}>{item.completed && <Check className="h-3 w-3"/>}</button><div className="min-w-0 flex-1"><p className={`truncate text-[13px] leading-[18px] ${item.completed ? 'text-white/35 line-through' : 'font-medium text-white/85'}`}>{item.title}</p>{item.notes && <p className="mt-0.5 truncate text-[10px] text-white/35">{item.notes}</p>}</div><span className="shrink-0 pl-2 text-[10px] tabular-nums text-white/35">{new Date(item.dueAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</span></div>) : <div className="py-8 text-center"><p className="text-[13px] text-white/50">Sin eventos para este día</p><p className="mt-1 text-[11px] text-white/30">Añade uno con el botón +</p></div>}</motion.div>
        </div>
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-32" style={{ background: 'linear-gradient(to top, rgba(17,18,20,.98) 0%, rgba(17,18,20,.72) 40%, rgba(17,18,20,0) 100%)', backdropFilter: 'blur(15px)', WebkitBackdropFilter: 'blur(15px)', maskImage: 'linear-gradient(to top, black 12%, rgba(0,0,0,.82) 48%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to top, black 12%, rgba(0,0,0,.82) 48%, transparent 100%)' }}/>
        <div ref={calendarQuickAddRef} className="absolute bottom-[max(14px,env(safe-area-inset-bottom))] left-1/2 z-20 flex -translate-x-1/2 items-center justify-center">
          <AnimatePresence mode="wait" initial={false}>{calendarQuickAddOpen ? <motion.div key="calendar-inline-add" initial={{ opacity: 0, scale: .88, width: 48 }} animate={{ opacity: 1, scale: 1, width: 'min(390px, calc(100vw - 70px))' }} exit={{ opacity: 0, scale: .9, width: 48 }} transition={{ type: 'spring', damping: 25, stiffness: 320 }} className="flex h-[50px] items-center gap-2 rounded-full bg-[#25262a] p-1.5 pl-4 shadow-[0_8px_28px_rgba(0,0,0,.4)]"><input autoFocus value={calendarQuickTitle} onChange={(event) => setCalendarQuickTitle(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') createCalendarEvent(); if (event.key === 'Escape') { setCalendarQuickAddOpen(false); setCalendarQuickTitle(''); } }} placeholder="Nuevo evento" aria-label="Nombre del evento" className="calendar-event-input min-w-0 flex-1 bg-transparent text-[13px] text-white outline-none placeholder:text-white/40"/><button type="button" disabled={!calendarQuickTitle.trim()} onClick={createCalendarEvent} aria-label="Guardar evento" className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-[#ff453a] text-white disabled:opacity-40"><Check className="h-[18px] w-[18px]"/></button></motion.div> : <motion.button key="calendar-add-button" type="button" initial={{ opacity: 0, scale: .75 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: .75 }} transition={{ type: 'spring', damping: 22, stiffness: 340 }} onClick={() => setCalendarQuickAddOpen(true)} aria-label="Añadir evento" className="flex h-12 w-12 items-center justify-center rounded-full bg-[#303136] text-white/75 shadow-[0_8px_28px_rgba(0,0,0,.4)]"><Plus className="h-[19px] w-[19px]"/></motion.button>}</AnimatePresence>
        </div>
      </div>}      {(ringingAlarm || dueReminder) && <div className="absolute inset-0 z-[150] grid place-items-center bg-black/60 p-5 backdrop-blur-sm"><div className="w-full max-w-sm rounded-[26px] bg-[#242528] p-6 text-center text-white shadow-2xl"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#ff9f0a]/15 text-[#ff9f0a]"><Bell className="h-6 w-6"/></span><h3 className="mt-4 text-xl font-bold">{ringingAlarm ? ringingAlarm.label : dueReminder.title}</h3><p className="mt-1 text-sm text-white/45">{ringingAlarm ? 'Es hora de tu alarma' : 'Recordatorio pendiente'}</p><div className="mt-5 flex gap-2">{ringingAlarm && <button type="button" onClick={() => { setAlarms((current) => current.map((item) => item.id === ringingAlarm.id ? { ...item, enabled: true, nextAt: Date.now()+5*60_000 } : item)); setRingingAlarm(null); }} className="h-11 flex-1 rounded-full bg-white/[.08] text-sm font-semibold text-[#ff9f0a]">Posponer 5 min</button>}<button type="button" onClick={() => { if (ringingAlarm) setRingingAlarm(null); if (dueReminder) { setReminders((current) => current.map((item) => item.id === dueReminder.id ? { ...item, completed: true } : item)); setDueReminder(null); } }} className="h-11 flex-1 rounded-full bg-[#ff9f0a] text-sm font-semibold text-black">Listo</button></div></div></div>}
      {dueReminder && !ringingAlarm && <div className="sr-only" aria-live="assertive">Recordatorio: {dueReminder.title}</div>}
    </motion.section>
    <AnimatePresence>
      {reminderComposer && (active === 'reminders' || active === 'calendar') && <motion.button type="button" aria-label="Salir de recordatorios" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeReminderComposer} className="fixed inset-0 z-[159] bg-black/55 backdrop-blur-[3px]"/>}
      {reminderComposer && (active === 'reminders' || active === 'calendar') && <motion.section data-lgn-reminder-composer data-desktop-sheet="popup" role="dialog" aria-modal="true" aria-labelledby="lgn-reminder-composer-title" initial={{ y: '100%', opacity: .8 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '100%', opacity: .8 }} transition={{ type: 'spring', damping: 30, stiffness: 310 }} className="fixed inset-x-[10px] bottom-[10px] z-[160] mx-auto flex max-h-[min(70dvh,560px)] min-h-[280px] w-[calc(100%-20px)] max-w-[560px] flex-col overflow-hidden rounded-[30px] bg-[#1c1d20] p-5 text-white shadow-[0_20px_80px_rgba(0,0,0,.6)]">
          <header className="relative z-10 mb-4 flex shrink-0 items-center justify-between"><div><button type="button" onClick={() => setReminderListMenuOpen((open) => !open)} aria-expanded={reminderListMenuOpen} className="flex items-center gap-1 text-[17px] font-semibold text-[#ff9f0a]"><span>Recordatorios</span><ChevronDown className={`h-4 w-4 transition-transform ${reminderListMenuOpen ? 'rotate-180' : ''}`}/></button><h2 id="lgn-reminder-composer-title" className="mt-1 text-[12px] text-white/45">Nuevo recordatorio</h2></div><button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); closeReminderComposer(); }} data-sheet-close aria-label="Cerrar y salir" className="pointer-events-auto relative z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/[.12] text-white/80"><X className="h-4 w-4"/></button>
            {reminderListMenuOpen && <div className="absolute left-0 top-[48px] z-20 w-56 overflow-hidden rounded-[18px] bg-[#303136] p-1 shadow-xl">{[{ id: 'none', label: 'Mis recordatorios' }, { id: 'today', label: 'Hoy' }, { id: 'scheduled', label: 'Programado' }].map((option) => <button key={option.id} type="button" onClick={() => selectReminderSchedule(option.id)} className="flex h-10 w-full items-center rounded-[13px] px-3 text-left text-sm text-white/85 hover:bg-white/[.08]">{option.label}</button>)}</div>}
          </header>
          <div ref={reminderComposerScrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <div data-lgn-reminder-pill className="rounded-[23px] bg-[#292a2e] p-4"><div className="flex items-start gap-3"><span aria-hidden="true" className="mt-[9px] h-[18px] w-[18px] shrink-0 rounded-full bg-white/[.12]"/><div className="min-w-0 flex-1"><input autoFocus value={reminderTitle} onChange={(event) => setReminderTitle(event.target.value)} maxLength={100} placeholder="Nuevo recordatorio" className="reminder-composer-input h-9 w-full bg-transparent text-[15px] font-medium text-white outline-none placeholder:text-white/45"/><textarea value={reminderNotes} onChange={(event) => setReminderNotes(event.target.value)} maxLength={500} rows={2} placeholder="Notas" className="reminder-composer-input mt-1 w-full resize-none bg-transparent text-[13px] leading-5 text-white/65 outline-none placeholder:text-white/35"/></div></div></div>
            {reminderDateVisible && <div className="mt-3 flex items-center gap-3 rounded-full bg-[#292a2e] px-4 py-2"><CalendarDays className="h-4 w-4 shrink-0 text-[#ff9f0a]"/><label className="min-w-0 flex-1"><span className="sr-only">Fecha límite</span><input type="date" value={reminderDueDate} onChange={(event) => setReminderDueDate(event.target.value)} className="reminder-composer-input h-9 w-full min-w-0 text-[13px] text-white/80 outline-none [color-scheme:dark]"/></label><button type="button" aria-label="Quitar fecha" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.preventDefault(); event.stopPropagation(); setReminderDueDate(''); setReminderDateVisible(false); }} className="relative z-10 flex h-8 w-8 shrink-0 touch-manipulation items-center justify-center rounded-full bg-white/[.08] text-white/65 pointer-events-auto"><X className="h-3.5 w-3.5"/></button></div>}
            {reminderTimeVisible && <div className="mt-2 flex items-center gap-3 rounded-full bg-[#292a2e] px-4 py-2"><Clock3 className="h-4 w-4 shrink-0 text-[#ff9f0a]"/><label className="min-w-0 flex-1"><span className="sr-only">Hora límite</span><input type="time" value={reminderDueTime} onChange={(event) => setReminderDueTime(event.target.value)} className="reminder-composer-input h-9 w-full min-w-0 text-[13px] text-white/80 outline-none [color-scheme:dark]"/></label><button type="button" aria-label="Quitar hora" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.preventDefault(); event.stopPropagation(); setReminderDueTime(''); setReminderTimeVisible(false); }} className="relative z-10 flex h-8 w-8 shrink-0 touch-manipulation items-center justify-center rounded-full bg-white/[.08] text-white/65 pointer-events-auto"><X className="h-3.5 w-3.5"/></button></div>}
          </div>
          <footer className="relative z-20 mt-4 flex shrink-0 items-center justify-between gap-3"><div className="pointer-events-auto flex h-12 items-center gap-1 rounded-full bg-[#292a2e] px-2"><button type="button" onClick={() => { const opening = !reminderDateVisible; setReminderDateVisible(opening); if (opening && !reminderDueDate) setReminderDueDate(dayKey(new Date())); }} aria-label="Elegir fecha límite" aria-pressed={reminderDateVisible} title="Elegir fecha límite" className={`flex h-9 w-9 touch-manipulation items-center justify-center rounded-full ${reminderDateVisible ? 'bg-white/[.12] text-[#ff9f0a]' : 'text-white/65'}`}><CalendarDays className="h-[18px] w-[18px]"/></button><button type="button" onClick={() => { const opening = !reminderTimeVisible; setReminderTimeVisible(opening); if (opening) { if (!reminderDueDate) setReminderDueDate(dayKey(new Date())); if (!reminderDueTime) { const due = new Date(Date.now() + 60 * 60 * 1000); setReminderDueTime(`${String(due.getHours()).padStart(2, '0')}:${String(due.getMinutes()).padStart(2, '0')}`); } } }} aria-label="Elegir hora límite" aria-pressed={reminderTimeVisible} title="Elegir hora límite" className={`flex h-9 w-9 touch-manipulation items-center justify-center rounded-full ${reminderTimeVisible ? 'bg-white/[.12] text-[#ff9f0a]' : 'text-white/65'}`}><Clock3 className="h-[18px] w-[18px]"/></button><button type="button" onClick={() => setReminderPriority((value) => value === 'normal' ? 'high' : 'normal')} aria-label={reminderPriority === 'high' ? 'Quitar prioridad importante' : 'Marcar como importante'} aria-pressed={reminderPriority === 'high'} title={reminderPriority === 'high' ? 'Importante · pulsa para quitar' : 'Marcar como importante'} className={`flex h-9 w-9 touch-manipulation items-center justify-center rounded-full ${reminderPriority === 'high' ? 'bg-[#ff9f0a]/15 text-[#ff9f0a]' : 'text-white/65'}`}><Flag className="h-[18px] w-[18px]"/></button></div><button type="button" disabled={!reminderTitle.trim()} onClick={createReminder} aria-label="Guardar recordatorio" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#f2f2f7] text-[#25262a] shadow-sm disabled:opacity-35"><Check className="h-5 w-5"/></button></footer>
        </motion.section>}
    </AnimatePresence>
  </>;
}

function QuickNotesSheet({ onClose }) {
  const [notes, setNotes] = useState(readQuickNotes);
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState('');
  const [color, setColor] = useState(NOTE_COLORS[0].value);
  const canvasRef = useRef(null);

  useEffect(() => {
    try { localStorage.setItem(QUICK_NOTES_KEY, JSON.stringify(notes)); } catch { /* Keep editing available if storage is full. */ }
  }, [notes]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const cornerKit = new CornerKit();
      cornerKit.applyAll('[data-lgn-notes-sheet]', { radius: 30, smoothing: 1 });
      cornerKit.applyAll('[data-lgn-sticky-note]', { radius: 18, smoothing: 1 });
    }, 40);
    return () => window.clearTimeout(timer);
  }, [notes.length]);

  const beginNew = () => { setEditingId(null); setDraft(''); setColor(NOTE_COLORS[0].value); setComposerOpen(true); };
  const editNote = (note) => { setEditingId(note.id); setDraft(note.text); setColor(note.color); setComposerOpen(true); };
  const saveNote = () => {
    const text = draft.trim();
    if (!text) return;
    if (editingId) setNotes((current) => current.map((note) => note.id === editingId ? { ...note, text, color, updatedAt: Date.now() } : note));
    else {
      const bounds = canvasRef.current;
      const index = notes.length;
      setNotes((current) => [...current, { id: (globalThis.crypto?.randomUUID?.() || `note-${Date.now()}`), text, color, x: (bounds?.scrollLeft || 0) + 28 + (index % 2) * 226, y: (bounds?.scrollTop || 0) + 28 + (index % 3) * 212, updatedAt: Date.now() }]);
    }
    setComposerOpen(false);
  };

  return <>
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[139] bg-black/60 backdrop-blur-sm"/>
    <motion.section data-lgn-notes-sheet data-desktop-sheet="side-right" role="dialog" aria-modal="false" aria-labelledby="lgn-notes-title" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }} className="pointer-events-auto fixed inset-x-[5px] bottom-[5px] z-[140] mx-auto flex h-[min(82dvh,760px)] max-w-[720px] flex-col overflow-hidden rounded-[30px] bg-[#1c1d20] text-white shadow-2xl">
      <header className="relative z-10 flex shrink-0 items-center justify-between gap-3 border-b border-white/[.07] px-5 pb-3 pt-4"><div className="min-w-0"><h2 id="lgn-notes-title" className="text-lg font-bold">Cuaderno</h2><p className="mt-0.5 text-[11px] text-white/45">{notes.length} {notes.length === 1 ? 'nota adhesiva' : 'notas adhesivas'}</p></div><button type="button" onClick={onClose} data-sheet-close aria-label="Cerrar cuaderno" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[.08] text-white/80 transition-colors hover:bg-white/[.14]"><X className="h-4 w-4"/></button></header>
      <div ref={canvasRef} className="relative min-h-0 flex-1 touch-pan-x touch-pan-y overflow-auto overscroll-contain" style={{ backgroundColor: '#202124', backgroundImage: 'radial-gradient(rgba(255,255,255,.17) 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
        <div className="relative min-h-[1500px] min-w-[1600px]" style={{ width: '1600px', height: '1500px' }}>
          {!notes.length && <div className="absolute left-5 top-5 max-w-[240px] rounded-2xl bg-black/35 px-4 py-3 text-sm text-white/55 backdrop-blur-md">Tu lienzo está listo. Añade una nota para empezar tu cuaderno.</div>}
          {notes.map((note) => <article key={note.id} data-lgn-sticky-note className="absolute h-[188px] w-[204px] overflow-hidden rounded-[18px] p-3 text-[#242326] shadow-[0_8px_24px_rgba(0,0,0,.25)]" style={{ left: note.x, top: note.y, backgroundColor: note.color }}>
            <div className="mb-2 flex items-center justify-between"><span className="text-[9px] font-semibold uppercase tracking-[.12em] opacity-45">Apunte</span><button type="button" onClick={() => setNotes((current) => current.filter((item) => item.id !== note.id))} aria-label="Eliminar nota" className="flex h-7 w-7 items-center justify-center rounded-full bg-black/[.06] text-black/55 hover:bg-black/[.12]"><X className="h-3.5 w-3.5"/></button></div>
            <button type="button" onClick={() => editNote(note)} className="h-[138px] w-full overflow-hidden whitespace-pre-wrap break-words text-left text-[14px] leading-relaxed text-[#242326]/90">{note.text}</button>
          </article>)}
        </div>
      </div>
      {!composerOpen && <><div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-36" style={{ background: 'linear-gradient(to top, rgba(28,29,32,.96) 0%, rgba(28,29,32,.68) 42%, rgba(28,29,32,0) 100%)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', maskImage: 'linear-gradient(to top, black 8%, rgba(0,0,0,.78) 42%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to top, black 8%, rgba(0,0,0,.78) 42%, transparent 100%)' }}/><button type="button" onClick={beginNew} className="quick-notes-add-pill absolute bottom-[max(16px,env(safe-area-inset-bottom))] left-1/2 z-20 flex h-11 min-w-[188px] -translate-x-1/2 items-center justify-center gap-2 rounded-full px-5 text-sm font-bold shadow-lg transition-transform active:scale-[.98]" style={{ background: '#ffffff', backgroundColor: '#ffffff', borderRadius: '9999px', color: '#111111', opacity: 1 }}><span className="material-symbols-rounded text-[19px] leading-none">add</span>Añadir nota</button></>}
      {composerOpen && <footer className="z-20 shrink-0 border-t border-white/[.07] bg-[#1c1d20]/95 px-4 pb-[max(10px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl">
        <div className="mx-auto max-w-xl">
          <div className="mb-2 flex items-center justify-between"><p className="text-sm font-semibold">{editingId ? 'Editar apunte' : 'Nueva nota'}</p><button type="button" onClick={() => setComposerOpen(false)} className="text-xs font-medium text-white/50">Cancelar</button></div>
          <textarea autoFocus value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={1200} placeholder="Escribe una idea, recordatorio o pensamiento…" className="h-28 w-full resize-none rounded-2xl bg-white/[.07] p-3 text-sm leading-relaxed text-white outline-none placeholder:text-white/35 focus:ring-1 focus:ring-white/20"/>
          <div className="mt-2 flex flex-col gap-2"><div className="flex max-w-full items-center gap-2 overflow-x-auto py-1" aria-label="Color de nota">{NOTE_COLORS.map((item) => <button key={item.value} type="button" onClick={() => setColor(item.value)} aria-label={item.name} aria-pressed={color === item.value} className="h-6 w-6 shrink-0 rounded-full transition-colors" style={{ backgroundColor: item.value, border: color === item.value ? '2px solid #fff' : '1px solid rgba(255,255,255,.18)', boxShadow: color === item.value ? 'inset 0 0 0 1px rgba(0,0,0,.45)' : 'none' }}/>)}</div><button type="button" disabled={!draft.trim()} onClick={saveNote} className="flex h-10 w-full items-center justify-center gap-2 rounded-full px-5 text-sm font-bold shadow-sm disabled:opacity-40" style={{ background: '#ffffff', backgroundColor: '#ffffff', color: '#111111', borderRadius: '9999px' }}><Check className="h-4 w-4"/>{editingId ? 'Guardar nota' : 'Añadir nota'}</button></div>
        </div>
      </footer>}
    </motion.section>
  </>;
}

const BAR_H = 46;
const IDLE_W = 320;
const OPEN_W = 480;
const SEARCH_IDLE_W = 62;

/* ---------- The navbar ---------- */
export function BottomNav({ activeTab, onChangeTab, onOpenSearch, onCloseSearch, onOpenProfile, onSelectBusiness, profilePicture, profileName, timerEndAt, onStartTimer, onPauseTimer, onResumeTimer, onStopTimer, searchQuery: externalSearchQuery, searchOpen: externalSearchOpen }) {
  const onChange = (id) => onChangeTab(({ home: 'inicio', explore: 'explorar' })[id] || id);
  const onSearchOpenChange = (open) => open ? onOpenSearch() : onCloseSearch();
  const avatarSrc = profilePicture;
  const menuItems = DEFAULT_MENU;
  const onMenuSelect = (id) => onChangeTab(id);
  const appTab = ({ inicio: 'home', explorar: 'explore' })[activeTab] || activeTab;
  const onSearch = (query) => window.dispatchEvent(new CustomEvent('appSearchQuery', { detail: query }));
  const inputRef = useRef(null);
  const menuRef = useRef(null);
  const browseRef = useRef(null);
  const desktopActionsRef = useRef(null);

  const [active, setActive] = useState(appTab);
  const [navDesign, setCurrentNavDesign] = useState<NavDesign>(getNavDesign);
  const experimentalNav = navDesign === 'experimental';
  const visibleTabs = experimentalNav
    ? [...TABS.slice(0, -1), { id: 'search', label: 'Search', icon: 'search' }, TABS[TABS.length - 1]]
    : TABS;
  const [moves, setMoves] = useState(0); // bumps on each tab switch to replay the stretch
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [timerPickerOpen, setTimerPickerOpen] = useState(false);
  const [timerNow, setTimerNow] = useState(Date.now());
  const [pickedMinutes, setPickedMinutes] = useState(15);
  const [timerPausedRemaining, setTimerPausedRemaining] = useState(null);
  const [timerNoticeDismissed, setTimerNoticeDismissed] = useState(false);
  const [stopwatchStartedAt, setStopwatchStartedAt] = useState(null);
  const [stopwatchElapsedBeforeRun, setStopwatchElapsedBeforeRun] = useState(0);
  const [stopwatchRunning, setStopwatchRunning] = useState(false);
  const [stopwatchLaps, setStopwatchLaps] = useState([]);
  const [stopwatchVisible, setStopwatchVisible] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [utilityOpen, setUtilityOpen] = useState(null);
  const [voiceSearchOpen, setVoiceSearchOpen] = useState(false);
  const [voiceSearchStatus, setVoiceSearchStatus] = useState('idle');
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceSearchError, setVoiceSearchError] = useState('');
  const voiceRecognitionRef = useRef(null);
  const voiceSubmittedRef = useRef(false);
  const voiceListeningRef = useRef(false);
  const voiceSessionRef = useRef(0);
  const voiceRestartTimerRef = useRef(null);
  const timerTouchStart = useRef(null);
  const timerRulerRef = useRef(null);
  const timerRulerDrag = useRef(null);
  const TIMER_TICK = 11;
  const TIMER_MAX_MINUTES = 180;
  const keyboard = useKeyboardOffset(searching);
  const timerActive = Number.isFinite(timerEndAt) || timerPausedRemaining !== null;
  const timerRemaining = timerPausedRemaining !== null ? timerPausedRemaining : Math.max(0, (timerEndAt || 0) - timerNow);
  const timerSeconds = Math.ceil(timerRemaining / 1000);
  const timerDisplay = `${String(Math.floor(timerSeconds / 60)).padStart(2, '0')}:${String(timerSeconds % 60).padStart(2, '0')}`;
  const timerVisible = timerActive && !timerNoticeDismissed;
  const stopwatchElapsed = stopwatchElapsedBeforeRun + (stopwatchRunning && stopwatchStartedAt ? Math.max(0, timerNow - stopwatchStartedAt) : 0);
  const stopwatchHasSession = stopwatchRunning || stopwatchElapsedBeforeRun > 0;
  const stopwatchDisplay = `${String(Math.floor(stopwatchElapsed / 60000)).padStart(2, '0')}:${String(Math.floor((stopwatchElapsed % 60000) / 1000)).padStart(2, '0')},${String(Math.floor((stopwatchElapsed % 1000) / 10)).padStart(2, '0')}`;
  useEffect(() => setActive(appTab), [appTab]);
  useEffect(() => {
    const refreshNavDesign = () => setCurrentNavDesign(getNavDesign());
    window.addEventListener('puntonochi-nav-design-updated', refreshNavDesign);
    window.addEventListener('storage', refreshNavDesign);
    return () => {
      window.removeEventListener('puntonochi-nav-design-updated', refreshNavDesign);
      window.removeEventListener('storage', refreshNavDesign);
    };
  }, []);
  useEffect(() => {
    if (externalSearchQuery !== undefined) setQuery(externalSearchQuery);
  }, [externalSearchQuery]);
  useEffect(() => {
    if (externalSearchOpen !== undefined) setSearching(externalSearchOpen);
  }, [externalSearchOpen]);
  useEffect(() => {
    if (!timerActive && !stopwatchRunning) return undefined;
    const tick = window.setInterval(() => setTimerNow(Date.now()), stopwatchRunning ? 100 : 1000);
    return () => window.clearInterval(tick);
  }, [timerActive, stopwatchRunning]);
  useEffect(() => {
    if (!timerVisible && !stopwatchVisible) return undefined;
    const timer = window.setTimeout(() => new CornerKit().applyAll('[data-lgn-live-card]', { radius: 28, smoothing: 1 }), 40);
    return () => window.clearTimeout(timer);
  }, [timerVisible, stopwatchVisible]);
  useEffect(() => {
    if (timerActive) setTimerNoticeDismissed(false);
  }, [timerEndAt, timerPausedRemaining !== null]);
  useEffect(() => {
    if (!timerPickerOpen) return undefined;
    const timer = window.setTimeout(() => new CornerKit().applyAll('[data-lgn-timer-sheet]', { radius: 28, smoothing: 1 }), 40);
    return () => window.clearTimeout(timer);
  }, [timerPickerOpen]);
  useEffect(() => {
    if (!timerPickerOpen) return undefined;
    const frame = window.requestAnimationFrame(() => { if (timerRulerRef.current) timerRulerRef.current.scrollLeft = pickedMinutes * TIMER_TICK; });
    return () => window.cancelAnimationFrame(frame);
  }, [timerPickerOpen]);
  const updateTimerRuler = () => {
    const ruler = timerRulerRef.current;
    if (ruler) setPickedMinutes(Math.max(1, Math.min(TIMER_MAX_MINUTES, Math.round(ruler.scrollLeft / TIMER_TICK))));
  };
  // while the menu is open the glass pill rests on the grid tab
  const visualActive = menuOpen ? "browse" : searching && experimentalNav ? "search" : active;
  const rawActiveIndex = visibleTabs.findIndex((t) => t.id === visualActive);
  const primaryTabSelected = rawActiveIndex >= 0;
  const index = Math.max(0, rawActiveIndex);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const timer = window.setTimeout(() => new CornerKit().applyAll('[data-lgn-menu-squircle]', { radius: 28, smoothing: 1 }), 40);
    return () => window.clearTimeout(timer);
  }, [menuOpen]);

  // close the menu on outside tap or Escape
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onDown = (e) => {
      const t = e.target;
      if (menuRef.current && menuRef.current.contains(t)) return;
      if (browseRef.current && browseRef.current.contains(t)) return;
      if (desktopActionsRef.current && desktopActionsRef.current.contains(t)) return;
      setMenuOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const closeVoiceSearch = () => {
    voiceListeningRef.current = false;
    voiceSessionRef.current += 1;
    voiceSubmittedRef.current = true;
    if (voiceRestartTimerRef.current) window.clearTimeout(voiceRestartTimerRef.current);
    voiceRestartTimerRef.current = null;
    try { voiceRecognitionRef.current?.abort?.(); } catch { /* Recognition may already be stopped. */ }
    voiceRecognitionRef.current = null;
    setVoiceSearchOpen(false);
    setVoiceSearchStatus('idle');
    setVoiceSearchError('');
  };
  const searchVoiceQuery = (rawQuery) => {
    const text = String(rawQuery || '').trim();
    if (!text) { setVoiceSearchError('Di qué lugar o servicio estás buscando.'); setVoiceSearchStatus('ready'); return; }
    setVoiceTranscript(text);
    setVoiceSearchStatus('processing');
    setVoiceSearchError('');
    closeVoiceSearch();
    onOpenSearch?.();
    window.setTimeout(() => onSearch(text), 0);
  };
  const startVoiceRecognition = (session) => {
    if (!voiceListeningRef.current || voiceSessionRef.current !== session) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      voiceListeningRef.current = false;
      setVoiceSearchStatus('error');
      setVoiceSearchError('Este navegador no admite búsqueda por voz. Escribe tu búsqueda abajo.');
      return;
    }
    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'es-MX';
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      voiceRecognitionRef.current = recognition;
      setVoiceSearchStatus('listening');
      recognition.onresult = (event) => {
        if (voiceSessionRef.current !== session || !voiceListeningRef.current) return;
        let finalText = '';
        let interimText = '';
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index];
          if (result.isFinal) finalText += result[0]?.transcript || '';
          else interimText += result[0]?.transcript || '';
        }
        const heard = (finalText || interimText).trim();
        if (heard) setVoiceTranscript(heard);
        if (finalText.trim() && !voiceSubmittedRef.current) {
          voiceSubmittedRef.current = true;
          voiceListeningRef.current = false;
          voiceSessionRef.current += 1;
          voiceRecognitionRef.current = null;
          void searchVoiceQuery(finalText);
        }
      };
      recognition.onerror = (event) => {
        if (voiceSessionRef.current !== session) return;
        voiceRecognitionRef.current = null;
        if (event.error === 'no-speech' || event.error === 'aborted') return;
        voiceListeningRef.current = false;
        setVoiceSearchStatus('error');
        setVoiceSearchError(event.error === 'not-allowed' ? 'Permite el acceso al micrófono para buscar por voz.' : 'No se pudo iniciar el micrófono. Inténtalo de nuevo o escribe tu búsqueda.');
      };
      recognition.onend = () => {
        if (voiceSessionRef.current !== session) return;
        voiceRecognitionRef.current = null;
        if (voiceListeningRef.current && !voiceSubmittedRef.current) {
          setVoiceSearchStatus('listening');
          voiceRestartTimerRef.current = window.setTimeout(() => startVoiceRecognition(session), 250);
        }
      };
      recognition.start();
    } catch {
      if (voiceSessionRef.current !== session) return;
      voiceRecognitionRef.current = null;
      voiceListeningRef.current = false;
      setVoiceSearchStatus('error');
      setVoiceSearchError('No se pudo iniciar el micrófono. Escribe tu búsqueda o inténtalo de nuevo.');
    }
  };
  const beginVoiceSearch = () => {
    setMenuOpen(false);
    setVoiceSearchOpen(true);
    setVoiceTranscript('');
    setVoiceSearchError('');
    voiceSubmittedRef.current = false;
    voiceListeningRef.current = true;
    const session = ++voiceSessionRef.current;
    startVoiceRecognition(session);
  };
  useEffect(() => {
    const openVoiceSearch = () => beginVoiceSearch();
    window.addEventListener('puntonochi-open-voice-search', openVoiceSearch);
    return () => window.removeEventListener('puntonochi-open-voice-search', openVoiceSearch);
  }, [beginVoiceSearch]);
  const toggleVoiceRecognition = () => {
    if (voiceListeningRef.current) {
      const recognition = voiceRecognitionRef.current;
      voiceListeningRef.current = false;
      voiceSessionRef.current += 1;
      voiceSubmittedRef.current = true;
      if (voiceRestartTimerRef.current) window.clearTimeout(voiceRestartTimerRef.current);
      voiceRestartTimerRef.current = null;
      voiceRecognitionRef.current = null;
      try { recognition?.stop?.(); } catch { /* Recognition may already have ended. */ }
      if (voiceTranscript.trim()) void searchVoiceQuery(voiceTranscript);
      else { setVoiceSearchStatus('ready'); setVoiceSearchError('No escuché una búsqueda. Inténtalo de nuevo o escríbela.'); }
      return;
    }
    if (voiceSearchStatus !== 'processing') beginVoiceSearch();
  };

  const pickItem = (item) => {
    setMenuOpen(false);
    onMenuSelect && onMenuSelect(item.id);
  };

  const select = (id) => {
    if (id === 'profile') { setMenuOpen(false); onOpenProfile(); return; }
    if (id === 'search') { setMenuOpen(false); onSearchOpenChange(true); return; }
    setMenuOpen(false);
    if (id === active) return;
    setActive(id);
    setMoves((m) => m + 1);
    onChange && onChange(id);
  };

  const openSearch = () => {
    setMenuOpen(false);
    setSearching(true);
    // focus inside the tap so iOS brings the keyboard up
    inputRef.current && inputRef.current.focus({ preventScroll: true });
    onSearchOpenChange && onSearchOpenChange(true);
  };

  const closeSearch = () => {
    setSearching(false);
    setQuery("");
    onSearch("");
    inputRef.current && inputRef.current.blur();
    onSearchOpenChange && onSearchOpenChange(false);
  };

  const onInputKey = (e) => {
    if (e.key === "Enter") {
      onSearch && onSearch(query.trim());
      e.currentTarget.blur(); // dismiss keyboard, keep the bar open
    } else if (e.key === "Escape") {
      closeSearch();
    }
  };

  return (
    <nav
      aria-label="Primary"
      className={experimentalNav && !searching ? 'pn-progressive-mobile' : undefined}
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: experimentalNav ? 0 : keyboard
          ? `${keyboard + 10}px`
          : "calc(env(safe-area-inset-bottom, 0px) + 14px)",
        height: experimentalNav ? 'calc(62px + env(safe-area-inset-bottom, 0px))' : undefined,
        transition: experimentalNav ? 'none' : "bottom 250ms ease-out",
        display: experimentalNav ? 'block' : "flex",
        justifyContent: experimentalNav ? undefined : "center",
        padding: experimentalNav ? 0 : "0 14px",
        zIndex: 50,
        isolation: experimentalNav ? 'isolate' : undefined,
        overflow: 'visible',
        pointerEvents: "none",
      }}
    >
      <style>{CSS_TEXT}</style>
      <header className={`pn-desktop-topbar${experimentalNav ? ' pn-progressive-nav' : ''}`} aria-label="Navegación de PuntoNochi" style={{ position: 'fixed', inset: '0 0 auto', zIndex: 60, height: 64, alignItems: 'center', gap: 20, padding: '0 18px', background: experimentalNav ? 'transparent' : '#242526', borderBottom: experimentalNav ? 0 : '1px solid rgba(255,255,255,.08)', boxShadow: experimentalNav ? 'none' : '0 2px 12px rgba(0,0,0,.18)', pointerEvents: 'auto' }}>
        <div className="flex min-w-0 flex-[1.1] items-center gap-3">
          <button type="button" aria-label="Ir al inicio" title="Inicio" onClick={() => select('home')} className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#17181a] transition-transform active:scale-95">
            <img src="/pwa-192.png" alt="PuntoNochi" className="h-full w-full object-cover" />
          </button>
          <form role="search" onSubmit={(event) => event.preventDefault()} style={{ display: experimentalNav ? 'none' : undefined }} className="flex h-10 min-w-0 w-full max-w-[280px] items-center gap-2.5 rounded-full bg-[#3a3b3c] px-3.5 text-sm text-white/55 transition-colors focus-within:bg-[#454648]">
            <Search aria-hidden="true" className="h-[17px] w-[17px] shrink-0"/>
            <input
              type="search"
              value={query}
              placeholder="Buscar en PuntoNochi"
              aria-label="Buscar en PuntoNochi"
              autoComplete="off"
              onFocus={() => {
                if (searching) return;
                setMenuOpen(false);
                setSearching(true);
                onSearchOpenChange(true);
              }}
              onChange={(event) => { setQuery(event.target.value); onSearch(event.target.value); }}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.currentTarget.blur();
                  closeSearch();
                }
              }}
              className="search-input-fix min-w-0 flex-1 appearance-none border-0 bg-transparent p-0 text-[14px] text-white outline-none ring-0 focus:border-0 focus:bg-transparent focus:outline-none focus:ring-0 placeholder:text-white/55 [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden [&::-webkit-search-results-button]:hidden [&::-webkit-search-results-decoration]:hidden"
            />
            {query && <button type="button" aria-label="Borrar búsqueda" onClick={() => { setQuery(''); onSearch(''); }} className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white/65 hover:bg-white/10 hover:text-white"><X className="h-3.5 w-3.5"/></button>}
          </form>
        </div>
        <div className="flex h-full flex-[1.8] items-stretch justify-center gap-2">
          {([
            { id: 'home', tab: 'inicio', label: 'Inicio', Icon: Home },
            { id: 'explore', tab: 'explorar', label: 'Explorar', Icon: Compass },
            { id: 'videos', tab: 'videos', label: 'Mercado', Icon: Store },
            { id: 'noticias', tab: 'noticias', label: 'Noticias', Icon: Newspaper },
            { id: 'guias', tab: 'guias', label: 'Artículos', Icon: BookOpen },
          ] as const).map(({ id, tab, label, Icon }) => {
            const selected = activeTab === tab;
            return <button key={id} type="button" aria-label={label} aria-current={selected ? 'page' : undefined} title={label} onClick={() => select(id)} className={`relative flex min-w-[56px] max-w-[112px] flex-1 items-center justify-center text-white/60 transition-colors hover:text-white ${experimentalNav ? selected ? 'rounded-full bg-white/[.12] backdrop-blur-xl' : 'rounded-full bg-transparent' : ''} ${selected ? 'text-white' : ''}`}>
              <Icon aria-hidden="true" className="h-[23px] w-[23px]" strokeWidth={selected ? 2.25 : 1.8}/>
              {selected && !experimentalNav && <span className="absolute inset-x-1 bottom-0 h-[3px] rounded-t-full bg-[#6aa7ff]"/>}
            </button>;
          })}
        </div>
        <div className="flex flex-[1.1] items-center justify-end gap-2.5">
          <button ref={desktopActionsRef} type="button" onClick={() => { setMenuOpen(false); onSearchOpenChange(true); }} aria-label="Buscar" title="Buscar" className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${experimentalNav ? 'bg-white/[.08] text-white/85 backdrop-blur-xl hover:bg-white/[.14]' : 'bg-[#3a3b3c] text-white/80 hover:bg-[#4b4c4d]'}`}><Search className="h-[19px] w-[19px]"/></button>
          <button type="button" onClick={onOpenProfile} aria-label="Abrir perfil" title="Perfil" className={`flex h-10 w-10 items-center justify-center overflow-hidden rounded-full text-white/80 transition-colors ${experimentalNav ? 'bg-white/[.08] backdrop-blur-xl hover:bg-white/[.14]' : 'bg-[#3a3b3c] ring-2 ring-transparent hover:ring-white/20'}`}>
            {avatarSrc ? <img src={avatarSrc} alt={profileName || 'Perfil'} referrerPolicy="no-referrer" className="h-full w-full object-cover"/> : <UserRound aria-hidden="true" className="h-[21px] w-[21px]"/>}
          </button>
        </div>
      </header>
      <svg width="0" height="0" aria-hidden="true" style={{ position: "absolute" }}>
        <defs>
          <linearGradient id="lgn-glass" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="1" />
            <stop offset="1" stopColor="#fff" stopOpacity="0.78" />
          </linearGradient>
        </defs>
      </svg>

      {/* Row: grows from the center when search opens */}
      <div
        className="lgn-row"
        style={{
          position: "relative",
          zIndex: experimentalNav ? 1 : undefined,
          width: experimentalNav ? '100%' : searching ? OPEN_W : IDLE_W,
          maxWidth: experimentalNav ? 720 : "100%",
          height: experimentalNav ? '100%' : BAR_H,
          marginInline: experimentalNav ? 'auto' : undefined,
          transition: experimentalNav ? 'none' : `width 560ms ${EASE_OUT}`,
        }}
      >
        {/* Tab bar */}
        <div
          className="lgn-tabbar"
          role="tablist"
          aria-hidden={searching}
          style={{
            ...(experimentalNav ? { background: 'transparent', backdropFilter: 'none', WebkitBackdropFilter: 'none', boxShadow: 'none', isolation: 'auto', transform: 'none' } : darkGlass("rgba(58,50,46,0.20)")),
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            zIndex: 1,
            width: experimentalNav ? '100%' : `calc(100% - ${SEARCH_IDLE_W + 10}px)`,
            height: experimentalNav ? '100%' : BAR_H,
            padding: experimentalNav ? '7px 14px calc(7px + env(safe-area-inset-bottom, 0px))' : 3,
            gap: experimentalNav ? 5 : 0,
            borderRadius: experimentalNav ? 0 : 999,
            display: "flex",
            alignItems: "center",
            pointerEvents: searching ? "none" : "auto",
            opacity: searching ? 0 : 1,
            visibility: searching ? "hidden" : "visible",
            transform: searching ? "translateZ(0) scale(0.9)" : "translateZ(0) scale(1)",
            transformOrigin: "left center",
            transition: experimentalNav ? 'opacity 180ms ease' : searching
              ? `opacity 200ms ease, transform 420ms ${EASE_OUT}, visibility 0s linear 200ms`
              : `opacity 320ms ease 180ms, transform 520ms ${EASE_OUT} 120ms, visibility 0s`,
          }}
        >
          {/* Sliding glass pill */}
          <div
            className="lgn-slider"
            aria-hidden="true"
            style={{
              position: "absolute",
              top: 3,
              bottom: 3,
              left: 3,
              width: `calc((100% - 6px) / ${visibleTabs.length})`,
              transform: `translateX(${index * 100}%)`,
              opacity: primaryTabSelected ? 1 : 0,
              display: experimentalNav ? 'none' : undefined,
              transition: `opacity 180ms ease, transform 520ms ${EASE_OUT}`,
              pointerEvents: "none",
            }}
          >
            <div
              key={moves}
              className={`lgn-blob${moves ? " is-moving" : ""}`}
              style={{
                width: "100%",
                height: "100%",
                borderRadius: 999,
                background:
                  "radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.22), rgba(255,255,255,0.08) 65%)",
                boxShadow: "inset 0 0 14px rgba(255,255,255,0.08)",
              }}
            />
          </div>

          {visibleTabs.map(({ id, label, icon, avatar, menu }) => (
            <button
              key={id}
              className="lgn-tab"
              role="tab"
              ref={menu ? browseRef : undefined}
              aria-selected={visualActive === id}
              aria-haspopup={menu ? "menu" : undefined}
              aria-expanded={menu ? menuOpen : undefined}
              aria-label={label}
              tabIndex={searching ? -1 : 0}
              onClick={() => (menu ? setMenuOpen((o) => !o) : select(id))}
              style={{
                all: "unset",
                boxSizing: "border-box",
                position: "relative",
                cursor: "pointer",
                WebkitTapHighlightColor: "transparent",
                flex: 1,
                height: "100%",
                display: "grid",
                placeItems: "center",
                borderRadius: 999,
                marginInline: experimentalNav ? 2 : 0,
                isolation: 'isolate',
                background: 'transparent',
                color: "#fff",
              }}
            >
              {experimentalNav && visualActive === id && <motion.span layoutId="pn-bottom-nav-active-tab" initial={false} transition={{ type: 'spring', stiffness: 420, damping: 36, mass: .72 }} aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 rounded-full bg-white/[.17] backdrop-blur-[14px]" />}
              <span className="relative z-10">{avatar ? <Avatar src={avatarSrc} alt={label} timerActive={timerActive} /> : <Icon name={icon} />}</span>
            </button>
          ))}
        </div>

        {/* Floating glass shortcuts panel above the bar */}
        <div
          ref={menuRef}
          className="lgn-menu"
          role="menu"
          aria-label="Accesos rápidos"
          aria-hidden={!menuOpen}
          data-lgn-menu-squircle
          style={{
            ...darkGlass("rgba(38,32,28,0.34)"),
            backdropFilter: "blur(16px) saturate(190%) brightness(1.04)",
            WebkitBackdropFilter: "blur(16px) saturate(190%) brightness(1.04)",
            position: "fixed",
            zIndex: 51,
            left: 5,
            right: 5,
            bottom: keyboard
              ? `${keyboard + 10 + BAR_H + 15}px`
              : `calc(env(safe-area-inset-bottom, 0px) + ${14 + BAR_H + 15}px)`,
            width: "auto",
            maxWidth: 460,
            maxHeight: "min(68dvh, 520px)",
            overflowY: "auto",
            marginInline: "auto",
            padding: 12,
            borderRadius: 28,
            transformOrigin: "50% 100%",
            opacity: menuOpen && !searching ? 1 : 0,
            visibility: menuOpen && !searching ? "visible" : "hidden",
            pointerEvents: menuOpen && !searching ? "auto" : "none",
            transform:
              menuOpen && !searching
                ? "translateZ(0) translateY(0) scale(1)"
                : "translateZ(0) translateY(14px) scale(0.96)",
            transition:
              menuOpen && !searching
                ? `opacity 220ms ease, transform 480ms ${SPRING}, visibility 0s`
                : `opacity 140ms ease, transform 220ms ease, visibility 0s linear 220ms`,
          }}
        >
          <section aria-label="Más usados">
            <h2 className="mb-2 px-1 text-[10px] font-bold uppercase tracking-[.16em] text-white/45">Más usados</h2>
            <div className="grid grid-cols-2 gap-2">
              {menuItems.map((item) => <button key={item.id} className="flex min-h-[46px] items-center gap-2 px-2 py-1.5 rounded-[12px] bg-white/[.055] text-left text-white transition-colors hover:bg-white/[.11] active:bg-white/[.14]" role="menuitem" tabIndex={menuOpen ? 0 : -1} onClick={() => item.id === 'voice-search' ? beginVoiceSearch() : pickItem(item)}>
                <span className="flex h-7 w-7 shrink-0 items-center justify-center"><span aria-hidden="true" className="material-symbols-rounded text-[18px] leading-none">{item.icon}</span></span>
                <span className="text-[11px] font-semibold leading-tight">{item.label}</span>
              </button>)}
            </div>
          </section>
          <section aria-label="Organiza tu día" className="mt-4 pt-1">
            <h2 className="mb-2 px-1 text-[10px] font-bold uppercase tracking-[.16em] text-white/45">Organiza tu día</h2>
            <div className="grid grid-cols-2 gap-2">
              {COMING_SOON.map(({ label, symbol }) => label === 'Temporizador' ? <button key={label} type="button" onClick={() => { setMenuOpen(false); setTimerPickerOpen(true); }} className="flex min-h-[42px] items-center gap-2 rounded-[11px] bg-white/[.055] px-2 py-1 text-left text-white transition-colors hover:bg-white/[.11] active:bg-white/[.14]">
                <span aria-hidden="true" className={`material-symbols-rounded shrink-0 text-[15px] leading-none ${timerActive ? 'text-[#ffb347]' : 'text-white/70'}`}>{symbol}</span>
                <span className="min-w-0 flex-1"><span className="block text-[10px] font-semibold leading-tight">Temporizador</span><span className={`mt-0.5 block font-mono text-[9px] ${timerActive ? 'text-[#ffbd66]' : 'text-white/40'}`}>{timerActive ? `${timerDisplay} restante` : 'Elegir duración'}</span></span>
              </button> : label === 'Cronómetro' ? <button key={label} type="button" onClick={() => { setMenuOpen(false); setStopwatchVisible(true); if (!stopwatchHasSession) { setStopwatchElapsedBeforeRun(0); setStopwatchStartedAt(Date.now()); setStopwatchRunning(true); setStopwatchLaps([]); } }} className="flex min-h-[42px] items-center gap-2 rounded-[11px] bg-white/[.055] px-2 py-1 text-left text-white transition-colors hover:bg-white/[.11] active:bg-white/[.14]">
                <span aria-hidden="true" className={`material-symbols-rounded shrink-0 text-[15px] leading-none ${stopwatchHasSession ? 'text-[#ffb347]' : 'text-white/70'}`}>{symbol}</span><span className="min-w-0 flex-1"><span className="block text-[10px] font-semibold leading-tight">Cronómetro</span><span className="mt-0.5 block font-mono text-[9px] text-white/40">{stopwatchHasSession ? stopwatchDisplay : 'Iniciar'}</span></span>
              </button> : label === 'Notas rápidas' ? <button key={label} type="button" onClick={() => { setMenuOpen(false); setNotesOpen(true); }} className="flex min-h-[42px] items-center gap-2 rounded-[11px] bg-white/[.055] px-2 py-1 text-left text-white transition-colors hover:bg-white/[.11] active:bg-white/[.14]">
                <span aria-hidden="true" className="material-symbols-rounded shrink-0 text-[15px] leading-none text-white/70">{symbol}</span><span className="min-w-0 flex-1"><span className="block text-[10px] font-semibold leading-tight">Notas rápidas</span><span className="mt-0.5 block text-[8px] font-medium uppercase tracking-wider text-white/40">{readQuickNotes().length} notas</span></span>
              </button> : label === 'Alarmas' ? <button key={label} type="button" onClick={() => { setMenuOpen(false); setUtilityOpen('alarms'); }} className="flex min-h-[42px] items-center gap-2 rounded-[11px] bg-white/[.055] px-2 py-1 text-left text-white transition-colors hover:bg-white/[.11] active:bg-white/[.14]">
                <span aria-hidden="true" className="material-symbols-rounded shrink-0 text-[15px] leading-none text-white/70">{symbol}</span><span className="min-w-0 flex-1"><span className="block text-[10px] font-semibold leading-tight">Alarmas</span><span className="mt-0.5 block text-[8px] text-white/40">{readSavedList(ALARMS_KEY).filter((item) => item.enabled).length ? `${readSavedList(ALARMS_KEY).filter((item) => item.enabled).length} activas` : 'Crear alarma'}</span></span>
              </button> : label === 'Recordatorios' ? <button key={label} type="button" onClick={() => { setMenuOpen(false); setUtilityOpen('reminders'); }} className="flex min-h-[42px] items-center gap-2 rounded-[11px] bg-white/[.055] px-2 py-1 text-left text-white transition-colors hover:bg-white/[.11] active:bg-white/[.14]">
                <span aria-hidden="true" className="material-symbols-rounded shrink-0 text-[15px] leading-none text-white/70">{symbol}</span><span className="min-w-0 flex-1"><span className="block text-[10px] font-semibold leading-tight">Recordatorios</span><span className="mt-0.5 block text-[8px] text-white/40">{readSavedList(REMINDERS_KEY).filter((item) => !item.completed).length ? `${readSavedList(REMINDERS_KEY).filter((item) => !item.completed).length} pendientes` : 'Organiza tus tareas'}</span></span>
              </button> : label === 'Calendario' ? <button key={label} type="button" onClick={() => { setMenuOpen(false); setUtilityOpen('calendar'); }} className="flex min-h-[42px] items-center gap-2 rounded-[11px] bg-white/[.055] px-2 py-1 text-left text-white transition-colors hover:bg-white/[.11] active:bg-white/[.14]">
                <span aria-hidden="true" className="material-symbols-rounded shrink-0 text-[15px] leading-none text-white/70">{symbol}</span><span className="min-w-0 flex-1"><span className="block text-[10px] font-semibold leading-tight">Calendario</span><span className="mt-0.5 block text-[8px] text-white/40">Ver mes y eventos</span></span>
              </button> : null)}
            </div>
          </section>
        </div>

        {/* Search: oval pill that expands into the search bar */}
        <div
          className="lgn-search-wrap"
          role="search"
          style={{
            ...darkGlass("rgba(38,32,28,0.30)"),
            display: experimentalNav ? 'none' : undefined,
            position: "absolute",
            right: 0,
            top: 0,
            zIndex: 2,
            width: searching ? "100%" : SEARCH_IDLE_W,
            height: BAR_H,
            borderRadius: 999,
            transition: `width 560ms ${EASE_OUT}`,
          }}
        >
          {/* Text field (invisible until open, but always mounted so focus works in the tap) */}
          <div
            style={{
              position: "absolute",
              left: 48,
              right: 48,
              top: 0,
              bottom: 0,
              minWidth: 0,
              opacity: searching ? 1 : 0,
              pointerEvents: searching ? "auto" : "none",
              transition: searching ? "opacity 300ms ease 200ms" : "opacity 120ms ease",
            }}
          >
            <input
              ref={inputRef}
              className="lgn-input search-input-fix"
              type="text"
              value={query}
              placeholder="Search"
              aria-label="Search"
              tabIndex={searching ? 0 : -1}
              inputMode="search"
              enterKeyHint="search"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              style={{ background: "transparent", backgroundColor: "transparent", boxShadow: "none", WebkitBoxShadow: "none", boxSizing: "border-box", minWidth: 0 }}
              onChange={(e) => { setQuery(e.target.value); onSearch(e.target.value); }}
              onKeyDown={onInputKey}
            />
          </div>

          {/* Close button */}
          <button
            className="lgn-close"
            aria-label="Close search"
            tabIndex={searching ? 0 : -1}
            onClick={closeSearch}
            style={{
              appearance: "none",
              WebkitAppearance: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
              position: "absolute",
              right: 7,
              top: "50%",
              width: 32,
              height: 32,
              borderRadius: 999,
              display: "grid",
              placeItems: "center",
              color: "#fff",
              background: "radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.22), rgba(255,255,255,0.08) 65%)",
              opacity: searching ? 1 : 0,
              pointerEvents: searching ? "auto" : "none",
              transform: `translateY(-50%) scale(${searching ? 1 : 0.6})`,
              transition: searching
                ? `opacity 260ms ease 220ms, transform 480ms ${SPRING} 200ms`
                : "opacity 100ms ease, transform 200ms ease",
            }}
          >
            <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" style={{ display: "block" }}>
              <path d="M6 6 18 18M18 6 6 18" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
            </svg>
          </button>

          {/* Idle: whole pill is the open button */}
          <button
            className="lgn-open"
            aria-label="Search"
            aria-expanded={searching}
            tabIndex={searching ? -1 : 0}
            onClick={openSearch}
            style={{
              appearance: "none",
              WebkitAppearance: "none",
              border: "none",
              background: "transparent",
              padding: 0,
              position: "absolute",
              inset: 0,
              borderRadius: 999,
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
              pointerEvents: searching ? "none" : "auto",
            }}
          />

          {/* Search icon: centered when idle, glides to the left when open */}
          <div
            className="lgn-s-ico"
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              width: 22,
              display: "grid",
              placeItems: "center",
              left: searching ? 15 : (SEARCH_IDLE_W - 22) / 2,
              color: "#fff",
              pointerEvents: "none",
              transition: `left 560ms ${EASE_OUT}`,
            }}
          >
            <Icon name="search" />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {(timerVisible || stopwatchVisible) && <motion.section data-lgn-live-card role="group" aria-label={stopwatchVisible ? 'Cronómetro' : `Temporizador, ${timerDisplay} restante`} initial={{ opacity: 0, y: -24, scale: .96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -18, scale: .97 }} transition={{ type: 'spring', damping: 24, stiffness: 340 }} onTouchStart={(event) => { timerTouchStart.current = event.touches[0]?.clientY ?? null; }} onTouchEnd={(event) => { const start = timerTouchStart.current; const end = event.changedTouches[0]?.clientY; if (start !== null && end !== undefined && start - end > 35) { setTimerNoticeDismissed(true); setStopwatchVisible(false); } timerTouchStart.current = null; }} className="pointer-events-auto fixed left-[5px] right-[5px] top-[max(5px,env(safe-area-inset-top))] z-[120] mx-auto flex h-[112px] max-w-[520px] flex-col justify-between overflow-hidden rounded-[28px] bg-black px-4 py-3 text-white shadow-[0_8px_30px_rgba(0,0,0,.28)]">
          <div className="flex min-h-0 items-center justify-between gap-2"><button type="button" aria-label={stopwatchVisible ? 'Ocultar cronómetro' : 'Abrir temporizador'} onClick={() => stopwatchVisible ? setStopwatchVisible(false) : setTimerPickerOpen(true)} className="min-w-0 flex-1 text-left"><span className="block text-[11px] font-medium text-white/50">{stopwatchVisible ? 'Cronómetro' : 'Temporizador'}</span><motion.span key={stopwatchVisible ? stopwatchDisplay : timerDisplay} initial={{ opacity: .65, y: 3 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .18 }} className="block font-mono text-[29px] font-semibold leading-8 tabular-nums tracking-tight">{stopwatchVisible ? stopwatchDisplay : timerDisplay}</motion.span></button>
            <button type="button" onClick={() => stopwatchVisible ? setStopwatchRunning((running) => { if (running) { setStopwatchElapsedBeforeRun(stopwatchElapsed); setStopwatchStartedAt(null); return false; } setStopwatchStartedAt(Date.now()); return true; }) : timerPausedRemaining !== null ? (onResumeTimer?.(), setTimerPausedRemaining(null)) : (setTimerPausedRemaining(Math.max(0, (timerEndAt || 0) - Date.now())), onPauseTimer?.())} aria-label={stopwatchVisible ? (stopwatchRunning ? 'Pausar cronómetro' : 'Reanudar cronómetro') : (timerPausedRemaining !== null ? 'Reanudar temporizador' : 'Pausar temporizador')} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#ff9f0a]/20 text-[#ffb347]">{stopwatchVisible ? (stopwatchRunning ? <Pause className="h-4 w-4"/> : <Play className="h-4 w-4"/>) : timerPausedRemaining !== null ? <Play className="h-4 w-4"/> : <Pause className="h-4 w-4"/>}</button>
            <button type="button" onClick={() => stopwatchVisible ? (setStopwatchRunning(false), setStopwatchStartedAt(null), setStopwatchElapsedBeforeRun(0), setStopwatchLaps([]), setStopwatchVisible(false)) : (onStopTimer?.(), setTimerPausedRemaining(null), setTimerNoticeDismissed(true))} aria-label={stopwatchVisible ? 'Detener cronómetro' : 'Detener temporizador'} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#ff453a]/20 text-[#ff625a]"><X className="h-4 w-4"/></button>
          </div>
          {stopwatchVisible ? <div className="flex h-7 items-center gap-2"><div className="flex min-w-0 flex-1 gap-1 overflow-hidden">{stopwatchLaps.slice(-3).map((lap, index) => <span key={`${lap}-${index}`} className="truncate rounded-md bg-white/[.1] px-2 py-1 font-mono text-[10px] text-white/70">{lap}</span>)}</div><button type="button" disabled={!stopwatchRunning} onClick={() => setStopwatchLaps((laps) => [...laps, stopwatchDisplay])} className="flex h-7 items-center gap-1 rounded-md bg-white/[.12] px-3 text-[11px] font-medium disabled:opacity-40"><Flag className="h-3 w-3"/>Vuelta</button></div> : <div className="h-7" aria-hidden="true"/>}
        </motion.section>}
      </AnimatePresence>

      <AnimatePresence>
        {timerPickerOpen && <>
          <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[129] bg-black/45 backdrop-blur-sm"/>
          <motion.section data-lgn-timer-sheet data-desktop-sheet="popup" role="dialog" aria-modal="false" aria-labelledby="lgn-timer-title" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }} className="pointer-events-auto fixed inset-x-[5px] bottom-[5px] z-[130] mx-auto w-[calc(100%-10px)] max-w-[520px] overflow-hidden rounded-[28px] bg-black p-5 pb-[max(20px,env(safe-area-inset-bottom))] text-white shadow-2xl backdrop-blur-2xl">
            <div className="h-[env(safe-area-inset-top)]" aria-hidden="true"/><div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/25"/>
            <div className="relative -mt-1 flex min-h-12 items-start justify-between pr-10"><div><h2 id="lgn-timer-title" className="text-xl font-bold">{timerActive ? 'Temporizador activo' : '¿Cuánto tiempo?'}</h2></div><button type="button" onClick={() => setTimerPickerOpen(false)} data-sheet-close aria-label="Cerrar temporizador" className="absolute right-[-15px] top-[-15px] flex h-9 w-9 items-center justify-center rounded-full bg-white/[.1] p-2 text-white transition-colors hover:bg-white/[.16] active:bg-white/[.22]"><X className="h-4 w-4"/></button></div>
            {timerActive ? <><div className="py-6 text-center"><span className="font-mono text-6xl font-semibold tabular-nums tracking-tight">{timerDisplay}</span><p className="mt-2 text-xs text-white/45">{timerPausedRemaining !== null ? 'En pausa' : 'Tiempo restante'}</p></div><div className="flex gap-2"><button type="button" onClick={() => { if (timerPausedRemaining !== null) { onResumeTimer?.(); setTimerPausedRemaining(null); } else { setTimerPausedRemaining(Math.max(0, (timerEndAt || 0) - Date.now())); onPauseTimer?.(); } }} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-white/[.1] text-sm font-semibold">{timerPausedRemaining !== null ? <Play className="h-4 w-4"/> : <Pause className="h-4 w-4"/>}{timerPausedRemaining !== null ? 'Reanudar' : 'Pausar'}</button><button type="button" onClick={() => { onStopTimer?.(); setTimerPausedRemaining(null); setTimerPickerOpen(false); setTimerNoticeDismissed(true); }} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-[#ff453a]/15 text-sm font-semibold text-[#ff6b63]"><X className="h-4 w-4"/>Detener</button></div></> : <><div className="relative mb-4 overflow-hidden rounded-[26px] bg-black px-3 pb-4 pt-3">
                <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-black via-black/80 to-transparent"/><div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-black via-black/80 to-transparent"/>
                <div ref={timerRulerRef} onScroll={updateTimerRuler} onWheel={(event) => { if (timerRulerRef.current) timerRulerRef.current.scrollLeft += Math.abs(event.deltaY) > Math.abs(event.deltaX) ? event.deltaY : event.deltaX; }} onPointerDown={(event) => { if (event.pointerType === 'mouse') { timerRulerDrag.current = { x: event.clientX, left: timerRulerRef.current?.scrollLeft || 0 }; event.currentTarget.setPointerCapture(event.pointerId); } }} onPointerMove={(event) => { if (timerRulerDrag.current && timerRulerRef.current) { timerRulerRef.current.scrollLeft = timerRulerDrag.current.left - (event.clientX - timerRulerDrag.current.x); } }} onPointerUp={() => { timerRulerDrag.current = null; }} onPointerCancel={() => { timerRulerDrag.current = null; }} className="relative h-[91px] touch-pan-x select-none overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden cursor-ew-resize">
                  <div className="flex h-full w-max items-end" style={{ paddingLeft: 'calc(50% - 5.5px)', paddingRight: 'calc(50% - 5.5px)' }}>{Array.from({ length: TIMER_MAX_MINUTES + 1 }, (_, minute) => <div key={minute} className="flex h-full w-[11px] shrink-0 flex-col items-center justify-end"><span className="flex h-7 items-end justify-center pb-2 text-[10px] font-semibold leading-none tabular-nums text-[#e49a56]">{minute % 5 === 0 ? minute : ''}</span><span className={`w-[3px] rounded-full ${minute % 5 === 0 ? 'h-9 bg-[#ed9b52]' : 'h-6 bg-[#b87842]/80'}`}/></div>)}</div>
                </div>
                <span aria-hidden="true" className="pointer-events-none absolute top-[101px] left-1/2 z-20 h-0 w-0 -translate-x-1/2 border-x-[7px] border-t-[11px] border-x-transparent border-t-[#ff9f0a]"/>
                <div className="mt-4 flex items-center justify-between gap-3 px-1"><button type="button" onClick={() => { onStartTimer?.(pickedMinutes * 60_000); setTimerPausedRemaining(null); setTimerNoticeDismissed(false); setTimerPickerOpen(false); }} className="flex h-11 shrink-0 items-center justify-center rounded-full bg-[#392313] px-5 text-[14px] font-semibold text-[#f2a25a] transition-colors hover:bg-[#4b2c16] active:scale-[.98]">Start Timer</button><span className="min-w-0 text-right font-mono text-[42px] font-light leading-none tracking-[-.05em] tabular-nums text-[#f2a25a]">{pickedMinutes < 60 ? `${pickedMinutes}:00` : `${Math.floor(pickedMinutes / 60)}:${String(pickedMinutes % 60).padStart(2, '0')}:00`}</span></div>
              </div></>}
          </motion.section>
        </>}
      </AnimatePresence>

      <AnimatePresence>
        {voiceSearchOpen && <motion.div key="voice-search-sheet" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[180] overflow-hidden bg-black text-white">
          <div className="absolute inset-x-0 top-0 flex items-center justify-between px-5 pt-[max(18px,env(safe-area-inset-top))]"><span className="text-[12px] font-medium text-white/40">PuntoNochi</span><span className="h-2 w-2 rounded-full bg-[#ff9f0a]"/></div>
          <div className="absolute inset-x-5 top-[42%] -translate-y-1/2 text-center">
            <div className="mx-auto flex h-28 items-center justify-center gap-[5px]" aria-hidden="true">
              {[46, 72, 54, 82, 58, 74, 48].map((height, index) => <motion.span key={index} animate={voiceSearchStatus === 'listening' ? { height: [height * .45, height, height * .62, height * .82, height * .45], opacity: [0.72, 1, .82, 1, .72] } : { height: voiceSearchStatus === 'processing' ? [height * .5, height * .85, height * .5] : 12, opacity: .88 }} transition={{ duration: voiceSearchStatus === 'listening' ? .9 + index * .05 : .8, repeat: voiceSearchStatus === 'listening' || voiceSearchStatus === 'processing' ? Infinity : 0, ease: 'easeInOut', delay: index * .055 }} className="w-[15px] rounded-full bg-white"/>)}
            </div>
            <p className="mt-8 text-[20px] font-medium tracking-tight">{voiceSearchStatus === 'listening' ? 'Te escucho' : voiceSearchStatus === 'processing' ? 'Abriendo resultados…' : voiceSearchStatus === 'ready' ? '¿Qué lugar buscas?' : voiceSearchStatus === 'error' ? 'No pude completar la búsqueda' : 'Búsqueda por voz'}</p>
            {voiceTranscript && <p className="mx-auto mt-3 max-w-md text-[15px] leading-6 text-white/65">“{voiceTranscript}”</p>}
            {voiceSearchError && <p role="alert" className="mx-auto mt-3 max-w-md text-[13px] leading-5 text-white/50">{voiceSearchError}</p>}
            {(voiceSearchStatus === 'ready' || voiceSearchStatus === 'error') && <form onSubmit={(event) => { event.preventDefault(); void searchVoiceQuery(voiceTranscript); }} className="mx-auto mt-6 flex max-w-md items-center gap-2 rounded-full bg-[#222326] p-1.5 pl-4"><input autoFocus value={voiceTranscript} onChange={(event) => setVoiceTranscript(event.target.value)} placeholder="O escribe lo que necesitas" aria-label="Escribir búsqueda" className="min-w-0 flex-1 bg-transparent py-2 text-left text-[14px] text-white outline-none placeholder:text-white/35"/><button type="submit" className="flex h-10 shrink-0 items-center justify-center rounded-full bg-white px-4 text-[12px] font-semibold text-black">Buscar</button></form>}
          </div>
          <p className="absolute inset-x-0 bottom-[max(28px,env(safe-area-inset-bottom))] text-center text-[14px] text-white/75">{voiceSearchStatus === 'listening' ? 'Toca el botón para terminar' : voiceSearchStatus === 'processing' ? 'Mostrando negocios, eventos y anuncios' : voiceSearchStatus === 'ready' ? 'Di otra búsqueda o escríbela' : 'Busca un lugar, servicio o lo que necesitas'}</p>
          <button type="button" onClick={toggleVoiceRecognition} disabled={voiceSearchStatus === 'processing'} aria-label={voiceSearchStatus === 'listening' ? 'Terminar grabación' : 'Iniciar búsqueda por voz'} className="pointer-events-auto absolute bottom-[max(20px,env(safe-area-inset-bottom))] left-5 z-10 flex h-[68px] w-[68px] touch-manipulation items-center justify-center rounded-full bg-[#252528] text-white shadow-xl transition-transform active:scale-95 disabled:opacity-40">{voiceSearchStatus === 'listening' ? <Square className="h-5 w-5 fill-white"/> : <Mic className="h-6 w-6"/>}</button>
          <button type="button" onClick={closeVoiceSearch} aria-label="Cancelar búsqueda por voz" className="pointer-events-auto absolute bottom-[max(20px,env(safe-area-inset-bottom))] right-5 z-10 flex h-[68px] w-[68px] touch-manipulation items-center justify-center rounded-full bg-[#ff554d] text-white shadow-xl active:scale-95"><X className="h-8 w-8" strokeWidth={2.5}/></button>
        </motion.div>}
      </AnimatePresence>
      <AnimatePresence>{notesOpen && <QuickNotesSheet onClose={() => setNotesOpen(false)} />}</AnimatePresence>
      <AppleUtilitySheets active={utilityOpen} onClose={() => setUtilityOpen(null)} />
    </nav>
  );
}
