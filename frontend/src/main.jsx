import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Link, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import {
  Building2,
  Calendar,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Clock4,
  Download,
  Edit3,
  FileText,
  Filter,
  Hash,
  IdCard,
  LogOut,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Truck,
  UploadCloud,
  User,
  X,
} from "lucide-react";
import "./styles.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const TEHSIL = "Muzaffargarh";
const MAX_RICKSHAWS = 15;
const MIN_TRIPS = 3;
const CUSTOM_WASTE = "Custom / Other";
const WASTE_TYPES = ["Drum Service", "DTD", "Open Plot", CUSTOM_WASTE];
const ALLOWED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"];
const today = () => new Date().toISOString().slice(0, 10);
const supabase = createClient(import.meta.env.VITE_SUPABASE_URL || "", import.meta.env.VITE_SUPABASE_ANON_KEY || "");

const blankEntry = () => ({
  rickshaw_number: "",
  driver_name: "",
  time_in: "",
  time_out: "",
  waste_type: WASTE_TYPES[0],
  custom_waste_type: "",
  trips_count: MIN_TRIPS,
  files: [],
});

function driveThumbnail(url) {
  const match = String(url || "").match(/\/d\/([^/]+)/);
  return match ? `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1000` : url;
}

function isAllowedImage(file) {
  const extension = `.${file.name.split(".").pop() || ""}`.toLowerCase();
  return file.type.startsWith("image/") || ALLOWED_IMAGE_EXTENSIONS.includes(extension);
}

function fileFingerprint(file) {
  return `${file.name.toLowerCase()}-${file.size}-${file.lastModified}`;
}

function Label({ en, ur }) {
  return (
    <span className="label-copy">
      <span>{en}</span>
      {ur && <span className="urdu">({ur})</span>}
    </span>
  );
}

function AppShell({ children }) {
  return (
    <div className="min-h-screen bg-[#eef7ef] text-white sm:grid sm:place-items-start sm:py-4">
      <div className="mobile-shell">
        {children}
      </div>
    </div>
  );
}

function AppTopBar({ title = "Rickshaw Trip Counting", subtitle, right }) {
  return (
    <header className="app-topbar">
      <div>
        <h1>{title}</h1>
        <span className="watermark">Made by Asad Ali</span>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {right}
    </header>
  );
}

function BottomNav() {
  return (
    <nav className="bottom-nav">
      <Link to="/">Entry</Link>
      <Link to="/admin">Admin</Link>
    </nav>
  );
}

function Field({ label, icon: Icon, children }) {
  return (
    <label className="field">
      <span className="field-label">
        {Icon && <Icon size={16} aria-hidden="true" />}
        {label}
      </span>
      {children}
    </label>
  );
}

function StepProgress({ screen, activeIndex, completed, totalEntries }) {
  const base = screen === "supervisor" ? 1 : Math.min(2 + activeIndex, MAX_RICKSHAWS);
  const percent = screen === "supervisor" ? 8 : Math.min(100, Math.round(((activeIndex + 1) / MAX_RICKSHAWS) * 100));
  return (
    <section className="progress-card">
      <div className="flex items-center justify-between">
        <span>Step {base}</span>
        <span>{screen === "supervisor" ? "Supervisor Info" : `Rickshaw ${activeIndex + 1} of ${MAX_RICKSHAWS}`}</span>
      </div>
      <div className="progress-track"><div style={{ width: `${percent}%` }} /></div>
      <p>{completed} of {totalEntries} current rickshaw(s) complete</p>
    </section>
  );
}

