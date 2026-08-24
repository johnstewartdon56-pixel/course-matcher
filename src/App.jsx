import { useState, useMemo, useEffect } from "react";
import { UNIVERSITIES, calculateScore } from "./apsCalculators.js";
import { supabase } from "./supabaseClient.js";
import StudentIntakeForm from "./StudentIntakeForm.jsx";
import AdminLogin from "./AdminLogin.jsx";
import AdminDashboard from "./AdminDashboard.jsx";

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

/* ---------- STEP 0: SELECT UNIVERSITY ---------- */

function SelectUniversity({ university, setUniversity, options, setOptions, onContinue }) {
  const selected = UNIVERSITIES.find((u) => u.id === university);

  return (
    <div>
      <h1 style={{ fontSize: 30, fontWeight: 800, margin: 0 }}>SELECT UNIVERSITY</h1>
      <p style={{ color: "#667085", marginTop: 10 }}>
        Every university calculates admission scores differently — pick yours so we use the right formula.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 20 }}>
        {UNIVERSITIES.map((u) => (
          <button
            key={u.id}
            onClick={() => setUniversity(u.id)}
            style={{
              textAlign: "left", padding: 16, borderRadius: 14, cursor: "pointer",
              border: `1.5px solid ${university === u.id ? "#1D4ED8" : "#E4E7EC"}`,
              background: university === u.id ? "#EFF4FF" : "#fff",
              fontWeight: 700, fontSize: 15,
            }}
          >
            {u.name}
          </button>
        ))}
      </div>

      {selected?.archetype === "uct" && (
        <div style={{ marginTop: 16, padding: 16, background: "#F9FAFB", borderRadius: 14 }}>
          <label style={{ fontWeight: 700, fontSize: 13 }}>Faculty</label>
          <select
            value={options.faculty || "Humanities, Law, Commerce, EBE"}
            onChange={(e) => setOptions((o) => ({ ...o, faculty: e.target.value }))}
            style={{ width: "100%", marginTop: 6, padding: 10, borderRadius: 10, border: "1px solid #E4E7EC" }}
          >
            <option>Humanities, Law, Commerce, EBE</option>
            <option>Science</option>
            <option>Health Sciences</option>
          </select>
          <label style={{ fontWeight: 700, fontSize: 13, marginTop: 12, display: "block" }}>
            Disadvantage factor (%)
          </label>
          <input
            type="number" min="0" max="20"
            value={options.disadvantageFactor || 0}
            onChange={(e) => setOptions((o) => ({ ...o, disadvantageFactor: e.target.value }))}
            style={{ width: "100%", marginTop: 6, padding: 10, borderRadius: 10, border: "1px solid #E4E7EC" }}
          />
        </div>
      )}

      {selected?.archetype === "cput" && (
        <div style={{ marginTop: 16, padding: 16, background: "#F9FAFB", borderRadius: 14 }}>
          <label style={{ fontWeight: 700, fontSize: 13 }}>Programme type</label>
          <select
            value={options.method || 1}
            onChange={(e) => setOptions((o) => ({ ...o, method: Number(e.target.value) }))}
            style={{ width: "100%", marginTop: 6, padding: 10, borderRadius: 10, border: "1px solid #E4E7EC" }}
          >
            <option value={1}>Standard</option>
            <option value={2}>Science / Engineering</option>
            <option value={3}>Accountancy / Business</option>
          </select>
        </div>
      )}

      {selected?.archetype === "nmu" && (
        <div style={{ marginTop: 16, padding: 16, background: "#F9FAFB", borderRadius: 14, display: "flex", alignItems: "center", gap: 10 }}>
          <input
            type="checkbox"
            checked={!!options.quintile1to3}
            onChange={(e) => setOptions((o) => ({ ...o, quintile1to3: e.target.checked }))}
          />
          <label style={{ fontWeight: 700, fontSize: 14 }}>I attend a Quintile 1–3 (non-fee-paying) school</label>
        </div>
      )}

      {selected?.archetype === "wsu" && (
        <div style={{ marginTop: 16, padding: 16, background: "#F9FAFB", borderRadius: 14, display: "flex", alignItems: "center", gap: 10 }}>
          <input
            type="checkbox"
            checked={!!options.isFoundationPhase}
            onChange={(e) => setOptions((o) => ({ ...o, isFoundationPhase: e.target.checked }))}
          />
          <label style={{ fontWeight: 700, fontSize: 14 }}>Applying for B.Ed Foundation Phase</label>
        </div>
      )}

      <button
        onClick={onContinue}
        disabled={!university}
        style={{
          marginTop: 24, width: "100%", padding: "16px", borderRadius: 999,
          border: "none", fontWeight: 800, fontSize: 16, cursor: university ? "pointer" : "not-allowed",
          background: university ? "#101828" : "#D0D5DD", color: "#fff",
        }}
      >
        CONTINUE
      </button>
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
        This will be used to calculate your admission score ({scale}) and recommend the best courses for you
      </p>

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

