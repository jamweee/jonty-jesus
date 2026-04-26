import { useState, useEffect, useCallback, useRef } from "react";
import { LOCATIONS, CONTINENTS, TOTAL_WORLDWIDE, mapsUrl } from "./locations.js";
import glasgowPhoto from "../public/photos/glasgow.jpg";

// ---------------------------------------------------------------------------
// Cloudinary config - set in repo Settings > Secrets and variables > Actions,
// then pass via .env (local) or Netlify/Vercel env vars.
// VITE_CLOUDINARY_CLOUD_NAME
// VITE_CLOUDINARY_UPLOAD_PRESET
// ---------------------------------------------------------------------------
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
const CLOUDINARY_READY = Boolean(CLOUD_NAME && UPLOAD_PRESET);

async function compressImage(file) {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    const img = new Image();
    img.onload = () => {
      const MAX = 1400;
      let { width, height } = img;
      if (width > MAX) { height = Math.round((height * MAX) / width); width = MAX; }
      canvas.width = width; canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      canvas.toBlob(resolve, "image/jpeg", 0.82);
    };
    img.src = URL.createObjectURL(file);
  });
}

async function uploadToCloudinary(file) {
  const compressed = await compressImage(file);
  const fd = new FormData();
  fd.append("file", compressed);
  fd.append("upload_preset", UPLOAD_PRESET);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: "POST", body: fd });
  if (!res.ok) throw new Error("Upload failed");
  return (await res.json()).secure_url;
}

// ---------------------------------------------------------------------------
// localStorage persistence
// ---------------------------------------------------------------------------
const LS_KEY = "jonty-visits-v2";

function loadVisits() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}"); }
  catch { return {}; }
}

function saveVisits(v) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(v)); }
  catch { console.warn("localStorage full"); }
}