function UploadArea({ entry, uploadMessage, onFiles, onRemove }) {
  const inputRef = useRef(null);
  const expected = Number(entry.trips_count || 0);
  const uploaded = entry.files.length;
  const complete = uploaded === expected && expected > 0;
  return (
    <section className="form-card">
      <div className="section-title">
        <div>
          <h2><Camera size={20} /> Upload Photos <span className="urdu">(تصاویر اپ لوڈ کریں)</span></h2>
          <p>Uploaded {uploaded} / {expected} Images</p>
          <p>{Math.max(expected - uploaded, 0)} image(s) remaining</p>
        </div>
        <span className={complete ? "status-pill good" : "status-pill"}>{complete ? "Complete" : "Pending"}</span>
      </div>
      <button
        type="button"
        className="upload-drop"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          onFiles(event.dataTransfer.files);
        }}
      >
        <UploadCloud size={26} />
        <strong>Tap to Upload</strong>
        <span>Exactly {expected || 0} trip photos required</span>
      </button>
      <input
        ref={inputRef}
        hidden
        type="file"
        accept="image/*"
        multiple
        onChange={(event) => {
          onFiles(event.target.files);
          event.target.value = "";
        }}
      />
      {uploadMessage && <p className="upload-message">{uploadMessage}</p>}
      {entry.files.length > 0 && (
        <div className="thumb-grid">
          {entry.files.map((file, index) => (
            <div className="thumb" key={`${file.name}-${index}`}>
              <img src={URL.createObjectURL(file)} alt={`Trip ${index + 1}`} />
              <button type="button" onClick={() => onRemove(index)} aria-label="Remove image"><X size={14} /></button>
            </div>
          ))}
          <button className="thumb add" type="button" onClick={() => inputRef.current?.click()}><Plus size={22} /></button>
        </div>
      )}
    </section>
  );
}

