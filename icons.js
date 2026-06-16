/* =====================================================================
   NOVA SURVIVOR — custom inline SVG icon set.
   One consistent geometric line/duotone language (replaces all emoji).
   Colored via CSS (currentColor) per .ic-<name> class. Crisp at any size,
   identical on every device, zero asset files.
   Exposes window.ico(name,size) and window.hydrateIcons().
   ===================================================================== */
(() => {
'use strict';
const P = {
  // ---- currencies ----
  coin: '<circle cx="12" cy="12" r="8.5" fill="currentColor" opacity=".16"/><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="5" opacity=".55"/><path d="M12 9.3l.85 1.85L14.7 12l-1.85.85L12 14.7l-.85-1.85L9.3 12l1.85-.85z" fill="currentColor" stroke="none"/>',
  gem:  '<path d="M12 3.2l6.2 5-6.2 12.6L5.8 8.2z" fill="currentColor" opacity=".16"/><path d="M12 3.2l6.2 5-6.2 12.6L5.8 8.2z"/><path d="M5.8 8.2h12.4M12 3.2v17.6M9.2 8.2L12 20.8l2.8-12.6" opacity=".55"/>',
  gemstack: '<path d="M12 3l4 3-4 3-4-3z" fill="currentColor" opacity=".18"/><path d="M12 3l4 3-4 3-4-3z"/><path d="M6 11l6 4 6-4M6 15l6 4 6-4" />',
  coins: '<ellipse cx="12" cy="7" rx="6.2" ry="2.4" fill="currentColor" opacity=".16"/><ellipse cx="12" cy="7" rx="6.2" ry="2.4"/><path d="M5.8 7v5c0 1.3 2.8 2.4 6.2 2.4s6.2-1.1 6.2-2.4V7"/><path d="M5.8 12v4.6c0 1.3 2.8 2.4 6.2 2.4s6.2-1.1 6.2-2.4V12"/>',
  chest: '<rect x="4" y="9" width="16" height="10.5" rx="1.6" fill="currentColor" opacity=".14"/><rect x="4" y="9" width="16" height="10.5" rx="1.6"/><path d="M4 9l2.2-4h11.6L20 9M12 9v10.5"/><rect x="10.6" y="11.4" width="2.8" height="3.4" rx="1" fill="currentColor" stroke="none"/>',
  vault: '<rect x="3.5" y="4.5" width="17" height="15" rx="2.4" fill="currentColor" opacity=".14"/><rect x="3.5" y="4.5" width="17" height="15" rx="2.4"/><circle cx="11.5" cy="12" r="3.6"/><path d="M11.5 8.4V6.7M11.5 17.3v-1.7M7.9 12H6.2M16.8 12h-1.7"/><circle cx="11.5" cy="12" r="0.9" fill="currentColor" stroke="none"/>',
  whale: '<path d="M20 12c0 3-3.2 5.2-7 5.2-2.2 0-4.2-.8-5.4-2.1L4 16l1.5-2.9C5.2 12.8 5 12.4 5 12c0-3 3.3-5.2 7.5-5.2S20 9 20 12z" fill="currentColor" opacity=".16"/><path d="M20 12c0 3-3.2 5.2-7 5.2-2.2 0-4.2-.8-5.4-2.1L4 16l1.5-2.9C5.2 12.8 5 12.4 5 12c0-3 3.3-5.2 7.5-5.2S20 9 20 12z"/><circle cx="9" cy="11.4" r="1" fill="currentColor" stroke="none"/><path d="M14 6.6c0-1.4.9-2.6.9-2.6s.9 1.2.9 2.6"/>',
  // ---- navigation / chrome ----
  play: '<path d="M8 5.6v12.8l11-6.4z" fill="currentColor" stroke="none"/>',
  pause:'<rect x="6.5" y="5.5" width="3.6" height="13" rx="1.3" fill="currentColor" stroke="none"/><rect x="13.9" y="5.5" width="3.6" height="13" rx="1.3" fill="currentColor" stroke="none"/>',
  back: '<path d="M14.5 5.5l-7 6.5 7 6.5"/>',
  stats:'<path d="M4.5 20h15" opacity=".5"/><rect x="5" y="11" width="3.4" height="7" rx="1" fill="currentColor" opacity=".25" stroke="none"/><path d="M6.7 18v-7M12 18V5M17.3 18v-9"/>',
  quests:'<path d="M6.5 21V3.6" /><path d="M6.5 4.5h11l-1.8 3 1.8 3h-11" fill="currentColor" opacity=".18"/><path d="M6.5 4.5h11l-1.8 3 1.8 3h-11"/>',
  upgrades:'<path d="M5 8h8M16.5 8H19M5 16h2.5M11 16h8"/><circle cx="14.5" cy="8" r="2.3" fill="currentColor" stroke="none"/><circle cx="8.5" cy="16" r="2.3" fill="currentColor" stroke="none"/>',
  store:'<path d="M5.5 8h13l-1 11h-11z" fill="currentColor" opacity=".14"/><path d="M5.5 8h13l-1 11h-11z"/><path d="M9 8a3 3 0 0 1 6 0"/>',
  refresh:'<path d="M19.5 9A7.2 7.2 0 1 0 20.4 14"/><path d="M20.6 4.4V9h-4.5"/>',
  lock:'<rect x="5.5" y="10.5" width="13" height="9" rx="2.2" fill="currentColor" opacity=".14"/><rect x="5.5" y="10.5" width="13" height="9" rx="2.2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
  flag:'<path d="M6 21V4M6 5h11l-2.2 3.3L17 11.6H6"/>',
  power:'<path d="M13 3L5.5 13H10l-1 8 8.5-11H13z" fill="currentColor" opacity=".2"/><path d="M13 3L5.5 13H10l-1 8 8.5-11H13z"/>',
  clock:'<circle cx="12" cy="12" r="8.3" fill="currentColor" opacity=".12"/><circle cx="12" cy="12" r="8.3"/><path d="M12 7.4V12l3.2 2"/>',
  skull:'<path d="M5.2 11a6.8 6.8 0 0 1 13.6 0v3.3l-1.5 1V18H6.7v-2.7L5.2 14.3z" fill="currentColor" opacity=".14"/><path d="M5.2 11a6.8 6.8 0 0 1 13.6 0v3.3l-1.5 1V18H6.7v-2.7L5.2 14.3z"/><circle cx="9.2" cy="11.4" r="1.5" fill="currentColor" stroke="none"/><circle cx="14.8" cy="11.4" r="1.5" fill="currentColor" stroke="none"/><path d="M11 18v-2M13 18v-2"/>',
  boss:'<path d="M4.5 9.5L7 4.8l2.2 3 2.8-3 2.8 3 2.2-3 2.5 4.7-2 7.5H6.5z" fill="currentColor" opacity=".14"/><path d="M4.5 9.5L7 4.8l2.2 3 2.8-3 2.8 3 2.2-3 2.5 4.7-2 7.5H6.5z"/><circle cx="9.6" cy="11.3" r="1.5" fill="currentColor" stroke="none"/><circle cx="14.4" cy="11.3" r="1.5" fill="currentColor" stroke="none"/>',
  // ---- weapons ----
  gun:'<path d="M4 9h11.5v4.2H9.2L8 16.5H5l1.2-3.3H4z" fill="currentColor" opacity=".16"/><path d="M4 9h11.5v4.2H9.2L8 16.5H5l1.2-3.3H4z"/><path d="M15.5 10h4.5v2.2h-4.5"/>',
  scatter:'<path d="M5 12l13-5.5M5 12h13.5M5 12l13 5.5"/><circle cx="18.5" cy="6.5" r="1.5" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="18.5" cy="17.5" r="1.5" fill="currentColor" stroke="none"/>',
  rocket:'<path d="M12 3.2c3 2.1 4.2 6 4.2 9l-1.9 2.8H9.7L7.8 12.2c0-3 1.2-6.9 4.2-9z" fill="currentColor" opacity=".16"/><path d="M12 3.2c3 2.1 4.2 6 4.2 9l-1.9 2.8H9.7L7.8 12.2c0-3 1.2-6.9 4.2-9z"/><circle cx="12" cy="9" r="1.7" fill="currentColor" stroke="none"/><path d="M9.4 15.5l-2 4.3M14.6 15.5l2 4.3"/>',
  orbit:'<ellipse cx="12" cy="12" rx="9" ry="3.8" transform="rotate(28 12 12)"/><circle cx="12" cy="12" r="2.7" fill="currentColor" stroke="none"/><circle cx="19.4" cy="8.6" r="1.5" fill="currentColor" stroke="none"/>',
  nova:'<path d="M12 3.8v3.4M12 16.8v3.4M3.8 12h3.4M16.8 12h3.4M6.3 6.3l2.4 2.4M15.3 15.3l2.4 2.4M17.7 6.3l-2.4 2.4M8.7 15.3l-2.4 2.4"/><circle cx="12" cy="12" r="2.7" fill="currentColor" stroke="none"/>',
  beam:'<path d="M3 12h13" stroke-width="2.4"/><path d="M16 8.5l5 3.5-5 3.5z" fill="currentColor" stroke="none"/>',
  // ---- ultimates ----
  tempest:'<path d="M9.5 3L5 11.5h3.7l-.8 5.5 5.4-7.7H9.8z" fill="currentColor" opacity=".2"/><path d="M9.5 3L5 11.5h3.7l-.8 5.5 5.4-7.7H9.8z"/><path d="M17 8.5l-1.8 3h1.8l-1 3" stroke-width="1.5"/>',
  comet:'<circle cx="15.5" cy="8.5" r="3.6" fill="currentColor" opacity=".25"/><circle cx="15.5" cy="8.5" r="3.6"/><path d="M12.8 11.2L4 20M14 14l-4 3.4M10.8 10.8l-3.4 4"/>',
  blackhole:'<ellipse cx="12" cy="12" rx="9" ry="3.8"/><ellipse cx="12" cy="12" rx="5" ry="2" opacity=".5"/><circle cx="12" cy="12" r="2.4" fill="currentColor" stroke="none"/>',
  snow:'<path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9"/><path d="M12 6.4l2.2-2M12 6.4L9.8 4.4M12 17.6l2.2 2M12 17.6l-2.2 2M5.6 9.5l-.4-2.9 2.9.4M18.4 14.5l.4 2.9-2.9-.4M18.4 9.5l.4-2.9-2.9.4M5.6 14.5l-.4 2.9 2.9-.4"/>',
  hourglass:'<path d="M7 4h10M7 20h10M8 4c0 4.2 8 5 8 8s-8 3.8-8 8M16 4c0 4.2-8 5-8 8s8 3.8 8 8" /><path d="M9.5 18.2h5" stroke-width="2.4"/>',
  starburst:'<path d="M12 2.2l2.5 6.1 6.6.5-5 4.3 1.6 6.4L12 16.6 6.3 20l1.6-6.4-5-4.3 6.6-.5z" fill="currentColor" opacity=".18"/><path d="M12 2.2l2.5 6.1 6.6.5-5 4.3 1.6 6.4L12 16.6 6.3 20l1.6-6.4-5-4.3 6.6-.5z"/>',
  // ---- stat upgrades / relics ----
  sword:'<path d="M5 19l3.2-1L18 8.2l1-4-4 1-9.8 9.8-1 3.2z" fill="currentColor" opacity=".14"/><path d="M5 19l3.2-1L18 8.2l1-4-4 1-9.8 9.8-1 3.2z"/><path d="M13.5 7.5l3 3M5 19l3-3"/>',
  fire:'<path d="M12 3c1.3 3.2 4 4.2 4 7.8a4 4 0 0 1-8 0c0-2 1-3.2 2-4.2.2 2.2 2 2.4 2 4.4z" fill="currentColor" opacity=".18"/><path d="M12 3c1.3 3.2 4 4.2 4 7.8a4 4 0 0 1-8 0c0-2 1-3.2 2-4.2.2 2.2 2 2.4 2 4.4z"/>',
  boot:'<path d="M7 4.5v8L5 14.5v4.5h13.5v-3l-4.2-2-3.3-3.2v-4.3z" fill="currentColor" opacity=".14"/><path d="M7 4.5v8L5 14.5v4.5h13.5v-3l-4.2-2-3.3-3.2v-4.3z"/><path d="M5 16.5h13.5"/>',
  heart:'<path d="M12 20.2S4.8 15.4 4.8 10.3A3.9 3.9 0 0 1 12 7a3.9 3.9 0 0 1 7.2 3.3C19.2 15.4 12 20.2 12 20.2z" fill="currentColor" opacity=".18"/><path d="M12 20.2S4.8 15.4 4.8 10.3A3.9 3.9 0 0 1 12 7a3.9 3.9 0 0 1 7.2 3.3C19.2 15.4 12 20.2 12 20.2z"/>',
  heartplus:'<path d="M12 20.2S4.8 15.4 4.8 10.3A3.9 3.9 0 0 1 12 7a3.9 3.9 0 0 1 7.2 3.3C19.2 15.4 12 20.2 12 20.2z"/><path d="M12 9.6v4.2M9.9 11.7h4.2"/>',
  plus:'<path d="M12 5.5v13M5.5 12h13"/>',
  magnet:'<path d="M7 4.5v6.8a5 5 0 0 0 10 0V4.5h-3.4v6.8a1.6 1.6 0 0 1-3.2 0V4.5z" fill="currentColor" opacity=".14"/><path d="M7 4.5v6.8a5 5 0 0 0 10 0V4.5h-3.4v6.8a1.6 1.6 0 0 1-3.2 0V4.5z"/>',
  graph:'<path d="M4 16.5l5-5 3 3 7.5-7.5"/><path d="M16 6.5h4v4"/>',
  target:'<circle cx="12" cy="12" r="8.2"/><circle cx="12" cy="12" r="4.3" opacity=".6"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/>',
  range:'<circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none"/><path d="M12 7.2a4.8 4.8 0 0 1 4.8 4.8"/><path d="M12 4.4a7.6 7.6 0 0 1 7.6 7.6" opacity=".55"/><path d="M12 16.8a4.8 4.8 0 0 1-4.8-4.8"/><path d="M12 19.6A7.6 7.6 0 0 1 4.4 12" opacity=".55"/>',
  fastforward:'<path d="M5 6.5l6 5.5-6 5.5zM12.5 6.5l6 5.5-6 5.5z" fill="currentColor" opacity=".18"/><path d="M5 6.5l6 5.5-6 5.5zM12.5 6.5l6 5.5-6 5.5z"/>',
  shield:'<path d="M12 3.2l7 2.6v5.6c0 4.7-3.1 7.8-7 9.4-3.9-1.6-7-4.7-7-9.4V5.8z" fill="currentColor" opacity=".14"/><path d="M12 3.2l7 2.6v5.6c0 4.7-3.1 7.8-7 9.4-3.9-1.6-7-4.7-7-9.4V5.8z"/>',
  crown:'<path d="M3.8 8l3.1 9h10.2l3.1-9-5 4-3.2-6.2L8.8 12z" fill="currentColor" opacity=".18"/><path d="M3.8 8l3.1 9h10.2l3.1-9-5 4-3.2-6.2L8.8 12z"/>',
  trophy:'<path d="M8 4.5h8v3.2a4 4 0 0 1-8 0z" fill="currentColor" opacity=".14"/><path d="M8 4.5h8v3.2a4 4 0 0 1-8 0z"/><path d="M8 4.5H4.8v2a3 3 0 0 0 3.2 3M16 4.5h3.2v2a3 3 0 0 1-3.2 3M9.6 13.5h4.8M8.8 19.5h6.4M11 13.5l-.5 3M13 13.5l.5 3"/>',
  medal:'<circle cx="12" cy="15" r="4.6" fill="currentColor" opacity=".14"/><circle cx="12" cy="15" r="4.6"/><path d="M9.2 7L7 3M14.8 7L17 3M12 12.6v4.8"/>',
  gear:'<circle cx="12" cy="12" r="3.2" fill="currentColor" opacity=".18"/><circle cx="12" cy="12" r="3.2"/><path d="M12 3.8v2.2M12 18v2.2M3.8 12H6M18 12h2.2M5.8 5.8l1.6 1.6M16.6 16.6l1.6 1.6M18.2 5.8l-1.6 1.6M7.4 16.6l-1.6 1.6"/>',
  swirl:'<path d="M12 4.5a7.5 7.5 0 1 1-6.4 3.7"/><path d="M5.4 4v4.6h4.6"/>',
  shard:'<path d="M12 4l5 8-5 8-5-8z" fill="currentColor" opacity=".18"/><path d="M12 4l5 8-5 8-5-8z"/><path d="M7 12h10" opacity=".5"/>',
  nut:'<path d="M12 4.5l6.5 3.8v7.4L12 19.5 5.5 15.7V8.3z" fill="currentColor" opacity=".14"/><path d="M12 4.5l6.5 3.8v7.4L12 19.5 5.5 15.7V8.3z"/><circle cx="12" cy="12" r="3"/>',
  book:'<path d="M5 5.2A2.2 2.2 0 0 1 7.2 3H19v15.5H7.2A2.2 2.2 0 0 0 5 20.7z" fill="currentColor" opacity=".12"/><path d="M5 5.2A2.2 2.2 0 0 1 7.2 3H19v15.5H7.2A2.2 2.2 0 0 0 5 20.7z"/><path d="M5 18.5A2.2 2.2 0 0 1 7.2 16.3H19"/>',
  ad:'<rect x="3.5" y="5" width="17" height="12" rx="2" fill="currentColor" opacity=".14"/><rect x="3.5" y="5" width="17" height="12" rx="2"/><path d="M10.3 8.5l4 2.5-4 2.5z" fill="currentColor" stroke="none"/><path d="M9 20h6"/>',
  dot:'<circle cx="12" cy="12" r="6" fill="currentColor" stroke="none"/>',
};
function ico(name, size = 20) {
  const inner = P[name] || P.dot;
  return `<svg class="sic ic-${name}" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
}
function hydrateIcons(root) {
  (root || document).querySelectorAll('[data-ico]').forEach(el => {
    const name = el.dataset.ico, size = el.dataset.size || 20;
    el.innerHTML = ico(name, size);
    el.classList.add('ic-wrap', 'icw-' + name);
  });
}
window.ico = ico;
window.hydrateIcons = hydrateIcons;
})();