function todayLabel() {
  return new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

// Default state - Glasgow already visited with bundled photo
const DEFAULTS = {
  glasgow: {
    visited: true,
    visitDate: "April 2026",
    notes: "First one down. Jonty sitting pretty with the man himself in Glasgow.",
    photoUrl: glasgowPhoto,
  },
};

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
export default function App() {
  const [visits, setVisits] = useState({});
  const [filter, setFilter] = useState("All");
  const [activeTab, setActiveTab] = useState("tracker");
  const [expandedId, setExpandedId] = useState("glasgow");
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ date: "", notes: "", photoUrl: "" });
  const [uploadState, setUploadState] = useState("idle");
  const fileRef = useRef(null);

  useEffect(() => {
    const saved = loadVisits();
    const merged = { ...DEFAULTS };
    Object.keys(saved).forEach((id) => { merged[id] = { ...merged[id], ...saved[id] }; });
    setVisits(merged);
  }, []);

  const persist = useCallback((next) => { setVisits(next); saveVisits(next); }, []);

  const toggleVisited = (id) => {
    const v = visits[id] || {};
    const nowVisited = !v.visited;
    persist({
      ...visits,
      [id]: {
        ...v,
        visited: nowVisited,
        // Auto-stamp the date when first marking visited (if none set)
        visitDate: nowVisited && !v.visitDate ? todayLabel() : v.visitDate,
      },
    });
  };

  const openEdit = (loc) => {
    const v = visits[loc.id] || {};
    setEditForm({ date: v.visitDate || "", notes: v.notes || "", photoUrl: v.photoUrl || "" });
    setEditingId(loc.id);
    setExpandedId(loc.id);
    setUploadState("idle");
  };

  const saveEdit = (id) => {
    const v = visits[id] || {};
    persist({
      ...visits,
      [id]: {
        ...v,
        visited: true,
        visitDate: editForm.date || v.visitDate || todayLabel(),
        notes: editForm.notes,
        photoUrl: editForm.photoUrl || v.photoUrl || null,
      },
    });
    setEditingId(null);
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !CLOUDINARY_READY) return;
    setUploadState("uploading");
    try {
      const url = await uploadToCloudinary(file);
      setEditForm((f) => ({ ...f, photoUrl: url }));
      setUploadState("idle");
    } catch { setUploadState("error"); }
    e.target.value = "";
  };

  const allWithVisits = LOCATIONS.map((loc) => ({ ...loc, ...(visits[loc.id] || { visited: false }) }));
  const filtered = filter === "All" ? allWithVisits : allWithVisits.filter((l) => l.continent === filter);
  const filteredVisited = filtered.filter((l) => l.visited);
  const filteredRemaining = filtered.filter((l) => !l.visited);
  const totalVisited = allWithVisits.filter((l) => l.visited).length;
  const pct = Math.round((totalVisited / LOCATIONS.length) * 100);

  const cardProps = (loc) => ({
    loc,
    expanded: expandedId === loc.id,
    editing: editingId === loc.id,
    editForm, uploadState, fileRef,
    onToggleExpand: () => setExpandedId(expandedId === loc.id ? null : loc.id),
    onVisitToggle: () => toggleVisited(loc.id),
    onOpenEdit: () => openEdit(loc),
    onEditFormChange: (field, val) => setEditForm((f) => ({ ...f, [field]: val })),
    onFileChange: handleFile,
    onSave: () => saveEdit(loc.id),
    onCancel: () => setEditingId(null),
  });

  return (
    <div style={{ minHeight: "100vh", background: "#1a1208", fontFamily: "'Crimson Text', 'Cormorant Garamond', Georgia, serif", color: "#e8d9b0" }}>

      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, background: "radial-gradient(ellipse at 50% 0%, rgba(196,163,90,0.07) 0%, transparent 65%)" }} />

      {/* ── Header ── */}
      <header style={{ position: "relative", zIndex: 1, padding: "2.5rem 1.5rem 1.5rem", textAlign: "center", borderBottom: "1px solid rgba(196,163,90,0.2)", background: "linear-gradient(to bottom, #0d0a04, #1a1208)" }}>

        {/* Hero photo */}
        <div style={{ maxWidth: "480px", margin: "0 auto 1.8rem", borderRadius: "10px", overflow: "hidden", border: "1px solid rgba(196,163,90,0.25)", boxShadow: "0 8px 40px rgba(0,0,0,0.6)" }}>
          <img src={glasgowPhoto} alt="Jonty with Homeless Jesus in Glasgow" style={{ width: "100%", display: "block", objectFit: "cover", maxHeight: "320px", objectPosition: "center 30%" }} />
          <div style={{ padding: "0.6rem 1rem", background: "rgba(0,0,0,0.5)", fontSize: "0.75rem", color: "#9a8a60", letterSpacing: "0.12em", textTransform: "uppercase" }}>
            Glasgow, Scotland &mdash; April 2026 &mdash; Statue #1
          </div>
        </div>

        <div style={{ fontSize: "1.8rem", marginBottom: "0.2rem", opacity: 0.7 }}>✞</div>
        <h1 style={{ margin: "0 0 0.3rem", fontSize: "clamp(1.8rem, 6vw, 3rem)", fontWeight: 700, color: "#c4a35a", letterSpacing: "0.04em", lineHeight: 1.1, fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
          Jonty's Bench Quest
        </h1>
        <p style={{ margin: "0 auto 1.5rem", fontSize: "0.78rem", color: "#7a6a4a", letterSpacing: "0.18em", textTransform: "uppercase" }}>
          Tracking every Homeless Jesus worldwide
        </p>

        {/* Stats */}
        <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", background: "rgba(196,163,90,0.06)", border: "1px solid rgba(196,163,90,0.18)", borderRadius: "12px", padding: "1.2rem 2rem", gap: "0.8rem", marginBottom: "1.5rem", minWidth: "280px" }}>
          <div style={{ display: "flex", gap: "2.5rem" }}>
            <Stat value={totalVisited} label="Visited" color="#c4a35a" />
            <Stat value={LOCATIONS.length - totalVisited} label="To Go" color="#5a7a5a" />
            <Stat value={`${TOTAL_WORLDWIDE}+`} label="Worldwide" color="#7a6a4a" />
          </div>
          <div style={{ width: "100%", background: "rgba(255,255,255,0.07)", borderRadius: "999px", height: "6px", overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: "999px", background: "linear-gradient(to right, #8a6a2a, #c4a35a)", width: `${pct}%`, transition: "width 0.6s ease" }} />
          </div>
          <div style={{ fontSize: "0.72rem", color: "#7a6a4a", letterSpacing: "0.06em" }}>
            {totalVisited} of {LOCATIONS.length} tracked &middot; {pct}% &middot; {TOTAL_WORLDWIDE - totalVisited}+ still out there
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem" }}>
          {[{ key: "tracker", label: "All Locations" }, { key: "visited", label: `Log (${totalVisited})` }].map((t) => (
            <button key={t.key} onClick={() => setActiveTab(t.key)} style={{ padding: "0.45rem 1.3rem", borderRadius: "999px", border: `1px solid ${activeTab === t.key ? "rgba(196,163,90,0.5)" : "rgba(196,163,90,0.2)"}`, background: activeTab === t.key ? "rgba(196,163,90,0.15)" : "transparent", color: activeTab === t.key ? "#c4a35a" : "#9a8a60", cursor: "pointer", fontSize: "0.85rem", letterSpacing: "0.06em", transition: "all 0.2s" }}>
              {t.label}
            </button>
          ))}
        </div>
      </header>

      {/* ── Filter bar ── */}
      <div style={{ position: "sticky", top: 0, zIndex: 10, padding: "0.6rem 1rem", display: "flex", gap: "0.4rem", overflowX: "auto", background: "rgba(20,14,5,0.96)", backdropFilter: "blur(8px)", borderBottom: "1px solid rgba(196,163,90,0.12)", scrollbarWidth: "none" }}>
        {CONTINENTS.map((c) => (
          <button key={c} onClick={() => setFilter(c)} style={{ padding: "0.26rem 0.85rem", whiteSpace: "nowrap", borderRadius: "999px", border: `1px solid ${filter === c ? "rgba(196,163,90,0.55)" : "rgba(196,163,90,0.18)"}`, background: filter === c ? "rgba(196,163,90,0.13)" : "transparent", color: filter === c ? "#c4a35a" : "#7a6a4a", cursor: "pointer", fontSize: "0.73rem", letterSpacing: "0.1em", transition: "all 0.15s" }}>
            {c}
          </button>
        ))}
      </div>

      {/* ── Main content ── */}
      <main style={{ position: "relative", zIndex: 1, maxWidth: "680px", margin: "0 auto", padding: "1.5rem 1rem 5rem" }}>
        {activeTab === "tracker" && (
          <>
            {filteredVisited.length > 0 && (
              <Section title="Completed" icon="✓" color="#c4a35a">
                {filteredVisited.map((loc) => <LocationCard key={loc.id} {...cardProps(loc)} />)}
              </Section>
            )}
            {filteredRemaining.length > 0 && (
              <Section title="Yet to Visit" icon="○" color="#5a7a5a">
                {filteredRemaining.map((loc) => <LocationCard key={loc.id} {...cardProps(loc)} />)}
              </Section>
            )}
          </>
        )}

        {activeTab === "visited" && (
          totalVisited === 0 ? (
            <div style={{ textAlign: "center", padding: "4rem 2rem", color: "#7a6a4a" }}>
              <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🪑</div>
              <p style={{ fontSize: "1.1rem" }}>No visits logged yet. Glasgow is a fine start!</p>
            </div>
          ) : (
            <Section title="Jonty's Pilgrimage Log" icon="✝" color="#c4a35a">
              {allWithVisits.filter((l) => l.visited).map((loc) => <LocationCard key={loc.id} {...cardProps(loc)} />)}
            </Section>
          )
        )}

        <div style={{ marginTop: "2.5rem", padding: "1rem 1.2rem", border: "1px solid rgba(196,163,90,0.12)", borderRadius: "8px", fontSize: "0.78rem", color: "#5a4a2a", lineHeight: 1.7, background: "rgba(196,163,90,0.025)", textAlign: "center" }}>
          There are {TOTAL_WORLDWIDE}+ Homeless Jesus statues worldwide by sculptor Timothy Schmalz.
          This tracker covers {LOCATIONS.length} confirmed or reported locations.
          Some exact addresses are still TBC &mdash; help fill them in!
        </div>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------
function Stat({ value, label, color }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: "2.3rem", fontWeight: 700, color, lineHeight: 1, fontFamily: "'Cormorant Garamond', serif" }}>{value}</div>
      <div style={{ fontSize: "0.63rem", textTransform: "uppercase", letterSpacing: "0.15em", color: "#7a6a4a", marginTop: "0.2rem" }}>{label}</div>
    </div>
  );
}

