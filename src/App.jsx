import { useState, useMemo, useEffect } from "react";
import { UNIVERSITIES, calculateScore } from "./apsCalculators.js";
import { supabase } from "./supabaseClient.js";
import StudentIntakeForm from "./StudentIntakeForm.jsx";
import AdminLogin from "./AdminLogin.jsx";
import AdminDashboard from "./AdminDashboard.jsx";
import { startPayfastCheckout, checkPaymentStatus } from "./payfast.js";

/* ---------- DATA ---------- */

const SUBJECT_GROUPS = {
  Mathematics: ["Mathematics", "Technical Mathematics", "Mathematical Literacy"],
  Science: ["Physical Sciences", "Technical Sciences", "Life Sciences", "Agricultural Sciences"],
  "Business/Commerce": ["Accounting", "Business Studies", "Economics"],
  Technology: [
    "Computer Applications Technology",
    "Information Technology",
    "Engineering Graphics and Design",
    "Civil Technology",
    "Electrical Technology",
    "Mechanical Technology",
  ],
  "Creative Arts": ["Visual Arts", "Design", "Music", "Dramatic Arts", "Dance Studies"],
  Humanities: ["Geography", "History", "Tourism", "Religion Studies"],
  "Consumer Studies": ["Consumer Studies", "Hospitality Studies"],
  "Home Language": [
    "English HL", "Afrikaans HL", "IsiZulu HL", "IsiXhosa HL", "Sepedi HL",
    "Sesotho HL", "Setswana HL", "Tshivenda HL", "Xitsonga HL", "SiSwati HL", "Ndebele HL",
  ],
  "Additional Language": [
    "English", "Afrikaans", "IsiZulu", "IsiXhosa", "Sepedi", "Sesotho",
    "Setswana", "Tshivenda", "Xitsonga", "SiSwati", "Ndebele",
  ],
};

const FACULTIES = {
  "College of Business and Economics": [
    { name: "Diploma in Accounting Sciences", minAps: 17 },
    { name: "BCom Financial Accounting", minAps: 21 },
    { name: "BCom Management Accounting", minAps: 21 },
    { name: "Higher Certificate in Supervisory Management", minAps: 15 },
  ],
  Science: [
    { name: "BSc Life Sciences (Biochemistry & Zoology)", minAps: 20 },
    { name: "BSc Agricultural Science", minAps: 20 },
    { name: "Diploma in Agricultural Management", minAps: 18 },
  ],
  Engineering: [
    { name: "Diploma in Civil Engineering", minAps: 26 },
    { name: "BEng Mechanical Engineering", minAps: 32 },
  ],
  "ICT (Technology)": [
    { name: "Diploma in Business Information Technology", minAps: 24 },
    { name: "BSc Information Technology", minAps: 28 },
  ],
  "Health Sciences": [
    { name: "Higher Certificate in Animal Welfare", minAps: 15 },
    { name: "Diploma in Animal Health", minAps: 18 },
  ],
  Law: [
    { name: "BA (Law) / LLB", minAps: 32 },
    { name: "BCom in Law", minAps: 20 },
    { name: "Diploma in Law", minAps: 18 },
    { name: "Higher Certificate in Law", minAps: 17 },
  ],
  Education: [
    { name: "Diploma in Journalism", minAps: 24 },
    { name: "Diploma in Integrated Communication", minAps: 20 },
    { name: "Bachelor of Education: Intermediate Phase Teaching", minAps: 23 },
    { name: "Bachelor of Education: Senior Phase and FET Teaching", minAps: 23 },
    { name: "Bachelor of Education in Senior and FET Phase: EMS and Accounting", minAps: 23 },
    { name: "Diploma in Early Childhood Care & Education", minAps: 18 },
    { name: "Higher Certificate in Education", minAps: 18 },
  ],
  Humanities: [
    { name: "BA in Criminology", minAps: 20 },
    { name: "BA in Environmental Management", minAps: 20 },
  ],
  "Agriculture (Forestry)": [
    { name: "Diploma in Nature Conservation", minAps: 18 },
    { name: "Diploma in Ornamental Horticulture", minAps: 18 },
  ],
  "Art, Design and Architecture": [
    { name: "BA Consumer Science (Fashion Retail Management)", minAps: 20 },
  ],
  Theology: [{ name: "Higher Certificate in Theology", minAps: 15 }],
  Management: [{ name: "BA Public Management & Governance", minAps: 28 }],
};

