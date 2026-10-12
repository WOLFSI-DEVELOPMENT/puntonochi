// @ts-nocheck
import { useEffect, useRef, useState } from "react";

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
  background: transparent;
  border: 0;
  outline: 0;
  margin: 0;
  padding: 0;
  border-radius: 0;
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

@media (prefers-reduced-motion: reduce) {
  .lgn-slider, .lgn-ico, .lgn-row, .lgn-tabbar, .lgn-search-wrap,
  .lgn-s-ico, .lgn-input, .lgn-close, .lgn-menu, .lgn-item { transition: none !important; }
  .lgn-blob.is-moving { animation: none; }
}
`;

const PATHS = {
  home:
    "M154.02-182.15v-386.89q0-16.17 7.09-30.59 7.1-14.42 20.02-23.87l257.85-193.57q17.83-13.67 40.86-13.67t41.18 13.67L778.87-623.5q12.92 9.45 20.14 23.87 7.21 14.42 7.21 30.59v386.89q0 28.33-20.02 48.23t-48.35 19.9H595.5q-14.42 0-24.24-9.82-9.83-9.82-9.83-24.25v-219.28q0-14.42-9.82-24.24-9.82-9.82-24.24-9.82h-94.74q-14.42 0-24.24 9.82-9.82 9.82-9.82 24.24v219.28q0 14.43-9.83 24.25-9.82 9.82-24.24 9.82H222.15q-28.33 0-48.23-19.9t-19.9-48.23Z",
  explore:
    "m333.83-312.43 204.63-61.7q16.95-5.22 29.07-17.34 12.12-12.12 17.34-29.07l61.7-204.63q3.23-9.96-4.1-17.3-7.34-7.33-17.3-4.1l-204.63 61.7q-16.95 5.22-29.07 17.34-12.12 12.12-17.34 29.07l-61.7 204.63q-3.23 9.96 4.1 17.3 7.34 7.33 17.3 4.1Zm146.11-131.16q-15.27 0-25.81-10.6t-10.54-25.87q0-15.27 10.6-25.81t25.87-10.54q15.27 0 25.81 10.6t10.54 25.87q0 15.27-10.6 25.81t-25.87 10.54Zm.09 369.57q-83.46 0-157.54-31.88-74.07-31.88-129.39-87.2-55.32-55.32-87.2-129.36-31.88-74.04-31.88-157.51 0-84.46 31.88-158.54 31.88-74.07 87.16-128.9 55.28-54.84 129.34-86.82 74.06-31.99 157.55-31.99 84.48 0 158.59 31.97 74.1 31.97 128.91 86.77 54.82 54.8 86.79 128.88 31.98 74.08 31.98 158.6 0 83.5-31.99 157.57-31.98 74.07-86.82 129.36-54.83 55.29-128.87 87.17-74.04 31.88-158.51 31.88Z",
  grid_view:
    "M182.15-510q-28.09 0-48.11-20.02t-20.02-48.35v-199.48q0-28.09 20.02-48.23 20.02-20.14 48.11-20.14h199.72q28.09 0 48.11 20.14T450-777.85v199.48q0 28.33-20.02 48.35Q409.96-510 381.87-510H182.15Zm0 395.98q-28.09 0-48.11-20.02t-20.02-48.11v-199.72q0-28.09 20.02-48.11T182.15-450h199.72q28.09 0 48.11 20.02T450-381.87v199.72q0 28.09-20.02 48.11t-48.11 20.02H182.15ZM578.37-510q-28.33 0-48.35-20.02Q510-550.04 510-578.37v-199.48q0-28.09 20.02-48.23 20.02-20.14 48.35-20.14h199.48q28.09 0 48.23 20.14 20.14 20.14 20.14 48.23v199.48q0 28.33-20.14 48.35Q805.94-510 777.85-510H578.37Zm0 395.98q-28.33 0-48.35-20.02Q510-154.06 510-182.15v-199.72q0-28.09 20.02-48.11T578.37-450h199.48q28.09 0 48.23 20.02 20.14 20.02 20.14 48.11v199.72q0 28.09-20.14 48.11t-48.23 20.02H578.37Z",
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
        transform={name === "auto_awesome" ? "translate(0 -960) scale(40)" : undefined}
      />
    </svg>
  </span>
);

/* ---------- Profile picture (falls back to a silhouette) ---------- */
const AVATAR = 24;
const Avatar = ({ src, alt }) => {
  const [failed, setFailed] = useState(false);
  return (
    <span className="lgn-ico">
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
  { id: "browse", label: "Browse", icon: "grid_view", menu: true },
  { id: "profile", label: "Profile", avatar: true },
];

const MENU_W = 236;
const ITEM_H = 46; // keep in sync with .lgn-item height in CSS_TEXT
const DEFAULT_MENU = [
  { id: "videos", label: "Mercado", icon: "storefront" },
  { id: "noticias", label: "Noticias", icon: "newspaper" },
  { id: "guias", label: "Artículos", icon: "menu_book" },
  { id: "crear", label: "Crear", icon: "add" },
  { id: "ask-nochi", label: "Pregúntale a Nochi", icon: "auto_awesome" },
];

const BAR_H = 46;
const IDLE_W = 320;
const OPEN_W = 480;
const SEARCH_IDLE_W = 62;

/* ---------- The navbar ---------- */
export function BottomNav({ activeTab, onChangeTab, onOpenSearch, onCloseSearch, onOpenProfile, profilePicture, profileName }) {
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

  const [active, setActive] = useState(appTab);
  const [moves, setMoves] = useState(0); // bumps on each tab switch to replay the stretch
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  // sliding hover highlight: i = hovered row (null when none), pos = where the glass sits,
  // instant = jump there without sliding (first hover after the pointer was away)
  const [hl, setHl] = useState({ i: null, pos: 0, instant: true });
  const hoverRow = (i) => setHl((h) => ({ i, pos: i, instant: h.i === null }));
  const leaveMenu = () => setHl((h) => ({ ...h, i: null }));

  const keyboard = useKeyboardOffset(searching);
  useEffect(() => setActive(appTab), [appTab]);
  // while the menu is open the glass pill rests on the grid tab
  const visualActive = menuOpen ? "browse" : active;
  const index = TABS.findIndex((t) => t.id === visualActive);

  useEffect(() => {
    if (!menuOpen) setHl({ i: null, pos: 0, instant: true });
  }, [menuOpen]);

  // close the menu on outside tap or Escape
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onDown = (e) => {
      const t = e.target;
      if (menuRef.current && menuRef.current.contains(t)) return;
      if (browseRef.current && browseRef.current.contains(t)) return;
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

  const pickItem = (item) => {
    setMenuOpen(false);
    onMenuSelect && onMenuSelect(item.id);
  };

  const select = (id) => {
    if (id === 'profile') { setMenuOpen(false); onOpenProfile(); return; }
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
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: keyboard
          ? `${keyboard + 10}px`
          : "calc(env(safe-area-inset-bottom, 0px) + 14px)",
        transition: "bottom 250ms ease-out",
        display: "flex",
        justifyContent: "center",
        padding: "0 14px",
        zIndex: 50,
        pointerEvents: "none",
      }}
    >
      <style>{CSS_TEXT}</style>
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
          width: searching ? OPEN_W : IDLE_W,
          maxWidth: "100%",
          height: BAR_H,
          transition: `width 560ms ${EASE_OUT}`,
        }}
      >
        {/* Tab bar */}
        <div
          className="lgn-tabbar"
          role="tablist"
          aria-hidden={searching}
          style={{
            ...darkGlass("rgba(58,50,46,0.20)"),
            position: "absolute",
            left: 0,
            top: 0,
            zIndex: 1,
            width: `calc(100% - ${SEARCH_IDLE_W + 10}px)`,
            height: BAR_H,
            padding: 3,
            borderRadius: 999,
            display: "flex",
            alignItems: "center",
            pointerEvents: searching ? "none" : "auto",
            opacity: searching ? 0 : 1,
            visibility: searching ? "hidden" : "visible",
            transform: searching ? "translateZ(0) scale(0.9)" : "translateZ(0) scale(1)",
            transformOrigin: "left center",
            transition: searching
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
              width: `calc((100% - 6px) / ${TABS.length})`,
              transform: `translateX(${index * 100}%)`,
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

          {TABS.map(({ id, label, icon, avatar, menu }) => (
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
                color: "#fff",
              }}
            >
              {avatar ? <Avatar src={avatarSrc} alt={label} /> : <Icon name={icon} />}
            </button>
          ))}
        </div>

        {/* Dropdown menu: sibling of the tab bar (not inside it) so its glass can blur the page */}
        <div
          ref={menuRef}
          className="lgn-menu"
          role="menu"
          aria-label="More"
          aria-hidden={!menuOpen}
          onPointerLeave={(e) => e.pointerType === "mouse" && leaveMenu()}
          style={{
            ...darkGlass("rgba(38,32,28,0.34)"),
            backdropFilter: "blur(16px) saturate(190%) brightness(1.04)",
            WebkitBackdropFilter: "blur(16px) saturate(190%) brightness(1.04)",
            position: "absolute",
            zIndex: 3,
            bottom: BAR_H + 10,
            // centered over the grid tab, clamped so it never leaves the row
            left: `clamp(0px, calc(3px + (100% - ${SEARCH_IDLE_W + 10 + 6}px) * 0.625 - ${MENU_W / 2}px), calc(100% - ${MENU_W}px))`,
            width: MENU_W,
            maxWidth: "100%",
            padding: 8,
            borderRadius: 28,
            transformOrigin: "50% 100%",
            opacity: menuOpen && !searching ? 1 : 0,
            visibility: menuOpen && !searching ? "visible" : "hidden",
            pointerEvents: menuOpen && !searching ? "auto" : "none",
            transform:
              menuOpen && !searching
                ? "translateZ(0) translateY(0) scale(1)"
                : "translateZ(0) translateY(14px) scale(0.86)",
            transition:
              menuOpen && !searching
                ? `opacity 220ms ease, transform 480ms ${SPRING}, visibility 0s`
                : `opacity 140ms ease, transform 220ms ease, visibility 0s linear 220ms`,
          }}
        >
          {/* One glass highlight that glides between rows */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              left: 8,
              right: 8,
              top: 8,
              height: ITEM_H,
              borderRadius: 20,
              zIndex: 0,
              pointerEvents: "none",
              background:
                "radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.22), rgba(255,255,255,0.08) 65%)",
              boxShadow: "inset 0 0 14px rgba(255,255,255,0.06)",
              opacity: hl.i === null ? 0 : 1,
              transform: `translateY(${hl.pos * ITEM_H}px) scale(${hl.i === null ? 0.97 : 1})`,
              transition: hl.instant
                ? "opacity 200ms ease, transform 0s"
                : `opacity 200ms ease, transform 360ms ${EASE_OUT}`,
            }}
          />
          {menuItems.map((item, i) => (
            <button
              key={item.id}
              className="lgn-item"
              onPointerEnter={(e) => e.pointerType === "mouse" && hoverRow(i)}
              onFocus={() => hoverRow(i)}
              role="menuitem"
              tabIndex={menuOpen ? 0 : -1}
              onClick={() => pickItem(item)}
              style={{
                opacity: menuOpen ? 1 : 0,
                transform: menuOpen ? "translateY(0)" : "translateY(8px)",
                transition: menuOpen
                  ? `opacity 260ms ease ${70 + i * 40}ms, transform 420ms ${EASE_OUT} ${70 + i * 40}ms, background 160ms ease`
                  : "opacity 100ms ease, transform 100ms ease",
              }}
            >
              <Icon name={item.icon} size={22} />
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {/* Search: oval pill that expands into the search bar */}
        <div
          className="lgn-search-wrap"
          role="search"
          style={{
            ...darkGlass("rgba(38,32,28,0.30)"),
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
              left: 46,
              right: 50,
              top: 0,
              bottom: 0,
              opacity: searching ? 1 : 0,
              pointerEvents: searching ? "auto" : "none",
              transition: searching ? "opacity 300ms ease 200ms" : "opacity 120ms ease",
            }}
          >
            <input
              ref={inputRef}
              className="lgn-input"
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
    </nav>
  );
}