function SupervisorForm() {
  const [screen, setScreen] = useState("supervisor");
  const [header, setHeader] = useState({ supervisor_name: "", tehsil: TEHSIL, uc_ward: "", date: today() });
  const [entries, setEntries] = useState([blankEntry()]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [addAnother, setAddAnother] = useState(false);
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [submitStage, setSubmitStage] = useState("");
  const [successSummary, setSuccessSummary] = useState(null);
  const [uploadMessage, setUploadMessage] = useState("");
  const numberRef = useRef(null);

  const activeEntry = entries[activeIndex] || entries[0];
  const entryComplete = (entry) => {
    const wasteReady = entry.waste_type !== CUSTOM_WASTE || entry.custom_waste_type.trim();
    return ["rickshaw_number", "driver_name", "time_in", "time_out"].every((key) => String(entry[key]).trim())
      && wasteReady
      && Number(entry.trips_count) >= MIN_TRIPS
      && entry.files.length === Number(entry.trips_count);
  };
  const completed = entries.filter(entryComplete).length;
  const totalTrips = entries.reduce((sum, entry) => sum + Number(entry.trips_count || 0), 0);
  const totalImages = entries.reduce((sum, entry) => sum + entry.files.length, 0);
  const headerReady = Object.values(header).every((value) => String(value).trim());
  const canSubmit = headerReady && entries.every(entryComplete) && !submitting;
  const tripCountInvalid = Number(activeEntry?.trips_count || 0) < MIN_TRIPS;

  useEffect(() => {
    if (screen === "rickshaw") numberRef.current?.focus();
  }, [screen, activeIndex]);

  function updateHeader(name, value) {
    setHeader((current) => ({ ...current, [name]: value }));
  }

  function updateEntry(name, value) {
    setEntries((current) => current.map((entry, index) => {
      if (index !== activeIndex) return entry;
      const next = { ...entry, [name]: value };
      if (name === "trips_count") next.files = [];
      return next;
    }));
    if (name === "trips_count") setUploadMessage("");
  }

  function updateFiles(fileList) {
    const selectedFiles = Array.from(fileList || []);
    if (selectedFiles.length === 0) return;
    let nextMessage = "";
    const expected = Number(activeEntry.trips_count || 0);
    const existingKeys = new Set(activeEntry.files.map(fileFingerprint));
    const existingNames = new Set(activeEntry.files.map((file) => file.name.toLowerCase()));
    const nextFiles = [...activeEntry.files];

    for (const file of selectedFiles) {
      if (!isAllowedImage(file)) {
        nextMessage = "Only image files are allowed. صرف تصاویر اپ لوڈ کی جا سکتی ہیں۔";
        continue;
      }

      if (existingKeys.has(fileFingerprint(file)) || existingNames.has(file.name.toLowerCase())) {
        nextMessage = "Duplicate image detected. آپ یہی تصویر پہلے ہی اپ لوڈ کر چکے ہیں۔";
        continue;
      }

      if (nextFiles.length >= expected) {
        nextMessage = `Uploaded ${expected} / ${expected} Images.`;
        continue;
      }

      nextFiles.push(file);
      existingKeys.add(fileFingerprint(file));
      existingNames.add(file.name.toLowerCase());
    }

    setEntries((current) => current.map((entry, index) => index === activeIndex ? { ...entry, files: nextFiles } : entry));
    setUploadMessage(nextMessage);
  }

  function removeImage(imageIndex) {
    setEntries((current) => current.map((entry, index) => index === activeIndex ? { ...entry, files: entry.files.filter((_, itemIndex) => itemIndex !== imageIndex) } : entry));
    setUploadMessage("");
  }

  function addNextRickshaw() {
    if (entries.length >= MAX_RICKSHAWS) return;
    setEntries((current) => [...current, blankEntry()]);
    setActiveIndex(entries.length);
    setAddAnother(false);
    setScreen("rickshaw");
  }

  async function submit(event) {
    event?.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setStatus("");
    setProgress(0);
    setSubmitStage("Preparing Report...");
    const stages = [
      [0, "Preparing Report..."],
      [22, "Sending Data..."],
      [48, "Processing Images..."],
      [76, "Finalizing Submission..."],
      [94, "Almost Done..."],
    ];
    const startedAt = Date.now();
    const estimatedMs = 2400 + totalImages * 850;
    const timer = setInterval(() => {
      setProgress((value) => {
        const elapsed = Date.now() - startedAt;
        const timeTarget = Math.min(96, (elapsed / estimatedMs) * 96);
        const gentleForward = value + Math.max(0.08, (98 - value) * 0.012);
        const next = Math.min(98, Math.max(value, timeTarget, gentleForward));
        const currentStage = [...stages].reverse().find(([threshold]) => next >= threshold)?.[1] || stages[0][1];
        setSubmitStage(currentStage);
        return next;
      });
    }, 180);

    const body = new FormData();
    Object.entries(header).forEach(([key, value]) => body.append(key, value));
    body.append("entries", JSON.stringify(entries.map(({ files, custom_waste_type, ...entry }) => ({
      ...entry,
      waste_type: entry.waste_type === CUSTOM_WASTE ? custom_waste_type : entry.waste_type,
    }))));
    entries.forEach((entry, index) => entry.files.forEach((file) => body.append(`images_${index}`, file)));

    try {
      const response = await fetch(`${API_URL}/submit-report`, { method: "POST", body });
      const contentType = response.headers.get("content-type") || "";
      const result = contentType.includes("application/json") ? await response.json() : { detail: await response.text() };
      const errorDetail = Array.isArray(result.detail)
        ? result.detail.map((item) => item.msg || JSON.stringify(item)).join(", ")
        : result.detail;
      if (!response.ok) throw new Error(errorDetail || "Submission failed");
      clearInterval(timer);
      setSubmitStage("Completed");
      setProgress(100);
      setTimeout(() => {
        setSuccessSummary({ ucWard: header.uc_ward, supervisor: header.supervisor_name, rickshaws: entries.length, trips: totalTrips, images: totalImages });
        setHeader({ supervisor_name: "", tehsil: TEHSIL, uc_ward: "", date: today() });
        setEntries([blankEntry()]);
        setActiveIndex(0);
        setScreen("supervisor");
        setSubmitting(false);
        setStatus("");
        setSubmitStage("");
      }, 450);
    } catch (error) {
      clearInterval(timer);
      setStatus(error.message);
      setProgress(0);
      setSubmitStage("");
      setSubmitting(false);
    }
  }

  return (
    <AppShell>
      {submitting && (
        <div className="modal-layer">
          <div className="native-modal">
            <p className="eyebrow">Submitting</p>
            <h2>Submitting Report</h2>
            <div className="progress-track big"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
            <p>{submitStage}</p>
            <p>{Math.round(progress)}% complete</p>
          </div>
        </div>
      )}
      {successSummary && (
        <div className="modal-layer">
          <div className="celebration-layer" aria-hidden="true">
            {Array.from({ length: 26 }).map((_, index) => (
              <span key={index} style={{ "--i": index }} />
            ))}
          </div>
          <div className="firework firework-one" />
          <div className="firework firework-two" />
          <div className="firework firework-three" />
          <div className="native-modal success-pop success-modal">
            <div className="success-icon"><Check size={30} /></div>
            <h2>Performa Complete</h2>
            <div className="success-identity">
              <span>UC Ward</span>
              <strong>{successSummary.ucWard}</strong>
              <span>Supervisor</span>
              <em>{successSummary.supervisor}</em>
            </div>
            <div className="success-summary-grid">
              <div><Truck size={18} /><strong>{successSummary.rickshaws}</strong><span>Rickshaws</span></div>
              <div><Trash2 size={18} /><strong>{successSummary.trips}</strong><span>Trips</span></div>
              <div><Camera size={18} /><strong>{successSummary.images}</strong><span>Images</span></div>
            </div>
            <button className="app-button primary success-done" type="button" onClick={() => setSuccessSummary(null)}>Done</button>
          </div>
        </div>
      )}

      <AppTopBar title="Rickshaw Trip Counting" subtitle={screen === "supervisor" ? "Supervisor Entry" : `Rickshaw #${activeIndex + 1}`} />
      <StepProgress screen={screen} activeIndex={activeIndex} completed={completed} totalEntries={entries.length} />

      <form onSubmit={submit} className="screen-stack">
        {screen === "supervisor" ? (
          <section className="slide-screen">
            <div className="form-card">
              <h2>Supervisor Information</h2>
              <div className="field-stack">
                <Field icon={User} label={<Label en="Supervisor Name" ur="سپروائزر کا نام" />}><input className="app-input" value={header.supervisor_name} onChange={(event) => updateHeader("supervisor_name", event.target.value)} required /></Field>
                <Field icon={Building2} label={<Label en="Tehsil" ur="تحصیل" />}><input className="app-input muted" value={TEHSIL} readOnly /></Field>
                <Field icon={MapPin} label={<Label en="UC Ward" ur="یوسی / وارڈ" />}><input className="app-input" value={header.uc_ward} onChange={(event) => updateHeader("uc_ward", event.target.value)} required /></Field>
                <Field icon={Calendar} label={<Label en="Date" ur="تاریخ" />}><input className="app-input" type="date" value={header.date} onChange={(event) => updateHeader("date", event.target.value)} required /></Field>
              </div>
            </div>
            <button className="sticky-action app-button primary" type="button" disabled={!headerReady} onClick={() => setScreen("rickshaw")}>Next <ChevronRight size={18} /></button>
          </section>
        ) : (
          <section className="slide-screen">
            <div className="form-card">
              <div className="flex items-center justify-between">
                <h2>Rickshaw Details</h2>
                <span className="mini-pill">{entries.length} added</span>
              </div>
              <div className="field-stack">
                <Field icon={Truck} label={<Label en="Rickshaw Number" ur="رکشہ نمبر" />}><input ref={numberRef} className="app-input" value={activeEntry.rickshaw_number} onChange={(event) => updateEntry("rickshaw_number", event.target.value)} required /></Field>
                <Field icon={IdCard} label={<Label en="Driver Name" ur="ڈرائیور کا نام" />}><input className="app-input" value={activeEntry.driver_name} onChange={(event) => updateEntry("driver_name", event.target.value)} required /></Field>
                <Field icon={Hash} label={<Label en="Trip Count" ur="ٹرپس کی تعداد" />}>
                  <input className="app-input" min={MIN_TRIPS} type="number" value={activeEntry.trips_count} onChange={(event) => updateEntry("trips_count", event.target.value)} required />
                  {tripCountInvalid && <span className="field-error">Minimum Trip Count is 3. کم از کم 3 ٹرپس درج کرنا ضروری ہے۔</span>}
                </Field>
                <div className="time-grid">
                  <Field icon={Clock3} label={<Label en="Start Time" ur="شروع ہونے کا وقت" />}><input className="app-input" type="time" value={activeEntry.time_in} onChange={(event) => updateEntry("time_in", event.target.value)} required /></Field>
                  <Field icon={Clock4} label={<Label en="End Time" ur="اختتامی وقت" />}><input className="app-input" type="time" value={activeEntry.time_out} onChange={(event) => updateEntry("time_out", event.target.value)} required /></Field>
                </div>
                <Field icon={Trash2} label={<Label en="Waste Type" ur="کچرے کی قسم" />}>
                  <select className="app-input" value={activeEntry.waste_type} onChange={(event) => updateEntry("waste_type", event.target.value)} required>
                    {WASTE_TYPES.map((type) => <option key={type}>{type}</option>)}
                  </select>
                </Field>
                {activeEntry.waste_type === CUSTOM_WASTE && (
                  <Field icon={Edit3} label={<Label en="Custom Category" ur="اپنی قسم لکھیں" />}><input className="app-input" value={activeEntry.custom_waste_type} onChange={(event) => updateEntry("custom_waste_type", event.target.value)} required /></Field>
                )}
              </div>
            </div>

            <UploadArea entry={activeEntry} uploadMessage={uploadMessage} onFiles={updateFiles} onRemove={removeImage} />

            <section className="decision-card">
              <h2>Add Another Rickshaw <span className="urdu">(مزید رکشہ شامل کریں)</span></h2>
              <button type="button" className={!addAnother ? "choice selected" : "choice"} onClick={() => setAddAnother(false)}>
                <Check size={18} />
                <span><strong>No, Submit Report</strong><small className="urdu">(رپورٹ جمع کروائیں)</small></span>
              </button>
              <button type="button" className={addAnother ? "choice selected" : "choice"} onClick={() => setAddAnother(true)}>
                <Plus size={18} />
                <span><strong>Yes, Add Another Rickshaw</strong><small className="urdu">(مزید رکشہ شامل کریں)</small></span>
              </button>
            </section>

            <div className="sticky-action split">
              <button className="app-button secondary" type="button" onClick={() => activeIndex === 0 ? setScreen("supervisor") : setActiveIndex(activeIndex - 1)}><ChevronLeft size={18} /> Back</button>
              <button className="app-button primary" type={addAnother ? "button" : "submit"} disabled={addAnother ? !entryComplete(activeEntry) || entries.length >= MAX_RICKSHAWS : !canSubmit} onClick={addAnother ? addNextRickshaw : undefined}>
                {addAnother ? `Add Rickshaw #${entries.length + 1}` : "Submit Report"}
              </button>
            </div>
            {status && <p className="error-banner">{status}</p>}
          </section>
        )}
      </form>
      <BottomNav />
    </AppShell>
  );
}

function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function login(event) {
    event.preventDefault();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (!signInError) return navigate("/admin");
    setError(signInError.message);
  }

  return (
    <AppShell>
      <AppTopBar title="Admin Access" subtitle="Secure reports dashboard" />
      <form onSubmit={login} className="form-card mt-6">
        <div className="mb-4 flex items-center gap-2 text-lg font-semibold"><ShieldCheck size={20} /> Sign in</div>
        <div className="field-stack">
          <Field label="Email"><input className="app-input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></Field>
          <Field label="Password"><input className="app-input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></Field>
        </div>
        <button className="app-button primary mt-5 w-full">Open Dashboard</button>
        {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
      </form>
      <BottomNav />
    </AppShell>
  );
}

function FilterSheet({ filters, setFilters, onClose }) {
  return (
    <div className="modal-layer items-end">
      <div className="bottom-sheet">
        <div className="sheet-handle" />
        <div className="mb-4 flex items-center justify-between">
          <h2>Filters</h2>
          <button className="ghost-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="field-stack">
          <Field label="Search"><input className="app-input" value={filters.query} onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))} /></Field>
          <Field label="Date"><input className="app-input" type="date" value={filters.date} onChange={(event) => setFilters((current) => ({ ...current, date: event.target.value }))} /></Field>
          <Field label="UC Ward"><input className="app-input" value={filters.uc_ward} onChange={(event) => setFilters((current) => ({ ...current, uc_ward: event.target.value }))} /></Field>
          <Field label="Supervisor"><input className="app-input" value={filters.supervisor} onChange={(event) => setFilters((current) => ({ ...current, supervisor: event.target.value }))} /></Field>
          <Field label="Rickshaw Number"><input className="app-input" value={filters.rickshaw} onChange={(event) => setFilters((current) => ({ ...current, rickshaw: event.target.value }))} /></Field>
          <Field label="Trips"><input className="app-input" value={filters.trips} onChange={(event) => setFilters((current) => ({ ...current, trips: event.target.value }))} /></Field>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button className="app-button secondary" onClick={() => setFilters({ query: "", date: "", uc_ward: "", supervisor: "", rickshaw: "", trips: "" })}>Reset</button>
          <button className="app-button primary" onClick={onClose}>Apply</button>
        </div>
      </div>
    </div>
  );
}