function Review({ selected, setSelected, aps, universityScore, universityId, onBack }) {
  const [showIntake, setShowIntake] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showCongrats, setShowCongrats] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  const qualifyingCount = useMemo(
    () => selected.filter((c) => aps >= c.minAps).length,
    [selected, aps]
  );

  const handleContinue = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setShowCongrats(true);
    }, 1800);
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

      {universityScore?.scale && (
        <div style={{ background: "#F9FAFB", borderRadius: 14, padding: 14, marginTop: 8, marginBottom: 4 }}>
          <div style={{ fontSize: 13, color: "#667085" }}>Your score for this university</div>
          <div style={{ fontWeight: 800, fontSize: 20, color: "#1D4ED8" }}>
            {universityScore.score} <span style={{ fontSize: 13, color: "#98A2B3", fontWeight: 600 }}>({universityScore.scale})</span>
          </div>
          <div style={{ fontSize: 12, color: "#98A2B3", marginTop: 4 }}>
            Course matching below uses the standard 1–42 APS scale — always confirm your exact score against the university's own official calculator.
          </div>
        </div>
      )}

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
              Skolify has found <b>{qualifyingCount}</b> universities you qualify for based on your marks and course selections.
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
              Skolify has found <b>{qualifyingCount}</b> universities you qualify for. Pay R19 to unlock all details.
            </p>
            <button
              onClick={() => { setShowPaywall(false); setShowIntake(true); }}
              style={{
                width: "100%", padding: 14, borderRadius: 999, border: "none",
                background: "#12B76A", color: "#fff", fontWeight: 800, cursor: "pointer", marginTop: 8,
              }}
            >
              💳 Pay R19 — Unlock Results
            </button>
            <p style={{ color: "#98A2B3", fontSize: 12, marginTop: 10 }}>🔒 Secure payment</p>
          </div>
        </Modal>
      )}

      {showIntake && (
        <Modal onClose={() => setShowIntake(false)}>
          <StudentIntakeForm
            matchedCourses={selected}
            universityScore={universityScore}
            universityId={universityId}
          />
        </Modal>
      )}
    </div>
  );
}

function Modal({ children, onClose }) {
  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(16,24,40,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 40,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "#fff", borderRadius: 20, padding: 28, width: 340 }}
      >
        {children}
      </div>
    </div>
  );
}

/* ---------- ROOT APP ---------- */

function StudentApp() {
  const [step, setStep] = useState(0);
  const [university, setUniversity] = useState("");
  const [uniOptions, setUniOptions] = useState({});
  const [subjects, setSubjects] = useState(() => [
    { id: nextId(), subject: "", pct: "", isLO: false },
    { id: nextId(), subject: "", pct: "", isLO: false },
    { id: nextId(), subject: "", pct: "", isLO: false },
    { id: nextId(), subject: "Life Orientation", pct: "", isLO: true },
  ]);
  const [selectedCourses, setSelectedCourses] = useState([]);

  const selectedUni = UNIVERSITIES.find((u) => u.id === university);

  const result = useMemo(() => {
    if (!selectedUni) return { score: 0, scale: "" };
    const validSubjects = subjects.filter((s) => s.subject && s.pct !== "");
    if (validSubjects.length === 0) return { score: 0, scale: "" };
    try {
      return calculateScore(selectedUni.archetype, subjects, uniOptions);
    } catch {
      return { score: 0, scale: "" };
    }
  }, [subjects, selectedUni, uniOptions]);

  // Standard 1-42 scale, used for matching against the course database's
  // minAps thresholds regardless of which university's own scale is shown.
  // If the selected university uses a different scale (e.g. UCT/NMU out of
  // 600), this comparison is only a rough guide — always confirm against
  // that university's own official calculator before relying on it.
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
        <ProgressBar step={step} total={4} />
        <div style={{ marginTop: 28 }}>
          {step === 0 && (
            <SelectUniversity
              university={university}
              setUniversity={setUniversity}
              options={uniOptions}
              setOptions={setUniOptions}
              onContinue={() => setStep(1)}
            />
          )}
          {step === 1 && (
            <EnterMarks
              subjects={subjects}
              setSubjects={setSubjects}
              aps={result.score}
              scale={result.scale}
              onContinue={() => setStep(2)}
            />
          )}
          {step === 2 && (
            <ChooseCourses
              selected={selectedCourses}
              setSelected={setSelectedCourses}
              onContinue={() => setStep(3)}
              onBack={() => setStep(1)}
              universityId={university}
            />
          )}
          {step === 3 && (
            <Review
              selected={selectedCourses}
              setSelected={setSelectedCourses}
              aps={standardAps}
              universityScore={result}
              universityId={university}
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
