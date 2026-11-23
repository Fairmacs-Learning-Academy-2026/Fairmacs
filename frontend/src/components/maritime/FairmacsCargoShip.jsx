import React from 'react';

/**
 * FairmacsCargoShip
 *
 * Highly authentic commercial container cargo vessel.
 *
 * Anatomy improvements:
 * - Proud raked bow stem (sharp curved flare cutting upward from waterline to forecastle)
 * - Raised forecastle deck with safety stanchions, fore-mast, anchor hawse pipes
 * - V-shaped cargo breakwater deflector forward of Bay 6
 * - Stepped container stacks (stepping down toward bow for visibility)
 * - Multi-tier bridge superstructure with navigation wings and radar mast
 * - Streamlined funnels with Fairmacs blue band
 * - Prominent white mid-hull section carrying the official transparent Fairmacs logo
 * - Red antifouling keel band with bulbous bow underwater
 * - Night navigation beacons: masthead, fore-mast, port (red) / starboard (green) bridge wings
 */
export default function FairmacsCargoShip({ timeState = 'afternoon' }) {
  const isNight = timeState === 'night';
  const isMorning = timeState === 'morning';
  const isEvening = timeState === 'evening';

  return (
    <div
      className={`fairmacs-vessel-unit time-${timeState} ${isNight ? 'is-night-mode' : ''}`}
      aria-label="Fairmacs Commercial Container Vessel"
    >
      {/* Vessel Buoyancy & Rotation Rig */}
      <div className="vessel-rotation-rig">
        {/* Foaming Bow Wave Spray */}
        <div className="vessel-bow-breaker-spray" aria-hidden="true" />

        {/* Stern Propeller Wash & Churn */}
        <div className="vessel-stern-wash" aria-hidden="true" />

        {/* Night Navigation Beacons & Spotlights */}
        {isNight && (
          <div className="vessel-night-beacons" aria-hidden="true">
            {/* Main Radar Masthead Light (White) */}
            <div className="vessel-beacon beacon-main-mast" />
            {/* Forecastle Forward Navigation Light (White) */}
            <div className="vessel-beacon beacon-fore-mast" />
            {/* Port Bridge Wing Sidelight (Ruby Red) */}
            <div className="vessel-beacon beacon-port-wing" />
            {/* Starboard Bridge Wing Sidelight (Emerald Green) */}
            <div className="vessel-beacon beacon-starboard-wing" />
            {/* Stern Light (White) */}
            <div className="vessel-beacon beacon-stern" />
          </div>
        )}

        {/* Scalable Container Vessel SVG */}
        <svg
          viewBox="0 0 1160 380"
          className="vessel-svg-canvas"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Deep Marine Iron-Navy Steel Hull */}
            <linearGradient id="realHullSteel" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1E334D" />
              <stop offset="30%" stopColor="#132437" />
              <stop offset="75%" stopColor="#0B1623" />
              <stop offset="100%" stopColor="#070E18" />
            </linearGradient>

            {/* Antifouling Keel Crimson Red */}
            <linearGradient id="realKeelCrimson" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#B82828" />
              <stop offset="50%" stopColor="#8C1C1C" />
              <stop offset="100%" stopColor="#541010" />
            </linearGradient>

            {/* Brilliant White Hull Brand Stripe */}
            <linearGradient id="realHullWhite" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="50%" stopColor="#F5F9FD" />
              <stop offset="100%" stopColor="#D9E6F4" />
            </linearGradient>

            {/* Bridge Enamel White */}
            <linearGradient id="realBridgeWhite" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="60%" stopColor="#E5EFF9" />
              <stop offset="100%" stopColor="#C4D7EB" />
            </linearGradient>

            {/* Container Corrugated Panel Pattern */}
            <pattern id="realContainerRibs" width="8" height="28" patternUnits="userSpaceOnUse">
              <rect x="0" y="0" width="4" height="28" fill="rgba(0,0,0,0.18)" />
              <rect x="4" y="0" width="4" height="28" fill="rgba(255,255,255,0.09)" />
            </pattern>

            {/* Bow Flare Steel Shading */}
            <linearGradient id="bowFlareShade" x1="0%" y1="0%" x2="100%" y2="50%">
              <stop offset="0%" stopColor="#15263A" />
              <stop offset="60%" stopColor="#1F3650" />
              <stop offset="100%" stopColor="#2A486B" />
            </linearGradient>
          </defs>

          {/* ==============================================================
              1. AFT SUPERSTRUCTURE (BRIDGE TOWER, FUNNELS & RADAR MAST)
              ============================================================== */}
          <g className="ship-aft-superstructure">
            {/* Streamlined Modern Twin Funnels */}
            <path
              d="M 234 156 L 254 112 L 288 112 L 294 156 Z"
              fill="#193453"
              stroke="#0D1E32"
              strokeWidth="2"
            />
            {/* Funnel Exhaust Pipes */}
            <rect x="256" y="104" width="10" height="9" rx="1.5" fill="#22252A" />
            <rect x="272" y="102" width="11" height="11" rx="1.5" fill="#181B1E" />
            <rect x="250" y="111" width="40" height="4" rx="1" fill="#3A4048" />
            {/* Fairmacs Blue Funnel Band */}
            <rect x="242" y="128" width="48" height="15" fill="#3478E5" />

            {/* Accommodation Tier 1 - Main Crew Living Decks */}
            <rect x="174" y="154" width="156" height="52" rx="2" fill="url(#realBridgeWhite)" stroke="#A4BDD5" strokeWidth="1.2" />
            {/* Cabin Portholes */}
            <g fill="#14263B">
              <circle cx="192" cy="180" r="3.5" />
              <circle cx="212" cy="180" r="3.5" />
              <circle cx="232" cy="180" r="3.5" />
              <circle cx="252" cy="180" r="3.5" />
              <circle cx="272" cy="180" r="3.5" />
              <circle cx="292" cy="180" r="3.5" />
              <circle cx="312" cy="180" r="3.5" />
            </g>

            {/* Accommodation Tier 2 - Officer Decks */}
            <rect x="190" y="126" width="128" height="28" rx="2" fill="url(#realBridgeWhite)" stroke="#A4BDD5" strokeWidth="1.2" />
            <line x1="190" y1="140" x2="318" y2="140" stroke="rgba(25,52,83,0.2)" strokeWidth="1" />

            {/* Accommodation Tier 3 - Navigation Bridge & Wheelhouse */}
            <path
              d="M 184 126 L 202 96 L 310 96 L 324 126 Z"
              fill="url(#realBridgeWhite)"
              stroke="#A4BDD5"
              strokeWidth="1.5"
            />
            {/* Extended Navigation Bridge Wings (Port & Starboard) */}
            <rect x="168" y="104" width="28" height="8" rx="2" fill="#D8E8F8" stroke="#8CA6C1" strokeWidth="1" />
            <rect x="314" y="104" width="28" height="8" rx="2" fill="#D8E8F8" stroke="#8CA6C1" strokeWidth="1" />

            {/* Wheelhouse Glazed Navigation Windows */}
            <path
              d="M 204 100 L 308 100 L 304 116 L 208 116 Z"
              className={isNight ? 'bridge-windows-night-glow' : 'bridge-windows-day-tint'}
              fill={isNight ? '#FFE57F' : '#0F2742'}
            />
            {/* Window Frames */}
            <line x1="224" y1="100" x2="224" y2="116" stroke="#7E9AB6" strokeWidth="1.2" />
            <line x1="244" y1="100" x2="244" y2="116" stroke="#7E9AB6" strokeWidth="1.2" />
            <line x1="264" y1="100" x2="264" y2="116" stroke="#7E9AB6" strokeWidth="1.2" />
            <line x1="284" y1="100" x2="284" y2="116" stroke="#7E9AB6" strokeWidth="1.2" />

            {/* Radar & Communications Mast */}
            <line x1="258" y1="96" x2="258" y2="44" stroke="#3D4E62" strokeWidth="3.5" />
            <line x1="240" y1="64" x2="276" y2="64" stroke="#3D4E62" strokeWidth="2.5" />
            <line x1="246" y1="52" x2="270" y2="52" stroke="#3D4E62" strokeWidth="2" />
            {/* Radar Scanner Bar */}
            <rect x="236" y="61" width="44" height="4" rx="1.5" fill="#FFFFFF" stroke="#8CA6C1" strokeWidth="0.8" />
            {/* Satcom Radomes */}
            <ellipse cx="242" cy="91" rx="5.5" ry="5" fill="#FFFFFF" stroke="#8CA6C1" strokeWidth="1" />
            <ellipse cx="274" cy="91" rx="5.5" ry="5" fill="#FFFFFF" stroke="#8CA6C1" strokeWidth="1" />
          </g>

          {/* ==============================================================
              2. REALISTIC CONTAINER CARGO STACKS (STEPPED DOWN TO BOW)
              ============================================================== */}
          <g className="ship-container-stacks">
            {/* Aft Stacks (Behind Bridge) */}
            <g transform="translate(90, 150)">
              <rect x="0" y="0" width="80" height="28" rx="2" fill="#8B263E" stroke="#5C1626" strokeWidth="1" />
              <rect x="0" y="0" width="80" height="28" fill="url(#realContainerRibs)" />
              <rect x="0" y="28" width="80" height="28" rx="2" fill="#1B365D" stroke="#0D1E36" strokeWidth="1" />
              <rect x="0" y="28" width="80" height="28" fill="url(#realContainerRibs)" />
            </g>

            {/* Bay 1 - Forward of Bridge (4 tiers) */}
            <g transform="translate(338, 122)">
              <rect x="0" y="0" width="88" height="27" rx="2" fill="#1C5E3B" stroke="#0E3822" strokeWidth="1" />
              <rect x="0" y="0" width="88" height="27" fill="url(#realContainerRibs)" />
              <rect x="0" y="27" width="88" height="27" rx="2" fill="#991B1B" stroke="#681010" strokeWidth="1" />
              <rect x="0" y="27" width="88" height="27" fill="url(#realContainerRibs)" />
              <rect x="0" y="54" width="88" height="27" rx="2" fill="#2563EB" stroke="#1D4ED8" strokeWidth="1" />
              <rect x="0" y="54" width="88" height="27" fill="url(#realContainerRibs)" />
            </g>

            {/* Bay 2 - With Top Fairmacs Blue Container (5 tiers) */}
            <g transform="translate(432, 95)">
              {/* Branded Fairmacs Blue Container */}
              <rect x="0" y="0" width="88" height="27" rx="2" fill="#3478E5" stroke="#1D5BBF" strokeWidth="1.2" />
              <rect x="0" y="0" width="88" height="27" fill="url(#realContainerRibs)" opacity="0.35" />
              <rect x="11" y="5" width="66" height="17" rx="3" fill="#FFFFFF" />
              <text x="44" y="17" fill="#193453" fontSize="8.5" fontWeight="800" fontFamily="var(--font-brand), sans-serif" letterSpacing="0.08em" textAnchor="middle">FAIRMACS</text>

              <rect x="0" y="27" width="88" height="27" rx="2" fill="#D97706" stroke="#92400E" strokeWidth="1" />
              <rect x="0" y="27" width="88" height="27" fill="url(#realContainerRibs)" />
              <rect x="0" y="54" width="88" height="27" rx="2" fill="#4B5563" stroke="#374151" strokeWidth="1" />
              <rect x="0" y="54" width="88" height="27" fill="url(#realContainerRibs)" />
              <rect x="0" y="81" width="88" height="27" rx="2" fill="#1E3A8A" stroke="#172554" strokeWidth="1" />
              <rect x="0" y="81" width="88" height="27" fill="url(#realContainerRibs)" />
            </g>

            {/* Bay 3 - Tall Center Stack (5 tiers) */}
            <g transform="translate(526, 80)">
              <rect x="0" y="0" width="94" height="25" rx="2" fill="#881337" stroke="#4C0519" strokeWidth="1" />
              <rect x="0" y="0" width="94" height="25" fill="url(#realContainerRibs)" />
              <rect x="0" y="25" width="94" height="25" rx="2" fill="#0D9488" stroke="#115E59" strokeWidth="1" />
              <rect x="0" y="25" width="94" height="25" fill="url(#realContainerRibs)" />
              <rect x="0" y="50" width="94" height="25" rx="2" fill="#F1F5F9" stroke="#94A3B8" strokeWidth="1" />
              <rect x="0" y="50" width="94" height="25" fill="url(#realContainerRibs)" opacity="0.3" />
              <rect x="0" y="75" width="94" height="25" rx="2" fill="#B45309" stroke="#78350F" strokeWidth="1" />
              <rect x="0" y="75" width="94" height="25" fill="url(#realContainerRibs)" />
              <rect x="0" y="100" width="94" height="25" rx="2" fill="#0F172A" stroke="#020617" strokeWidth="1" />
              <rect x="0" y="100" width="94" height="25" fill="url(#realContainerRibs)" />
            </g>

            {/* Bay 4 - Mid-Forward (4 tiers with White Fairmacs Container) */}
            <g transform="translate(626, 105)">
              <rect x="0" y="0" width="90" height="25" rx="2" fill="#1E40AF" stroke="#1E3A8A" strokeWidth="1" />
              <rect x="0" y="0" width="90" height="25" fill="url(#realContainerRibs)" />
              {/* Secondary White Container */}
              <rect x="0" y="25" width="90" height="25" rx="2" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="1.2" />
              <rect x="0" y="25" width="90" height="25" fill="url(#realContainerRibs)" opacity="0.25" />
              <text x="45" y="41.5" fill="#3478E5" fontSize="8.5" fontWeight="800" fontFamily="var(--font-brand), sans-serif" letterSpacing="0.08em" textAnchor="middle">FAIRMACS</text>

              <rect x="0" y="50" width="90" height="25" rx="2" fill="#B91C1C" stroke="#7F1D1D" strokeWidth="1" />
              <rect x="0" y="50" width="90" height="25" fill="url(#realContainerRibs)" />
              <rect x="0" y="75" width="90" height="25" rx="2" fill="#047857" stroke="#064E3B" strokeWidth="1" />
              <rect x="0" y="75" width="90" height="25" fill="url(#realContainerRibs)" />
            </g>

            {/* Bay 5 - Stepping Down toward Bow (3 tiers) */}
            <g transform="translate(722, 130)">
              <rect x="0" y="0" width="86" height="25" rx="2" fill="#C2410C" stroke="#7C2D12" strokeWidth="1" />
              <rect x="0" y="0" width="86" height="25" fill="url(#realContainerRibs)" />
              <rect x="0" y="25" width="86" height="25" rx="2" fill="#1E3A8A" stroke="#172554" strokeWidth="1" />
              <rect x="0" y="25" width="86" height="25" fill="url(#realContainerRibs)" />
              <rect x="0" y="50" width="86" height="25" rx="2" fill="#334155" stroke="#1E293B" strokeWidth="1" />
              <rect x="0" y="50" width="86" height="25" fill="url(#realContainerRibs)" />
            </g>

            {/* Bay 6 - Foremost Stack behind Breakwater (2 tiers) */}
            <g transform="translate(814, 155)">
              <rect x="0" y="0" width="76" height="25" rx="2" fill="#881337" stroke="#4C0519" strokeWidth="1" />
              <rect x="0" y="0" width="76" height="25" fill="url(#realContainerRibs)" />
              <rect x="0" y="25" width="76" height="25" rx="2" fill="#0F766E" stroke="#115E59" strokeWidth="1" />
              <rect x="0" y="25" width="76" height="25" fill="url(#realContainerRibs)" />
            </g>

            {/* Vertical Cell Guides & Catwalk Railings */}
            <line x1="336" y1="205" x2="894" y2="205" stroke="#475569" strokeWidth="3" />
            <line x1="430" y1="95" x2="430" y2="205" stroke="#334155" strokeWidth="2" />
            <line x1="524" y1="80" x2="524" y2="205" stroke="#334155" strokeWidth="2" />
            <line x1="624" y1="80" x2="624" y2="205" stroke="#334155" strokeWidth="2" />
            <line x1="720" y1="105" x2="720" y2="205" stroke="#334155" strokeWidth="2" />
            <line x1="812" y1="130" x2="812" y2="205" stroke="#334155" strokeWidth="2" />
          </g>

          {/* ==============================================================
              3. AUTHENTIC CONTAINER SHIP BOW (RAKED STEM, FORECASTLE & FLARE)
              Addresses: "the front part doesn't look like ship only"
              ============================================================== */}
          <g className="ship-authentic-bow">
            {/* V-Shaped Cargo Breakwater Deflector (Shields Bay 6 from sea spray) */}
            <polygon
              points="890,205 896,172 912,186 904,205"
              fill="#1B334E"
              stroke="#2C486B"
              strokeWidth="1.5"
            />
            {/* Breakwater Stiffeners */}
            <line x1="896" y1="172" x2="896" y2="205" stroke="#3D5A80" strokeWidth="1.5" />
            <line x1="904" y1="179" x2="904" y2="205" stroke="#3D5A80" strokeWidth="1.2" />

            {/* Forecastle Raised Deck Sheer (Gracefully sweeping up to bow crest) */}
            <path
              d="M 890 205 
                 Q 975 198, 1058 168 
                 L 1064 175 
                 Q 980 204, 898 205 Z"
              fill="url(#bowFlareShade)"
              stroke="#314B6B"
              strokeWidth="1.5"
            />

            {/* Forecastle Safety Railing Stanchions */}
            <path
              d="M 902 195 Q 980 188, 1054 160"
              fill="none"
              stroke="#94A3B8"
              strokeWidth="1.5"
            />
            <line x1="925" y1="202" x2="925" y2="192" stroke="#94A3B8" strokeWidth="1.2" />
            <line x1="955" y1="198" x2="955" y2="187" stroke="#94A3B8" strokeWidth="1.2" />
            <line x1="985" y1="192" x2="985" y2="180" stroke="#94A3B8" strokeWidth="1.2" />
            <line x1="1015" y1="184" x2="1015" y2="172" stroke="#94A3B8" strokeWidth="1.2" />
            <line x1="1045" y1="173" x2="1045" y2="162" stroke="#94A3B8" strokeWidth="1.2" />

            {/* Tall Fore-Mast at the Bow with Navigation Beacon */}
            <line x1="1038" y1="170" x2="1038" y2="120" stroke="#475569" strokeWidth="3" />
            <line x1="1028" y1="136" x2="1048" y2="136" stroke="#475569" strokeWidth="2" />
            {/* Mast Stays / Rigging Wire */}
            <line x1="1038" y1="120" x2="988" y2="198" stroke="#64748B" strokeWidth="1" opacity="0.5" />
            <line x1="1038" y1="120" x2="1058" y2="168" stroke="#64748B" strokeWidth="1" opacity="0.6" />

            {/* Mooring Winch Drums & Anchor Windlass on Forecastle */}
            <rect x="938" y="196" width="10" height="7" rx="1.5" fill="#475569" stroke="#334155" strokeWidth="1" />
            <rect x="956" y="192" width="10" height="7" rx="1.5" fill="#475569" stroke="#334155" strokeWidth="1" />
            <circle cx="943" cy="199.5" r="4.5" fill="#64748B" />
            <circle cx="961" cy="195.5" r="4.5" fill="#64748B" />
          </g>

          {/* ==============================================================
              4. REALISTIC COMMERCIAL STEEL HULL & PROUD RAKED STEM
              ============================================================== */}
          <g className="ship-steel-hull">
            {/* Main Iron-Navy Commercial Hull
                - Clean sheer line along main cargo deck
                - Proud raked stem: slices forward and up to bow crest (1058, 168)
                - Forward stem edge: straight crisp rake from crest (1058, 168) down to waterline (1012, 252)
                - Transom Stern: vertical aft drop with rounded turn of the bilge
            */}
            <path
              d="M 50 208 
                 L 890 205 
                 Q 975 198, 1058 168 
                 L 1012 252 
                 L 70 252 
                 C 54 252, 42 238, 38 224 
                 L 50 208 Z"
              fill="url(#realHullSteel)"
              stroke="#253F5C"
              strokeWidth="2"
            />

            {/* Bow Flare Steel Shading & Leading Edge Highlight */}
            <path
              d="M 1058 168 
                 L 1012 252 
                 L 990 252 
                 Q 975 204, 1042 172 Z"
              fill="url(#bowFlareShade)"
              opacity="0.92"
            />
            {/* Knife-Edge Stem Highlight */}
            <line x1="1058" y1="168" x2="1012" y2="252" stroke="#60A5FA" strokeWidth="1.8" opacity="0.75" />

            {/* Crimson Red Antifouling Keel Waterline Boot-Topping */}
            <path
              d="M 70 252 
                 L 1012 252 
                 C 1024 260, 1028 270, 1020 278 
                 C 1008 284, 970 284, 910 284 
                 L 90 284 
                 C 74 284, 66 270, 70 252 Z"
              fill="url(#realKeelCrimson)"
              stroke="#681616"
              strokeWidth="1"
            />

            {/* Submerged Bulbous Bow Profile (Underwater silhouette) */}
            <path
              d="M 1012 252 
                 C 1026 258, 1032 268, 1022 276 
                 C 1014 282, 995 284, 970 284 
                 L 980 274 
                 C 1000 274, 1008 266, 1000 252 Z"
              fill="#7A1C1C"
              opacity="0.85"
            />

            {/* ==============================================================
                MAIN BRANDING: WHITE HULL BAND WITH OFFICIAL FAIRMACS LOGO
                ============================================================== */}
            <path
              d="M 346 210 
                 L 838 210 
                 L 828 248 
                 L 338 248 Z"
              fill="url(#realHullWhite)"
              stroke="#A5BFD8"
              strokeWidth="1.5"
            />
            {/* Steel Weld Seam Accents */}
            <line x1="346" y1="210" x2="838" y2="210" stroke="#FFFFFF" strokeWidth="2" />
            <line x1="338" y1="248" x2="828" y2="248" stroke="#8CA6C1" strokeWidth="1.2" />

            {/* Official Transparent Fairmacs Logo (Tight Crop) */}
            <foreignObject x="360" y="213" width="448" height="34">
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  userSelect: 'none'
                }}
              >
                <img
                  src="/fairmacs-official-logo-tight.png"
                  alt="FAIRMACS"
                  className="vessel-hull-official-logo-img"
                  style={{
                    height: '26px',
                    width: 'auto',
                    objectFit: 'contain',
                    filter: isNight
                      ? 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.95)) brightness(1.25)'
                      : 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.12))'
                  }}
                />
              </div>
            </foreignObject>

            {/* Anchor Hawse Pipes & Recessed Stowed Anchors */}
            <ellipse cx="988" cy="216" rx="6.5" ry="5" fill="#0A121A" stroke="#475569" strokeWidth="1.5" />
            <path d="M 988 216 L 986 230" stroke="#334155" strokeWidth="2.5" />
            <circle cx="986" cy="231" r="3" fill="#1E293B" stroke="#475569" strokeWidth="1" />
            <ellipse cx="1012" cy="208" rx="5.5" ry="4" fill="#0A121A" stroke="#475569" strokeWidth="1.5" />

            {/* Draft Mark Scales (Accurate Marine Depth Numbers) */}
            <g opacity="0.7" fill="#FFFFFF" fontSize="5" fontFamily="monospace">
              <text x="1004" y="246">14M</text>
              <text x="1004" y="252">12M</text>
              <text x="82" y="246">14M</text>
              <text x="82" y="252">12M</text>
            </g>
          </g>
        </svg>
      </div>
    </div>
  );
}