function ConfirmModal({ title, body, onCancel, onConfirm }) {
  return (
    <div className="modal-layer">
      <div className="native-modal">
        <h2>{title}</h2>
        <p>{body}</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button className="app-button secondary" onClick={onCancel}>Cancel</button>
          <button className="app-button danger" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}

function Gallery({ entry, onClose, onDelete }) {
  return (
    <div className="modal-layer">
      <div className="gallery-sheet">
        <div className="mb-4 flex items-center justify-between">
          <h2>Rickshaw {entry.rickshaw_number}</h2>
          <button className="ghost-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="gallery-grid">
          {(entry.image_urls || []).map((url, index) => (
            <div className="gallery-item" key={url}>
              <img src={driveThumbnail(url)} alt={`Rickshaw ${entry.rickshaw_number} ${index + 1}`} />
              <div>
                <a href={url} target="_blank" rel="noreferrer">Open</a>
                <button onClick={() => onDelete(index)}><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AdminDashboard() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkingSession, setCheckingSession] = useState(true);
  const [session, setSession] = useState(null);
  const [filters, setFilters] = useState({ query: "", date: "", uc_ward: "", supervisor: "", rickshaw: "", trips: "" });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [gallery, setGallery] = useState(null);
  const [confirmState, setConfirmState] = useState(null);
  const navigate = useNavigate();

  async function loadReports() {
    setLoading(true);
    const { data, error } = await supabase.from("reports").select("*, rickshaw_entries(*)").order("created_at", { ascending: false });
    if (error) console.error(error);
    setReports(data || []);
    setLoading(false);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setCheckingSession(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) loadReports();
  }, [session]);

  const filteredReports = useMemo(() => reports.filter((report) => {
    const entries = report.rickshaw_entries || [];
    const trips = entries.reduce((sum, entry) => sum + Number(entry.trips_count || 0), 0);
    const target = `${report.date} ${report.uc_ward} ${report.supervisor_name} ${entries.map((entry) => `${entry.rickshaw_number} ${entry.driver_name}`).join(" ")}`.toLowerCase();
    return (!filters.query || target.includes(filters.query.toLowerCase()))
      && (!filters.date || report.date === filters.date)
      && (!filters.uc_ward || report.uc_ward?.toLowerCase().includes(filters.uc_ward.toLowerCase()))
      && (!filters.supervisor || report.supervisor_name?.toLowerCase().includes(filters.supervisor.toLowerCase()))
      && (!filters.rickshaw || entries.some((entry) => entry.rickshaw_number?.toLowerCase().includes(filters.rickshaw.toLowerCase())))
      && (!filters.trips || String(trips).includes(filters.trips));
  }), [reports, filters]);

  const allEntries = filteredReports.flatMap((report) => report.rickshaw_entries || []);
  const totalTrips = allEntries.reduce((sum, row) => sum + Number(row.trips_count || 0), 0);
  const uniqueRickshaws = new Set(allEntries.map((entry) => entry.rickshaw_number).filter(Boolean)).size;
  const todaysReports = filteredReports.filter((report) => report.date === today()).length;

  async function apiAction(url, options = {}) {
    const response = await fetch(`${API_URL}${url}`, options);
    if (!response.ok) throw new Error(await response.text());
    await loadReports();
  }

  async function editEntry(entry) {
    const rickshaw_number = prompt("Rickshaw number", entry.rickshaw_number);
    if (rickshaw_number === null) return;
    const driver_name = prompt("Driver name", entry.driver_name);
    if (driver_name === null) return;
    await apiAction(`/rickshaw-entries/${entry.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rickshaw_number, driver_name }),
    });
  }

  if (checkingSession) return <AppShell><div className="skeleton-card" /></AppShell>;
  if (!session) return <Navigate to="/admin/login" />;

  return (
    <AppShell>
      {filtersOpen && <FilterSheet filters={filters} setFilters={setFilters} onClose={() => setFiltersOpen(false)} />}
      {confirmState && <ConfirmModal {...confirmState} onCancel={() => setConfirmState(null)} />}
      {gallery && <Gallery entry={gallery} onClose={() => setGallery(null)} onDelete={(index) => apiAction(`/rickshaw-entries/${gallery.id}/images/${index}`, { method: "DELETE" }).then(() => setGallery(null))} />}

      <AppTopBar
        title="Reports"
        subtitle="Manage submitted reports"
        right={<button className="ghost-icon" onClick={async () => { await supabase.auth.signOut(); navigate("/admin/login"); }}><LogOut size={18} /></button>}
      />

      <div className="stats-strip">
        <div><FileText size={18} /><strong>{filteredReports.length}</strong><span>Reports</span></div>
        <div><UploadCloud size={18} /><strong>{totalTrips}</strong><span>Trips</span></div>
        <div><Truck size={18} /><strong>{uniqueRickshaws}</strong><span>Rickshaws</span></div>
        <div><Calendar size={18} /><strong>{todaysReports}</strong><span>Today</span></div>
      </div>

      <div className="admin-actions">
        <button className="app-button secondary" onClick={() => setFiltersOpen(true)}><Filter size={16} /> Filters</button>
        <a className="app-button primary" href={`${API_URL}/download-all`}><Download size={16} /> Download All</a>
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, index) => <div className="skeleton-card" key={index} />)}</div>
      ) : filteredReports.length === 0 ? (
        <section className="empty-card">
          <Search size={34} />
          <h2>No Reports Found</h2>
          <p>Try changing filters or refresh the list.</p>
          <button className="app-button secondary" onClick={loadReports}><RefreshCw size={16} /> Refresh</button>
        </section>
      ) : (
        <div className="report-list">
          {filteredReports.map((report) => {
            const entries = report.rickshaw_entries || [];
            const trips = entries.reduce((sum, entry) => sum + Number(entry.trips_count || 0), 0);
            const isExpanded = Boolean(expanded[report.id]);
            return (
              <article className="report-card" key={report.id}>
                <button className="report-main" onClick={() => setExpanded((current) => ({ ...current, [report.id]: !isExpanded }))}>
                  <div>
                    <h2>{report.uc_ward}</h2>
                    <p>{report.supervisor_name} · {report.date}</p>
                  </div>
                  <span>{trips} trips</span>
                </button>
                <div className="rickshaw-chip-row">
                  {entries.map((entry) => <button key={entry.id} onClick={() => setGallery(entry)}>{entry.rickshaw_number}</button>)}
                </div>
                <div className="report-actions">
                  {report.pdf_url && <a href={report.pdf_url} target="_blank" rel="noreferrer"><FileText size={16} /> PDF</a>}
                  <a href={`${API_URL}/reports/${report.id}/download`}><Download size={16} /> Download</a>
                  <button onClick={() => setConfirmState({
                    title: "Delete report?",
                    body: `Delete ${report.uc_ward} and all linked rickshaw entries?`,
                    onConfirm: () => apiAction(`/reports/${report.id}`, { method: "DELETE" }).then(() => setConfirmState(null)),
                  })}><Trash2 size={16} /> Delete</button>
                </div>
                {isExpanded && (
                  <div className="expanded-list">
                    {entries.map((entry) => (
                      <div className="entry-line" key={entry.id}>
                        <div>
                          <strong>{entry.rickshaw_number}</strong>
                          <span>{entry.driver_name} · {entry.trips_count} trips · {entry.waste_type}</span>
                        </div>
                        <div>
                          <button onClick={() => editEntry(entry)}><Edit3 size={15} /></button>
                          <button onClick={() => setConfirmState({
                            title: "Delete rickshaw?",
                            body: `Delete rickshaw ${entry.rickshaw_number}?`,
                            onConfirm: () => apiAction(`/rickshaw-entries/${entry.id}`, { method: "DELETE" }).then(() => setConfirmState(null)),
                          })}><Trash2 size={15} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
      <BottomNav />
    </AppShell>
  );
}

function App() {
  useEffect(() => { document.title = "Rickshaw Trip Counting Perfoorma"; }, []);
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SupervisorForm />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

createRoot(document.getElementById("root")).render(<App />);
