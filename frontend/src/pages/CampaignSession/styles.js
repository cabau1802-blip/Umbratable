const TOKENS = {
  // Paleta (dark fantasy moderno)
  bgDeep: "#07070a",
  bgBase: "#09090b",
  surface0: "rgba(8, 9, 12, 0.86)",
  surface1: "rgba(255,255,255,0.06)",
  surface2: "rgba(255,255,255,0.03)",
  border1: "rgba(255,255,255,0.10)",
  border2: "rgba(255,255,255,0.16)",
  text: "#e2e8f0",
  muted: "#94a3b8",
  faint: "rgba(226,232,240,0.70)",
  accent: "#facc15",
  accent2: "#8b5cf6",
  danger: "#ef4444",
  success: "#22c55e",

  // Sombras
  shadowSoft: "0 10px 30px rgba(0,0,0,0.40)",
  shadowDeep: "0 24px 70px rgba(0,0,0,0.65)",
  shadowToolbar: "0 18px 55px rgba(0,0,0,0.55)",

  // Radius
  r10: 10,
  r12: 12,
  r14: 14,
  r18: 18,
  pill: 999,

  // Motion
  easeOut: "cubic-bezier(0.2, 0.8, 0.2, 1)",
  dur1: "120ms",
  dur2: "180ms",
  dur3: "240ms",
};