function apsLevel(pct) {
  const p = Number(pct);
  if (isNaN(p)) return 0;
  if (p >= 80) return 7;
  if (p >= 70) return 6;
  if (p >= 60) return 5;
  if (p >= 50) return 4;
  if (p >= 40) return 3;
  if (p >= 30) return 2;
  return 1;
}

let uid = 0;
const nextId = () => `s${uid++}`;

/* ---------- UTIL: lock page scroll while a modal is open ---------- */

function useLockBodyScroll(active) {
  useEffect(() => {
    if (!active) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [active]);
}

/* ---------- ALL-UNIVERSITY SCORE BREAKDOWN ---------- */

function AllUniversityScores({ subjects }) {
  const [open, setOpen] = useState(false);

  const results = useMemo(() => {
    return UNIVERSITIES.map((u) => {
      let options = {};
      if (u.archetype === "uct") options = { faculty: "Humanities, Law, Commerce, EBE", disadvantageFactor: 0 };
      if (u.archetype === "cput") options = { method: 1 };
      if (u.archetype === "nmu") options = { quintile1to3: false };
      if (u.archetype === "wsu") options = { isFoundationPhase: false };
      try {
        const r = calculateScore(u.archetype, subjects, options);
        return { ...u, ...r };
      } catch {
        return { ...u, score: "—", scale: "" };
      }
    });
  }, [subjects]);

  const hasMarks = subjects.some((s) => !s.isLO && s.subject && s.pct !== "");

  return (
    <div style={{ marginTop: 16 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%", padding: 12, borderRadius: 12, border: "1.5px solid #E4E7EC",
          background: "#F9FAFB", fontWeight: 700, fontSize: 13, cursor: "pointer",
          display: "flex", justifyContent: "center", alignItems: "center", gap: 6, color: "#344054",
        }}
      >
        {open ? "Hide" : "See"} your APS for every university's own formula {open ? "▲" : "▼"}
      </button>

      {open && (
        <div style={{ marginTop: 10 }}>
          {!hasMarks ? (
            <p style={{ color: "#98A2B3", fontSize: 13, textAlign: "center" }}>
              Fill in your subject marks above to see this.
            </p>
          ) : (
            <>
              <p style={{ fontSize: 12, color: "#98A2B3", marginBottom: 10 }}>
                Universities calculate admission scores differently — this shows your score under each
                one's own formula. A few (UCT, CPUT, NMU, WSU) need extra details like faculty or school
                quintile for a fully precise number; those are shown using standard defaults here, so
                always double-check anything borderline against that university's own calculator.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {results.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "10px 12px", borderRadius: 10, background: "#F9FAFB", fontSize: 13,
                    }}
                  >
                    <span style={{ fontWeight: 700 }}>{r.name}</span>
                    <span style={{ color: "#1D4ED8", fontWeight: 800 }}>
                      {r.score} <span style={{ color: "#98A2B3", fontWeight: 600, fontSize: 11 }}>({r.scale})</span>
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- UI ATOMS ---------- */

function ProgressBar({ step, total }) {
  return (
    <div style={{ height: 6, background: "#E4E7EC", borderRadius: 4, overflow: "hidden" }}>
      <div
        style={{
          height: "100%",
          width: `${(step / total) * 100}%`,
          background: "#1D4ED8",
          transition: "width .3s ease",
        }}
      />
    </div>
  );
}

/* ---------- STEP 1: ENTER MARKS ---------- */

function EnterMarks({ subjects, setSubjects, aps, scale, onContinue }) {
  const update = (id, field, value) =>
    setSubjects((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));

  const remove = (id) => setSubjects((prev) => prev.filter((s) => s.id !== id));

  const addSubject = () =>
    setSubjects((prev) => [...prev, { id: nextId(), subject: "", pct: "", isLO: false }]);

  const filledCount = subjects.filter((s) => !s.isLO && s.subject && s.pct !== "").length;
  const canContinue = filledCount >= 6;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, margin: 0, letterSpacing: -0.5 }}>ENTER MARKS</h1>
        <div
          style={{
            width: 64, height: 64, borderRadius: "50%",
            background: "#1D4ED8", color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 800, fontSize: 22,
            boxShadow: "0 0 0 6px rgba(29,78,216,0.15)",
          }}
        >
          {aps}
        </div>
      </div>
      <p style={{ color: "#667085", marginTop: 12, fontSize: 15 }}>
        This will be used to calculate your APS and recommend the best courses for you
      </p>
      <AllUniversityScores subjects={subjects} />

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 24 }}>
        {subjects.map((s) => (
          <div
            key={s.id}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              border: "1.5px solid #E4E7EC", borderRadius: 14, padding: "12px 14px",
            }}
          >
            {s.isLO ? (
              <div style={{ flex: 1, fontWeight: 700 }}>Life Orientation</div>
            ) : (
              <select
                value={s.subject}
                onChange={(e) => update(s.id, "subject", e.target.value)}
                style={{
                  flex: 1, border: "none", background: "transparent", fontWeight: 700,
                  fontSize: 15, outline: "none", color: "#101828",
                }}
              >
                <option value="">Select subject</option>
                {Object.entries(SUBJECT_GROUPS).map(([group, subs]) => (
                  <optgroup label={group} key={group}>
                    {subs.map((sub) => (
                      <option value={sub} key={sub}>{sub}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            )}
            <input
              type="number"
              min="0"
              max="100"
              placeholder="%"
              value={s.pct}
              onChange={(e) => update(s.id, "pct", e.target.value)}
              style={{
                width: 64, textAlign: "center", padding: "8px 6px",
                borderRadius: 10, border: "1px solid #E4E7EC", background: "#F9FAFB",
                fontWeight: 600,
              }}
            />
            {s.isLO ? (
              <span
                style={{
                  background: "#FDF0D5", color: "#92400E", fontWeight: 800,
                  fontSize: 12, padding: "6px 10px", borderRadius: 999,
                }}
              >
                LO
              </span>
            ) : (
              <span
                style={{
                  width: 30, height: 30, borderRadius: "50%",
                  background: s.pct ? "#DBEAFE" : "#F2F4F7",
                  color: "#1D4ED8", fontWeight: 800, fontSize: 13,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                {s.pct ? apsLevel(s.pct) : "–"}
              </span>
            )}
            {!s.isLO && (
              <button
                onClick={() => remove(s.id)}
                aria-label="Remove subject"
                style={{ border: "none", background: "none", cursor: "pointer", color: "#98A2B3", fontSize: 18 }}
              >
                🗑
              </button>
            )}
          </div>
        ))}

        <button
          onClick={addSubject}
          style={{
            border: "1.5px dashed #93B4F5", color: "#1D4ED8", background: "#F5F8FF",
            borderRadius: 14, padding: "14px", fontWeight: 700, cursor: "pointer",
          }}
        >
          + Add another subject
        </button>
      </div>

      <button
        onClick={onContinue}
        disabled={!canContinue}
        style={{
          marginTop: 24, width: "100%", padding: "16px", borderRadius: 999,
          border: "none", fontWeight: 800, fontSize: 16, cursor: canContinue ? "pointer" : "not-allowed",
          background: canContinue ? "#101828" : "#D0D5DD", color: "#fff",
        }}
      >
        CONTINUE
      </button>
      {!canContinue && (
        <p style={{ textAlign: "center", color: "#98A2B3", fontSize: 13, marginTop: 8 }}>
          Fill in at least 6 subjects to continue ({filledCount}/6)
        </p>
      )}
    </div>
  );
}

/* ---------- STEP 2: CHOOSE COURSES ---------- */

function ChooseCourses({ selected, setSelected, onContinue, onBack, universityId }) {
  const [openFaculty, setOpenFaculty] = useState(null);
  const [warn, setWarn] = useState(false);
  const [facultyData, setFacultyData] = useState(null); // null = loading, {} = loaded
  useLockBodyScroll(!!openFaculty || warn);

  useEffect(() => {
    let cancelled = false;
    async function loadCourses() {
      const { data, error } = await supabase.from("courses").select("*");
      if (cancelled) return;
      if (error || !data || data.length === 0) {
        setFacultyData(FACULTIES); // fall back to placeholder data
        return;
      }
      const grouped = {};
      data.forEach((c) => {
        if (!grouped[c.faculty]) grouped[c.faculty] = [];
        grouped[c.faculty].push({ name: c.course_name, minAps: c.min_score, requirements: c.requirements });
      });
      setFacultyData(grouped);
    }
    loadCourses();
    return () => { cancelled = true; };
  }, [universityId]);

  const toggleCourse = (course, faculty) => {
    setSelected((prev) => {
      const exists = prev.find((c) => c.name === course.name);
      if (exists) return prev.filter((c) => c.name !== course.name);
      if (prev.length >= 6) return prev;
      return [...prev, { ...course, faculty }];
    });
  };

  const handleContinue = () => {
    if (selected.length < 4) {
      setWarn(true);
      return;
    }
    onContinue();
  };

  if (!facultyData) {
    return <p style={{ color: "#98A2B3", textAlign: "center", marginTop: 60 }}>Loading courses...</p>;
  }

  return (
    <div>
      <h1 style={{ fontSize: 30, fontWeight: 800, margin: 0 }}>CHOOSE YOUR COURSES</h1>
      <p style={{ color: "#667085", marginTop: 10 }}>
        Click a faculty to view its courses. Select between 4 and 6 courses.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 20 }}>
        {Object.keys(facultyData).map((fac) => (
          <button
            key={fac}
            onClick={() => setOpenFaculty(fac)}
            style={{
              border: `1.5px solid ${openFaculty === fac ? "#1D4ED8" : "#E4E7EC"}`,
              borderRadius: 16, minHeight: 100, background: "#fff",
              fontWeight: 700, fontSize: 15, cursor: "pointer", padding: 12,
            }}
          >
            {fac}
          </button>
        ))}
      </div>

      <div style={{ marginTop: 16, fontSize: 14, color: "#475467" }}>
        {selected.length}/6 total courses selected
      </div>

      <button
        onClick={handleContinue}
        style={{
          marginTop: 20, width: "100%", padding: "16px", borderRadius: 999,
          border: "none", fontWeight: 800, fontSize: 16, cursor: "pointer",
          background: "#101828", color: "#fff",
        }}
      >
        CONTINUE
      </button>
      <button
        onClick={onBack}
        style={{
          marginTop: 12, width: "100%", background: "none", border: "none",
          color: "#667085", fontWeight: 600, cursor: "pointer",
        }}
      >
        ← Back to marks
      </button>

      {openFaculty && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(16,24,40,0.5)",
            display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 20,
          }}
          onClick={() => setOpenFaculty(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff", width: "100%", maxWidth: 480, borderRadius: "20px 20px 0 0",
              maxHeight: "80vh", overflowY: "auto", padding: 20,
            }}
          >
            <h3 style={{ marginTop: 0 }}>{openFaculty}</h3>
            {facultyData[openFaculty].map((course) => {
              const isChecked = selected.some((c) => c.name === course.name);
              return (
                <div
                  key={course.name}
                  onClick={() => toggleCourse(course, openFaculty)}
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    border: `1.5px solid ${isChecked ? "#1D4ED8" : "#E4E7EC"}`,
                    background: isChecked ? "#EFF4FF" : "#fff",
                    borderRadius: 14, padding: 14, marginBottom: 10, cursor: "pointer",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700 }}>{course.name}</div>
                    <div style={{ color: "#667085", fontSize: 13 }}>Min APS: {course.minAps}</div>
                  </div>
                  <div
                    style={{
                      width: 26, height: 26, borderRadius: "50%",
                      background: isChecked ? "#1D4ED8" : "#F2F4F7",
                      color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: 800,
                    }}
                  >
                    {isChecked ? "✓" : ""}
                  </div>
                </div>
              );
            })}
            <button
              onClick={() => setOpenFaculty(null)}
              style={{
                width: "100%", padding: 14, borderRadius: 999, border: "none",
                background: "#101828", color: "#fff", fontWeight: 800, marginTop: 8,
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {warn && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(16,24,40,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 30,
          }}
          onClick={() => setWarn(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 20, padding: 24, width: 320, textAlign: "center" }}
          >
            <p style={{ fontWeight: 700 }}>
              A minimum of 4 courses is required to proceed. You currently have {selected.length} courses selected.
            </p>
            <button
              onClick={() => setWarn(false)}
              style={{
                marginTop: 12, padding: "12px 24px", borderRadius: 999, border: "none",
                background: "#101828", color: "#fff", fontWeight: 800, cursor: "pointer",
              }}
            >
              OK, I'll add more
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- STEP 3: REVIEW ---------- */

function Review({ selected, setSelected, aps, onBack }) {
  const [showIntake, setShowIntake] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showCongrats, setShowCongrats] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [payState, setPayState] = useState("idle"); // idle | redirecting | confirming | failed

  const qualifyingCount = useMemo(
    () => selected.filter((c) => aps >= c.minAps).length,
    [selected, aps]
  );

  // Handle returning from PayFast (either after paying or cancelling).
  useEffect(() => {
    const url = new URL(window.location.href);
    const pfRef = url.searchParams.get("pf_ref");
    const pfCancelled = url.searchParams.get("pf_cancelled");

    if (pfCancelled) {
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }

    if (pfRef) {
      setPayState("confirming");
      checkPaymentStatus(supabase, pfRef).then((ok) => {
        window.history.replaceState({}, "", window.location.pathname);
        if (ok) {
          const saved = localStorage.getItem("acadia_pending_payment");
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.matchedCourses) setSelected(parsed.matchedCourses);
          }
          localStorage.removeItem("acadia_pending_payment");
          setPayState("idle");
          setShowIntake(true);
        } else {
          setPayState("failed");
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleContinue = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setShowCongrats(true);
    }, 1800);
  };

  const handlePay = async () => {
    setShowPaywall(false);
    setPayState("redirecting");
    await startPayfastCheckout({
      supabase,
      amount: 19,
      matchedCourses: selected,
      apsScore: aps,
    });
    // Browser navigates away to PayFast here; if it fails, reset state.
    setPayState("idle");
  };

  return (
    <div>
      <button
        onClick={onBack}
        style={{ background: "none", border: "none", color: "#667085", fontWeight: 600, cursor: "pointer", marginBottom: 8 }}
      >
        ← Back to faculties
      </button>
      <h1 style={{ fontSize: 30, fontWeight: 800, margin: 0 }}>REVIEW YOUR COURSES</h1>
      <p style={{ color: "#667085", marginTop: 10 }}>
        You have selected <b style={{ color: "#1D4ED8" }}>{selected.length}</b> courses.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
        {selected.map((c) => (
          <div
            key={c.name}
            style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              background: "#F9FAFB", borderRadius: 14, padding: 14,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span>📄</span>
              <div>
                <div style={{ fontWeight: 700 }}>{c.name}</div>
                <div style={{ color: "#98A2B3", fontSize: 13 }}>{c.faculty}</div>
              </div>
            </div>
            <button
              onClick={() => setSelected((prev) => prev.filter((x) => x.name !== c.name))}
              style={{ border: "none", background: "none", color: "#98A2B3", cursor: "pointer", fontSize: 16 }}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={handleContinue}
        style={{
          marginTop: 24, width: "100%", padding: "16px", borderRadius: 999,
          border: "none", fontWeight: 800, fontSize: 16, cursor: "pointer",
          background: "#101828", color: "#fff",
        }}
      >
        CONTINUE
      </button>

      {loading && (
        <div style={{ textAlign: "center", marginTop: 40 }}>
          <div style={{ fontSize: 32 }}>✦</div>
          <p style={{ fontWeight: 700, marginTop: 10 }}>Finding Courses...</p>
        </div>
      )}

      {showCongrats && (
        <Modal onClose={() => setShowCongrats(false)}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 40, color: "#12B76A" }}>✓</div>
            <h2 style={{ margin: "12px 0" }}>Congratulations!</h2>
            <p style={{ color: "#475467" }}>
              Acadia has found <b>{qualifyingCount}</b> universities you qualify for based on your marks and course selections.
            </p>
            <button
              onClick={() => { setShowCongrats(false); setShowPaywall(true); }}
              style={{
                width: "100%", padding: 14, borderRadius: 999, border: "none",
                background: "#101828", color: "#fff", fontWeight: 800, cursor: "pointer", marginTop: 8,
              }}
            >
              SEE RESULTS
            </button>
            <button
              onClick={() => setShowCongrats(false)}
              style={{ background: "none", border: "none", color: "#98A2B3", marginTop: 10, cursor: "pointer" }}
            >
              Go back
            </button>
          </div>
        </Modal>
      )}

      {showPaywall && (
        <Modal onClose={() => setShowPaywall(false)}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 40, color: "#12B76A" }}>✓</div>
            <h2 style={{ margin: "12px 0" }}>See Your Results</h2>
            <p style={{ color: "#475467" }}>
              Acadia has found <b>{qualifyingCount}</b> universities you qualify for. Pay R19 to unlock all details.
            </p>
            <button
              onClick={handlePay}
              style={{
                width: "100%", padding: 14, borderRadius: 999, border: "none",
                background: "#12B76A", color: "#fff", fontWeight: 800, cursor: "pointer", marginTop: 8,
              }}
            >
              💳 Pay R19 — Unlock Results
            </button>
            <p style={{ color: "#98A2B3", fontSize: 12, marginTop: 10 }}>🔒 Secure payment via PayFast</p>
          </div>
        </Modal>
      )}

      {payState === "redirecting" && (
        <Modal>
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <p style={{ fontWeight: 700 }}>Taking you to PayFast to complete payment...</p>
          </div>
        </Modal>
      )}

      {payState === "confirming" && (
        <Modal>
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 32 }}>✦</div>
            <p style={{ fontWeight: 700, marginTop: 10 }}>Confirming your payment...</p>
            <p style={{ color: "#98A2B3", fontSize: 13 }}>This usually takes a few seconds.</p>
          </div>
        </Modal>
      )}

      {payState === "failed" && (
        <Modal onClose={() => setPayState("idle")}>
          <div style={{ textAlign: "center", padding: "10px 0" }}>
            <div style={{ fontSize: 32, color: "#D92D20" }}>✕</div>
            <h2 style={{ margin: "12px 0" }}>Payment not confirmed</h2>
            <p style={{ color: "#475467", fontSize: 14 }}>
              We couldn't confirm your payment yet. If money left your account, it may just need a
              minute more — otherwise please try again.
            </p>
            <button
              onClick={() => { setPayState("idle"); setShowPaywall(true); }}
              style={{
                width: "100%", padding: 14, borderRadius: 999, border: "none",
                background: "#101828", color: "#fff", fontWeight: 800, cursor: "pointer", marginTop: 8,
              }}
            >
              Try again
            </button>
          </div>
        </Modal>
      )}

      {showIntake && (
        <Modal onClose={() => setShowIntake(false)}>
          <StudentIntakeForm
            matchedCourses={selected}
            apsScore={aps}
          />
        </Modal>
      )}
    </div>
  );
}

function Modal({ children, onClose }) {
  useLockBodyScroll(true);
  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(16,24,40,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 40,
      }}
      onClick={() => onClose && onClose()}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff", borderRadius: 20, padding: 28, width: 340,
          maxHeight: "85vh", overflowY: "auto", WebkitOverflowScrolling: "touch",
        }}
      >
        {children}
      </div>
    </div>
  );
}