function Section({ title, icon, color, children }) {
  return (
    <div style={{ marginBottom: "2rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.85rem", paddingBottom: "0.45rem", borderBottom: "1px solid rgba(196,163,90,0.18)" }}>
        <span style={{ color, fontSize: "0.85rem" }}>{icon}</span>
        <h2 style={{ margin: 0, fontSize: "0.7rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "#7a6a4a", fontFamily: "'Crimson Text', serif", fontWeight: 400 }}>{title}</h2>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>{children}</div>
    </div>
  );
}

function LocationCard({ loc, expanded, editing, editForm, uploadState, fileRef, onToggleExpand, onVisitToggle, onOpenEdit, onEditFormChange, onFileChange, onSave, onCancel }) {
  return (
    <div style={{ borderRadius: "8px", border: `1px solid ${loc.visited ? "rgba(196,163,90,0.28)" : "rgba(196,163,90,0.1)"}`, background: loc.visited ? "rgba(196,163,90,0.055)" : "rgba(255,255,255,0.018)", overflow: "hidden", transition: "border-color 0.2s" }}>

      {/* Row */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.7rem", padding: "0.75rem 0.9rem", cursor: "pointer", userSelect: "none" }} onClick={onToggleExpand}>

        <button onClick={(e) => { e.stopPropagation(); onVisitToggle(); }} style={{ width: "24px", height: "24px", borderRadius: "50%", flexShrink: 0, border: `2px solid ${loc.visited ? "#c4a35a" : "rgba(196,163,90,0.3)"}`, background: loc.visited ? "#c4a35a" : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#1a1208", fontSize: "0.68rem", fontWeight: 700, transition: "all 0.2s", padding: 0 }} aria-label={loc.visited ? "Mark unvisited" : "Mark visited"}>
          {loc.visited && "✓"}
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "0.35rem", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.95rem" }}>{loc.flag}</span>
            <span style={{ fontSize: "0.95rem", fontWeight: 600, color: loc.visited ? "#c4a35a" : "#d8c990" }}>{loc.city}</span>
            <span style={{ fontSize: "0.7rem", color: "#6a5a3a" }}>{loc.country}</span>
          </div>
          {loc.name !== loc.city && (
            <div style={{ fontSize: "0.72rem", color: "#7a6a4a", marginTop: "0.06rem", lineHeight: 1.3 }}>{loc.name}</div>
          )}
        </div>

        {/* Visit date */}
        {loc.visited && loc.visitDate && (
          <div style={{ fontSize: "0.67rem", color: "#8a7a58", flexShrink: 0, whiteSpace: "nowrap" }}>{loc.visitDate}</div>
        )}

        {/* Photo thumb */}
        {loc.photoUrl && !expanded && (
          <div style={{ width: "30px", height: "30px", borderRadius: "4px", overflow: "hidden", flexShrink: 0, border: "1px solid rgba(196,163,90,0.3)" }}>
            <img src={loc.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        )}

        <div style={{ color: "#6a5a3a", fontSize: "0.62rem", flexShrink: 0, transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▾</div>
      </div>

      {/* Expanded */}
      {expanded && (
        <div style={{ borderTop: "1px solid rgba(196,163,90,0.12)", padding: "1rem", background: "rgba(0,0,0,0.18)" }}>
          {editing
            ? <EditForm form={editForm} uploadState={uploadState} fileRef={fileRef} currentPhotoUrl={loc.photoUrl} onChange={onEditFormChange} onFileChange={onFileChange} onSave={onSave} onCancel={onCancel} />
            : <ViewPanel loc={loc} onEdit={onOpenEdit} onVisitToggle={onVisitToggle} />
          }
        </div>
      )}
    </div>
  );
}

function ViewPanel({ loc, onEdit, onVisitToggle }) {
  return (
    <div>
      {loc.photoUrl && (
        <div style={{ marginBottom: "0.85rem", borderRadius: "6px", overflow: "hidden", border: "1px solid rgba(196,163,90,0.2)", maxHeight: "340px" }}>
          <img src={loc.photoUrl} alt={`Jonty at ${loc.city}`} style={{ width: "100%", display: "block", objectFit: "cover", maxHeight: "340px" }} />
        </div>
      )}
      {loc.notes && (
        <p style={{ margin: "0 0 0.85rem", fontSize: "0.95rem", color: "#b8a870", lineHeight: 1.65, fontStyle: "italic" }}>"{loc.notes}"</p>
      )}
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
        <button onClick={(e) => { e.stopPropagation(); onEdit(); }} style={btn("gold")}>
          {loc.visited ? "Edit entry" : "Log visit"}
        </button>
        {loc.visited && (
          <button onClick={(e) => { e.stopPropagation(); onVisitToggle(); }} style={btn("muted")}>Mark unvisited</button>
        )}
        {!loc.visited && (
          <button onClick={(e) => { e.stopPropagation(); onVisitToggle(); }} style={btn("dim")}>Quick mark visited</button>
        )}
        <a href={mapsUrl(loc)} target="_blank" rel="noopener noreferrer" style={{ ...btn("dim"), textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
          <span style={{ fontSize: "0.75rem" }}>📍</span> Google Maps
        </a>
      </div>
    </div>
  );
}

function EditForm({ form, uploadState, fileRef, currentPhotoUrl, onChange, onFileChange, onSave, onCancel }) {
  const preview = form.photoUrl || currentPhotoUrl;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
      <Field label="Visit date">
        <input value={form.date} onChange={(e) => onChange("date", e.target.value)} placeholder="e.g. April 2026" style={inp} />
      </Field>
      <Field label="Notes">
        <textarea value={form.notes} onChange={(e) => onChange("notes", e.target.value)} placeholder="How was it? Any funny looks from passers-by?" rows={3} style={{ ...inp, resize: "vertical" }} />
      </Field>
      <Field label="Photo">
        {preview && (
          <div style={{ marginBottom: "0.6rem", borderRadius: "6px", overflow: "hidden", border: "1px solid rgba(196,163,90,0.2)", maxHeight: "200px" }}>
            <img src={preview} alt="Preview" style={{ width: "100%", display: "block", objectFit: "cover", maxHeight: "200px" }} />
          </div>
        )}
        {CLOUDINARY_READY ? (
          <div>
            <input type="file" accept="image/*" ref={fileRef} onChange={onFileChange} style={{ display: "none" }} />
            <button onClick={() => fileRef.current?.click()} disabled={uploadState === "uploading"} style={{ ...btn("dim"), opacity: uploadState === "uploading" ? 0.6 : 1 }}>
              {uploadState === "uploading" ? "Uploading..." : preview ? "Replace photo" : "Upload photo"}
            </button>
            {uploadState === "error" && <div style={{ fontSize: "0.76rem", color: "#c47a5a", marginTop: "0.3rem" }}>Upload failed. Check Cloudinary settings.</div>}
          </div>
        ) : (
          <div style={{ fontSize: "0.76rem", color: "#5a4a2a", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(196,163,90,0.15)", borderRadius: "6px", padding: "0.6rem 0.8rem", lineHeight: 1.6 }}>
            To enable photo uploads, add <code style={{ color: "#c4a35a" }}>VITE_CLOUDINARY_CLOUD_NAME</code> and{" "}
            <code style={{ color: "#c4a35a" }}>VITE_CLOUDINARY_UPLOAD_PRESET</code> as environment variables.
            See <code>README.md</code> for setup steps.
          </div>
        )}
      </Field>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button onClick={onSave} style={btn("gold")}>Save</button>
        <button onClick={onCancel} style={btn("muted")}>Cancel</button>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: "0.67rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "#8a7a58", marginBottom: "0.3rem" }}>{label}</label>
      {children}
    </div>
  );
}

const inp = { width: "100%", padding: "0.5rem 0.7rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(196,163,90,0.28)", borderRadius: "6px", color: "#e8d9b0", fontSize: "0.92rem", fontFamily: "'Crimson Text', Georgia, serif", outline: "none", boxSizing: "border-box" };

function btn(v) {
  const base = { padding: "0.36rem 0.95rem", borderRadius: "6px", cursor: "pointer", fontSize: "0.78rem", fontFamily: "'Crimson Text', Georgia, serif", letterSpacing: "0.04em", transition: "all 0.15s", border: "none" };
  if (v === "gold") return { ...base, background: "#c4a35a", color: "#1a1208", fontWeight: 600 };
  if (v === "dim")  return { ...base, background: "rgba(196,163,90,0.1)", color: "#b8a870", border: "1px solid rgba(196,163,90,0.25)" };
  return { ...base, background: "transparent", color: "#8a7a58", border: "1px solid rgba(196,163,90,0.22)" };
}