const styles = {
  container: {
    height: "100dvh",
    width: "100%",
    display: "flex",
    flexDirection: "column",
    background: TOKENS.bgBase,
    color: TOKENS.text,
    overflow: "hidden",
    fontFamily: '"Inter", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
  },

  loadingScreen: {
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#000",
    color: TOKENS.accent,
    fontWeight: 800,
    letterSpacing: 0.4,
  },

  errorScreen: {
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    color: "#f00",
    gap: 10,
  },

  header: {
    height: 56,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0 12px",
    zIndex: 50,
    minWidth: 0,
    background:
      "linear-gradient(180deg, rgba(0,0,0,0.70) 0%, rgba(0,0,0,0.25) 55%, rgba(0,0,0,0) 100%)",
    borderBottom: `1px solid ${TOKENS.border1}`,
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
  },

  headerLeft: { display: "flex", alignItems: "center", gap: 10, minWidth: 0 },
  headerRight: { display: "flex", alignItems: "center", gap: 10 },

  heroSelector: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    background: TOKENS.surface1,
    padding: "6px 10px",
    borderRadius: TOKENS.r12,
    border: `1px solid ${TOKENS.border2}`,
    minWidth: 0,
    maxWidth: 360,
    boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
  },

  heroAvatar: {
    width: 30,
    height: 30,
    borderRadius: "50%",
    background: "#f59e0b",
    overflow: "hidden",
    flex: "0 0 auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 10px 22px rgba(0,0,0,0.55)",
    border: "1px solid rgba(255,255,255,0.10)",
  },

  heroSelectWrap: { position: "relative", minWidth: 0, flex: "1 1 auto" },

  heroSelect: {
    width: "100%",
    background: "rgba(2,6,23,0.55)",
    color: TOKENS.accent,
    border: `1px solid ${TOKENS.border2}`,
    borderRadius: TOKENS.r10,
    padding: "8px 30px 8px 12px",
    fontSize: 14,
    fontWeight: "bold",
    outline: "none",
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    transition: `border-color ${TOKENS.dur2} ${TOKENS.easeOut}, background ${TOKENS.dur2} ${TOKENS.easeOut}`,
  },

  selectChevron: {
    position: "absolute",
    right: 10,
    top: "50%",
    transform: "translateY(-50%)",
    pointerEvents: "none",
    color: "rgba(255,255,255,0.65)",
    fontSize: 12,
    fontWeight: 900,
  },

  iconBtn: {
    background: "transparent",
    border: `1px solid ${TOKENS.border1}`,
    color: "#cbd5e1",
    fontSize: 16,
    cursor: "pointer",
    padding: 8,
    borderRadius: TOKENS.r10,
    transition: `transform ${TOKENS.dur1} ${TOKENS.easeOut}, background ${TOKENS.dur2} ${TOKENS.easeOut}, border-color ${TOKENS.dur2} ${TOKENS.easeOut}`,
  },

  iconBtnDanger: {
    background: "transparent",
    border: "1px solid rgba(239,68,68,0.35)",
    color: TOKENS.danger,
    fontSize: 16,
    cursor: "pointer",
    padding: 8,
    borderRadius: TOKENS.r10,
    transition: `transform ${TOKENS.dur1} ${TOKENS.easeOut}, background ${TOKENS.dur2} ${TOKENS.easeOut}, border-color ${TOKENS.dur2} ${TOKENS.easeOut}`,
  },

  btnHeader: {
    background: "rgba(255,255,255,0.10)",
    color: "white",
    border: `1px solid ${TOKENS.border2}`,
    padding: "8px 12px",
    borderRadius: TOKENS.pill,
    fontSize: 12,
    cursor: "pointer",
    fontWeight: 900,
    transition: `transform ${TOKENS.dur1} ${TOKENS.easeOut}, background ${TOKENS.dur2} ${TOKENS.easeOut}, border-color ${TOKENS.dur2} ${TOKENS.easeOut}`,
  },

  btnXp: {
    background: "linear-gradient(135deg, #8b5cf6, #7c3aed)",
    color: "white",
    border: `1px solid rgba(255,255,255,0.14)`,
    padding: "8px 12px",
    borderRadius: TOKENS.pill,
    fontSize: 12,
    cursor: "pointer",
    fontWeight: 900,
    marginRight: 8,
    boxShadow: "0 0 12px rgba(139, 92, 246, 0.45)",
    transition: `transform ${TOKENS.dur1} ${TOKENS.easeOut}, filter ${TOKENS.dur2} ${TOKENS.easeOut}`,
  },

  main: { flex: 1, display: "flex", overflow: "hidden", minHeight: 0, width: "100%" },

  sidebarLeft: {
    width: 300,
    minWidth: 260,
    maxWidth: 380,
    background: TOKENS.surface0,
    borderRight: `1px solid ${TOKENS.border1}`,
    display: "flex",
    flexDirection: "column",
    zIndex: 20,
    minHeight: 0,
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
  },

  sidebarRight: {
    width: 320,
    minWidth: 280,
    maxWidth: 420,
    background: TOKENS.surface0,
    borderLeft: `1px solid ${TOKENS.border1}`,
    display: "flex",
    flexDirection: "column",
    zIndex: 20,
    minHeight: 0,
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
  },

  panelHeader: {
    padding: "12px 12px",
    borderBottom: `1px solid ${TOKENS.border1}`,
    fontSize: 11,
    letterSpacing: 1,
    color: "#a1a1aa",
    fontWeight: 900,
    textTransform: "uppercase",
  },

  chatContainer: { flex: 1, overflowY: "auto", padding: 12, minHeight: 0 },

  chatInputArea: {
    padding: 12,
    borderTop: `1px solid ${TOKENS.border1}`,
    background: "rgba(255,255,255,0.02)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
  },

  chatInput: {
    width: "100%",
    background: "rgba(255,255,255,0.06)",
    border: `1px solid ${TOKENS.border2}`,
    color: "white",
    padding: 10,
    borderRadius: TOKENS.r10,
    outline: "none",
    transition: `border-color ${TOKENS.dur2} ${TOKENS.easeOut}, background ${TOKENS.dur2} ${TOKENS.easeOut}`,
  },

  logEntry: {
    padding: "10px 10px",
    borderRadius: TOKENS.r12,
    border: `1px solid ${TOKENS.border1}`,
    background: TOKENS.surface2,
    marginBottom: 8,
    boxShadow: "0 10px 22px rgba(0,0,0,0.22)",
    transition: `transform ${TOKENS.dur1} ${TOKENS.easeOut}, border-color ${TOKENS.dur2} ${TOKENS.easeOut}, background ${TOKENS.dur2} ${TOKENS.easeOut}`,
  },

  logTop: { display: "flex", alignItems: "center", gap: 8, marginBottom: 6 },

  logTime: {
    fontSize: 10,
    color: "#64748b",
    fontFamily:
      "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace",
  },

  logSender: {
    fontSize: 12,
    color: TOKENS.accent,
    fontWeight: 900,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  logMsg: { fontSize: 12, color: "#e5e7eb", lineHeight: 1.35, wordBreak: "break-word" },

  stage: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    background: "#000",
    position: "relative",
    overflow: "hidden",
    minWidth: 0,
    minHeight: 0,
  },

  mapToolbar: {
    position: "absolute",
    top: 10,
    left: "50%",
    transform: "translateX(-50%)",
    background: "rgba(12,12,16,0.92)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    padding: "8px 10px",
    borderRadius: TOKENS.r14,
    display: "flex",
    gap: 8,
    alignItems: "center",
    zIndex: 4000,
    border: `1px solid ${TOKENS.border2}`,
    boxShadow: TOKENS.shadowToolbar,
    maxWidth: "calc(100% - 20px)",

    // Observação: dropdowns (DarkSelect) agora usam Portal, então isso não impacta mais o menu.
    overflow: "visible",
    overflowX: "auto",
    overflowY: "visible",
    scrollbarWidth: "thin",
  },

  toolGroup: { display: "flex", gap: 6, alignItems: "center", paddingRight: 6 },

  toolBtn: {
    background: "transparent",
    color: "#e5e7eb",
    border: `1px solid ${TOKENS.border2}`,
    cursor: "pointer",
    fontSize: 16,
    padding: "7px 9px",
    borderRadius: TOKENS.r10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 38,
    transition: `transform ${TOKENS.dur1} ${TOKENS.easeOut}, background ${TOKENS.dur2} ${TOKENS.easeOut}, border-color ${TOKENS.dur2} ${TOKENS.easeOut}, filter ${TOKENS.dur2} ${TOKENS.easeOut}`,
  },

  toolBtnDanger: {
    background: "rgba(185,28,28,0.22)",
    color: "#fecaca",
    border: "1px solid rgba(239,68,68,0.35)",
    borderRadius: TOKENS.r10,
    padding: "7px 10px",
    fontSize: 12,
    cursor: "pointer",
    fontWeight: 900,
    whiteSpace: "nowrap",
    transition: `transform ${TOKENS.dur1} ${TOKENS.easeOut}, filter ${TOKENS.dur2} ${TOKENS.easeOut}`,
  },

  divider: { width: 1, height: 22, background: "rgba(255,255,255,0.14)", margin: "0 4px" },

  colorPicker: { display: "flex", gap: 6, alignItems: "center" },

  colorDotBtn: {
    width: 26,
    height: 26,
    borderRadius: TOKENS.pill,
    border: `1px solid ${TOKENS.border2}`,
    background: "transparent",
    padding: 0,
    cursor: "pointer",
    display: "grid",
    placeItems: "center",
    transition: `transform ${TOKENS.dur1} ${TOKENS.easeOut}, border-color ${TOKENS.dur2} ${TOKENS.easeOut}`,
  },

  colorDot: { width: 14, height: 14, borderRadius: TOKENS.pill },

  typePicker: { display: "flex", gap: 6, alignItems: "center" },

  typeBtn: {
    width: 34,
    height: 34,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: TOKENS.r12,
    cursor: "pointer",
    background: "transparent",
    transition: `transform ${TOKENS.dur1} ${TOKENS.easeOut}, background ${TOKENS.dur2} ${TOKENS.easeOut}`,
  },

  mapCanvas: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#050505",
    minHeight: 0,
  },

  mapImage: { width: "100%", height: "100%", objectFit: "contain" },

  emptyStage: { textAlign: "center", color: "#9ca3af" },

  marker: {
    position: "absolute",
    transform: "translate(-50%, -50%)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    cursor: "grab",
    filter: "drop-shadow(0 18px 25px rgba(0,0,0,0.45))",
  },

  avatarMarker: {
    width: 42,
    height: 42,
    borderRadius: "50%",
    border: "2px solid rgba(255,255,255,0.92)",
    overflow: "hidden",
    boxShadow: "0 10px 22px rgba(0,0,0,0.65)",
  },

  markerLabel: {
    marginTop: 6,
    maxWidth: 160,
    padding: "4px 8px",
    borderRadius: TOKENS.r10,
    background: "rgba(0,0,0,0.78)",
    border: "1px solid rgba(250,204,21,0.18)",
    color: TOKENS.accent,
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    textShadow: "0 1px 2px rgba(0,0,0,0.9)",
    pointerEvents: "none",
  },

  tabsRow: {
    display: "flex",
    borderBottom: `1px solid ${TOKENS.border1}`,
    background: "rgba(255,255,255,0.02)",
  },

  tab: {
    flex: 1,
    padding: 12,
    background: "transparent",
    color: "#a1a1aa",
    border: "none",
    cursor: "pointer",
    fontWeight: 900,
    transition: `background ${TOKENS.dur2} ${TOKENS.easeOut}, color ${TOKENS.dur2} ${TOKENS.easeOut}, transform ${TOKENS.dur1} ${TOKENS.easeOut}`,
  },

  tabActive: {
    color: TOKENS.accent,
    borderBottom: `2px solid ${TOKENS.accent}`,
    background: "rgba(250,204,21,0.06)",
  },

  tabContent: { flex: 1, overflowY: "auto", minHeight: 0 },

  diceGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 14 },

  diceBtn: {
    padding: 10,
    borderRadius: TOKENS.r12,
    color: "white",
    cursor: "pointer",
    border: `1px solid ${TOKENS.border2}`,
    transition: `transform ${TOKENS.dur1} ${TOKENS.easeOut}, filter ${TOKENS.dur2} ${TOKENS.easeOut}`,
  },

  rollControls: { display: "flex", gap: 10, alignItems: "center" },

  qtyBox: {
    display: "flex",
    alignItems: "center",
    background: "rgba(255,255,255,0.05)",
    border: `1px solid ${TOKENS.border2}`,
    borderRadius: TOKENS.r12,
    overflow: "hidden",
  },

  qtyBtn: {
    background: "transparent",
    color: "#e5e7eb",
    border: "none",
    width: 36,
    height: 36,
    cursor: "pointer",
    fontSize: 16,
    fontWeight: 900,
    transition: `background ${TOKENS.dur2} ${TOKENS.easeOut}, transform ${TOKENS.dur1} ${TOKENS.easeOut}`,
  },

  qtyVal: { minWidth: 34, textAlign: "center", fontWeight: 900, color: "#e5e7eb" },

  rollBtn: {
    flex: 1,
    height: 38,
    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    color: "white",
    border: `1px solid rgba(255,255,255,0.14)`,
    borderRadius: TOKENS.r12,
    cursor: "pointer",
    fontWeight: 900,
    transition: `transform ${TOKENS.dur1} ${TOKENS.easeOut}, filter ${TOKENS.dur2} ${TOKENS.easeOut}`,
  },

  lastRollCard: {
    background: TOKENS.surface2,
    padding: 14,
    borderRadius: TOKENS.r14,
    marginTop: 14,
    textAlign: "center",
    border: `1px solid ${TOKENS.border2}`,
    boxShadow: "0 16px 35px rgba(0,0,0,0.30)",
  },

  lastRollTitle: { fontSize: 11, color: TOKENS.muted, fontWeight: 900, textTransform: "uppercase" },

  lastRollValue: { fontSize: 28, fontWeight: 900, color: TOKENS.accent, marginTop: 6 },

  lastRollArray: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 6,
    fontFamily:
      "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace",
  },

  combatHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  combatTitle: { fontSize: 12, fontWeight: 900, color: "#a1a1aa", letterSpacing: 1 },

  combatClearBtn: {
    background: "transparent",
    border: "1px solid rgba(255,255,255,0.12)",
    color: "#e5e7eb",
    borderRadius: TOKENS.r10,
    padding: "6px 10px",
    cursor: "pointer",
    fontWeight: 900,
    fontSize: 12,
    transition: `transform ${TOKENS.dur1} ${TOKENS.easeOut}, background ${TOKENS.dur2} ${TOKENS.easeOut}, border-color ${TOKENS.dur2} ${TOKENS.easeOut}`,
  },

  initInputRow: { display: "flex", gap: 8, marginBottom: 10 },

  input: {
    background: "rgba(255,255,255,0.06)",
    border: `1px solid ${TOKENS.border2}`,
    color: "white",
    padding: 10,
    borderRadius: TOKENS.r12,
    outline: "none",
    width: "100%",
    transition: `border-color ${TOKENS.dur2} ${TOKENS.easeOut}, background ${TOKENS.dur2} ${TOKENS.easeOut}`,
  },

  textarea: {
    background: "rgba(255,255,255,0.06)",
    border: `1px solid ${TOKENS.border2}`,
    color: "white",
    padding: 10,
    borderRadius: TOKENS.r12,
    outline: "none",
    width: "100%",
    resize: "vertical",
    transition: `border-color ${TOKENS.dur2} ${TOKENS.easeOut}, background ${TOKENS.dur2} ${TOKENS.easeOut}`,
  },

  eventCard: {
    background: TOKENS.surface2,
    padding: 12,
    borderRadius: TOKENS.r14,
    border: `1px solid ${TOKENS.border2}`,
    boxShadow: "0 16px 35px rgba(0,0,0,0.30)",
    transition: `transform ${TOKENS.dur1} ${TOKENS.easeOut}, border-color ${TOKENS.dur2} ${TOKENS.easeOut}`,
  },

  eventTopRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
    flexWrap: "wrap",
  },

  eventTime: {
    fontSize: 10,
    color: "#64748b",
    fontFamily:
      "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace",
    fontWeight: 900,
  },

  eventBadge: {
    padding: "4px 8px",
    borderRadius: TOKENS.pill,
    background: "rgba(250,204,21,0.10)",
    border: "1px solid rgba(250,204,21,0.22)",
    color: TOKENS.accent,
    fontSize: 11,
    fontWeight: 900,
  },

  eventMeta: { fontSize: 11, color: TOKENS.muted, fontWeight: 900 },

  eventMetaDanger: {
    fontSize: 11,
    color: "#fecaca",
    fontWeight: 900,
    padding: "2px 8px",
    borderRadius: TOKENS.pill,
    background: "rgba(239,68,68,0.12)",
    border: "1px solid rgba(239,68,68,0.25)",
  },

  eventTitle: { fontSize: 12, fontWeight: 900, color: "#e5e7eb", marginBottom: 6 },

  eventContent: { fontSize: 12, color: "#e5e7eb", lineHeight: 1.35, whiteSpace: "pre-wrap" },

  eventTagsRow: { display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 },

  eventTag: {
    fontSize: 11,
    fontWeight: 900,
    color: "#cbd5e1",
    padding: "4px 8px",
    borderRadius: TOKENS.pill,
    border: `1px solid ${TOKENS.border2}`,
    background: "rgba(255,255,255,0.04)",
  },

  inputSmall: {
    background: "rgba(255,255,255,0.06)",
    border: `1px solid ${TOKENS.border2}`,
    color: "white",
    padding: 10,
    borderRadius: TOKENS.r12,
    flex: 1,
    outline: "none",
    transition: `border-color ${TOKENS.dur2} ${TOKENS.easeOut}, background ${TOKENS.dur2} ${TOKENS.easeOut}`,
  },

  inputIni: {
    background: "rgba(255,255,255,0.06)",
    border: `1px solid ${TOKENS.border2}`,
    color: "white",
    padding: 10,
    borderRadius: TOKENS.r12,
    width: 72,
    outline: "none",
    transition: `border-color ${TOKENS.dur2} ${TOKENS.easeOut}, background ${TOKENS.dur2} ${TOKENS.easeOut}`,
  },

  btnAddSmall: {
    background: TOKENS.success,
    color: "#052e12",
    border: "none",
    borderRadius: TOKENS.r12,
    width: 42,
    cursor: "pointer",
    fontWeight: 900,
    transition: `transform ${TOKENS.dur1} ${TOKENS.easeOut}, filter ${TOKENS.dur2} ${TOKENS.easeOut}`,
  },

  initList: { display: "flex", flexDirection: "column", gap: 8, marginTop: 8 },

  initCard: {
    background: TOKENS.surface2,
    padding: 10,
    borderRadius: TOKENS.r14,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    border: `1px solid ${TOKENS.border2}`,
    transition: `transform ${TOKENS.dur1} ${TOKENS.easeOut}, border-color ${TOKENS.dur2} ${TOKENS.easeOut}`,
  },

  initLeft: { display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 },

  initVal: {
    width: 32,
    height: 32,
    borderRadius: TOKENS.r10,
    display: "grid",
    placeItems: "center",
    background: "rgba(250,204,21,0.10)",
    border: "1px solid rgba(250,204,21,0.22)",
    color: TOKENS.accent,
    fontWeight: 900,
    flex: "0 0 auto",
  },

  initName: {
    color: "#e5e7eb",
    fontWeight: 800,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    minWidth: 0,
  },

  btnDelSmall: {
    background: "transparent",
    border: "1px solid rgba(239,68,68,0.25)",
    color: TOKENS.danger,
    cursor: "pointer",
    width: 34,
    height: 34,
    borderRadius: TOKENS.r12,
    fontSize: 18,
    lineHeight: 1,
    display: "grid",
    placeItems: "center",
    transition: `transform ${TOKENS.dur1} ${TOKENS.easeOut}, background ${TOKENS.dur2} ${TOKENS.easeOut}, border-color ${TOKENS.dur2} ${TOKENS.easeOut}`,
  },

  emptyCombat: {
    padding: 12,
    borderRadius: TOKENS.r12,
    border: "1px dashed rgba(255,255,255,0.16)",
    color: TOKENS.muted,
    fontSize: 12,
    textAlign: "center",
  },

  // ==========================================================
  // QUARENTENA / STATUS
  // ==========================================================
  btnQuarantine: {
    background: "rgba(59,130,246,0.15)",
    border: "1px solid rgba(59,130,246,0.35)",
    color: "#dbeafe",
    padding: "8px 10px",
    borderRadius: TOKENS.r12,
    cursor: "pointer",
    fontWeight: 900,
    fontSize: 12,
    display: "flex",
    alignItems: "center",
    gap: 8,
    transition: `transform ${TOKENS.dur1} ${TOKENS.easeOut}, filter ${TOKENS.dur2} ${TOKENS.easeOut}`,
  },

  quarantineCard: {
    width: "min(980px, calc(100% - 24px))",
    maxHeight: "min(80vh, 760px)",
    background: "rgba(9, 9, 11, 0.96)",
    border: `1px solid ${TOKENS.border1}`,
    borderRadius: TOKENS.r18,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    boxShadow: TOKENS.shadowDeep,
  },

  quarantineHeader: {
    padding: 14,
    borderBottom: `1px solid ${TOKENS.border1}`,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
    background: "linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))",
  },

  quarantineTitle: { fontSize: 14, fontWeight: 900, color: "#e5e7eb", letterSpacing: 0.3 },

  quarantineSubtitle: { fontSize: 12, color: TOKENS.muted, fontWeight: 600, maxWidth: 700 },

  quarantineBody: { padding: 14, overflow: "auto", minHeight: 0 },

  quarantineSection: {
    border: `1px solid ${TOKENS.border1}`,
    background: "rgba(255,255,255,0.03)",
    borderRadius: TOKENS.r14,
    padding: 12,
    marginBottom: 12,
  },

  quarantineSectionTitle: { fontSize: 12, fontWeight: 900, color: "#e5e7eb", marginBottom: 10 },

  quarantineList: { display: "flex", flexDirection: "column", gap: 10 },

  quarantineRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    padding: 10,
    borderRadius: TOKENS.r12,
    border: `1px solid ${TOKENS.border1}`,
    background: "rgba(0,0,0,0.25)",
  },

  quarantineItemLeft: { minWidth: 0, flex: 1 },

  quarantineItemName: {
    color: "#e5e7eb",
    fontWeight: 900,
    fontSize: 12,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  quarantineItemDesc: {
    color: TOKENS.muted,
    fontSize: 11,
    marginTop: 3,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  quarantineItemRight: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },

  quarantineError: {
    margin: "10px 14px 0",
    padding: 10,
    borderRadius: TOKENS.r12,
    background: "rgba(239,68,68,0.12)",
    border: "1px solid rgba(239,68,68,0.25)",
    color: "#fecaca",
    fontWeight: 800,
    fontSize: 12,
  },

  quarantineInfo: {
    margin: "10px 14px 0",
    padding: 10,
    borderRadius: TOKENS.r12,
    background: "rgba(255,255,255,0.04)",
    border: `1px solid ${TOKENS.border1}`,
    color: "#cbd5e1",
    fontWeight: 700,
    fontSize: 12,
  },

  statusPill: (status) => ({
    padding: "6px 10px",
    borderRadius: TOKENS.pill,
    fontSize: 11,
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    border:
      status === "approved"
        ? "1px solid rgba(34,197,94,0.35)"
        : status === "blocked"
          ? "1px solid rgba(239,68,68,0.35)"
          : "1px solid rgba(250,204,21,0.35)",
    background:
      status === "approved"
        ? "rgba(34,197,94,0.12)"
        : status === "blocked"
          ? "rgba(239,68,68,0.12)"
          : "rgba(250,204,21,0.10)",
    color: status === "approved" ? "#bbf7d0" : status === "blocked" ? "#fecaca" : "#fde68a",
  }),

  btnApprove: {
    background: "rgba(34,197,94,0.15)",
    border: "1px solid rgba(34,197,94,0.35)",
    color: "#dcfce7",
    padding: "8px 10px",
    borderRadius: TOKENS.r12,
    cursor: "pointer",
    fontWeight: 900,
    fontSize: 12,
    transition: `transform ${TOKENS.dur1} ${TOKENS.easeOut}, filter ${TOKENS.dur2} ${TOKENS.easeOut}`,
  },

  btnBlock: {
    background: "rgba(239,68,68,0.15)",
    border: "1px solid rgba(239,68,68,0.35)",
    color: "#fee2e2",
    padding: "8px 10px",
    borderRadius: TOKENS.r12,
    cursor: "pointer",
    fontWeight: 900,
    fontSize: 12,
    transition: `transform ${TOKENS.dur1} ${TOKENS.easeOut}, filter ${TOKENS.dur2} ${TOKENS.easeOut}`,
  },

  btnGhost: {
    background: "transparent",
    border: `1px solid ${TOKENS.border2}`,
    color: "#e5e7eb",
    padding: "8px 10px",
    borderRadius: TOKENS.r12,
    cursor: "pointer",
    fontWeight: 900,
    fontSize: 12,
    transition: `transform ${TOKENS.dur1} ${TOKENS.easeOut}, background ${TOKENS.dur2} ${TOKENS.easeOut}, border-color ${TOKENS.dur2} ${TOKENS.easeOut}`,
  },

  btnGhostSmall: {
    background: "transparent",
    border: `1px solid ${TOKENS.border2}`,
    color: "#cbd5e1",
    padding: "8px 10px",
    borderRadius: TOKENS.r12,
    cursor: "pointer",
    fontWeight: 900,
    fontSize: 12,
    transition: `transform ${TOKENS.dur1} ${TOKENS.easeOut}, background ${TOKENS.dur2} ${TOKENS.easeOut}, border-color ${TOKENS.dur2} ${TOKENS.easeOut}`,
  },

  btnPrimary: {
    background: "#2563eb",
    border: "1px solid rgba(255,255,255,0.18)",
    color: "white",
    padding: "8px 12px",
    borderRadius: TOKENS.r12,
    cursor: "pointer",
    fontWeight: 900,
    fontSize: 12,
    boxShadow: "0 16px 40px rgba(37, 99, 235, 0.18)",
    transition: `transform ${TOKENS.dur1} ${TOKENS.easeOut}, filter ${TOKENS.dur2} ${TOKENS.easeOut}`,
  },

  // ==========================================================
  // MODAIS GENÉRICOS (Padrão para Eventos/Legado/Quarentena)
  // ==========================================================
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.75)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10000,
  },

  modalCard: {
    width: "min(720px, calc(100% - 24px))",
    maxHeight: "85vh",
    background: "rgba(15, 18, 32, 0.96)",
    borderRadius: TOKENS.r18,
    border: `1px solid ${TOKENS.border2}`,
    boxShadow: "0 30px 80px rgba(0,0,0,0.75)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },

  modalHeader: {
    padding: "14px 18px",
    borderBottom: `1px solid ${TOKENS.border1}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    background: "linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))",
  },

  modalTitle: {
    fontSize: 16,
    fontWeight: 900,
    color: "#f8fafc",
  },

  modalSubtitle: {
    fontSize: 12,
    color: TOKENS.muted,
    marginTop: 2,
  },

  modalBody: {
    padding: 18,
    overflowY: "auto",
    flex: 1,
  },

  modalFooter: {
    padding: "14px 18px",
    borderTop: `1px solid ${TOKENS.border1}`,
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
    background: "rgba(255,255,255,0.02)",
  },

  // Mantive seus estilos existentes
  roleCard: {
    width: "min(520px, calc(100% - 24px))",
    background: "rgba(11,11,14,0.96)",
    padding: 18,
    borderRadius: 16,
    border: `1px solid ${TOKENS.border2}`,
    textAlign: "left",
    boxShadow: TOKENS.shadowDeep,
  },

  exitRow: { display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" },

  btnSuccess: {
    flex: "1 1 200px",
    background: "#16a34a",
    color: "white",
    border: "none",
    padding: "12px 14px",
    borderRadius: TOKENS.r12,
    cursor: "pointer",
    fontWeight: 900,
    boxShadow: "0 16px 40px rgba(22, 163, 74, 0.16)",
    transition: `transform ${TOKENS.dur1} ${TOKENS.easeOut}, filter ${TOKENS.dur2} ${TOKENS.easeOut}`,
  },

  btnDangerFull: {
    flex: "1 1 200px",
    background: "#b91c1c",
    color: "white",
    border: "none",
    padding: "12px 14px",
    borderRadius: TOKENS.r12,
    cursor: "pointer",
    fontWeight: 900,
    boxShadow: "0 16px 40px rgba(185, 28, 28, 0.18)",
    transition: `transform ${TOKENS.dur1} ${TOKENS.easeOut}, filter ${TOKENS.dur2} ${TOKENS.easeOut}`,
  },

  toast: {
    position: "fixed",
    top: 20,
    right: 20,
    padding: "12px 18px",
    borderRadius: TOKENS.r10,
    color: "white",
    fontWeight: "bold",
    zIndex: 9999,
    boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
    fontSize: 14,
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    border: `1px solid ${TOKENS.border1}`,
  },
};

export default styles;