/* ---------- ROOT APP ---------- */

function StudentApp() {
  const [step, setStep] = useState(1);
  const [subjects, setSubjects] = useState(() => [
    { id: nextId(), subject: "", pct: "", isLO: false },
    { id: nextId(), subject: "", pct: "", isLO: false },
    { id: nextId(), subject: "", pct: "", isLO: false },
    { id: nextId(), subject: "Life Orientation", pct: "", isLO: true },
  ]);
  const [selectedCourses, setSelectedCourses] = useState([]);

  // Standard 1-42 scale (NWU/UJ/UL/DUT/UNIZULU archetype) — used as the
  // headline number and for matching against the course database's minAps
  // thresholds. Each university's own formula is available via the
  // "See your APS for every university" breakdown on the marks screen.
  const standardAps = useMemo(
    () =>
      subjects
        .filter((s) => !s.isLO && s.pct !== "")
        .reduce((sum, s) => sum + apsLevel(s.pct), 0),
    [subjects]
  );

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: "#fff", minHeight: "100vh" }}>
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "24px 20px 60px" }}>
        <ProgressBar step={step} total={3} />
        <div style={{ marginTop: 28 }}>
          {step === 1 && (
            <EnterMarks
              subjects={subjects}
              setSubjects={setSubjects}
              aps={standardAps}
              onContinue={() => setStep(2)}
            />
          )}
          {step === 2 && (
            <ChooseCourses
              selected={selectedCourses}
              setSelected={setSelectedCourses}
              onContinue={() => setStep(3)}
              onBack={() => setStep(1)}
            />
          )}
          {step === 3 && (
            <Review
              selected={selectedCourses}
              setSelected={setSelectedCourses}
              aps={standardAps}
              onBack={() => setStep(2)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- ADMIN APP (routed at /admin) ---------- */

function AdminApp() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  if (loading) return null;
  if (!session) return <AdminLogin onLoggedIn={() => {}} />;
  return <AdminDashboard />;
}

/* ---------- TOP-LEVEL ROUTER ---------- */

export default function App() {
  const isAdminRoute = typeof window !== "undefined" && window.location.pathname.startsWith("/admin");
  return isAdminRoute ? <AdminApp /> : <StudentApp />;
}
