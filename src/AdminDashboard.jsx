import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient.js";

const STATUSES = ["Pending", "Documents Reviewed", "Applied", "Submitted", "Rejected"];

function StudentRow({ student, onStatusChange }) {
  const [open, setOpen] = useState(false);
  const [urls, setUrls] = useState({});

  const loadDoc = async (path, key) => {
    if (!path || urls[key]) return;
    const { data, error } = await supabase.storage
      .from("student-documents")
      .createSignedUrl(path, 60 * 10); // 10 min link
    if (!error) setUrls((u) => ({ ...u, [key]: data.signedUrl }));
  };

  return (
    <div style={{ border: "1px solid #E4E7EC", borderRadius: 14, marginBottom: 12, overflow: "hidden" }}>
      <div
        onClick={() => setOpen((o) => !o)}
        style={{ padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", background: "#F9FAFB" }}
      >
        <div>
          <div style={{ fontWeight: 700 }}>{student.full_name}</div>
          <div style={{ fontSize: 12, color: "#667085" }}>{student.phone} • {student.university || "—"}</div>
        </div>
        <select
          value={student.status}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onStatusChange(student.id, e.target.value)}
          style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #E4E7EC", fontWeight: 700, fontSize: 12 }}
        >
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {open && (
        <div style={{ padding: 14, fontSize: 14 }}>
          <p><b>ID number:</b> {student.id_number}</p>
          <p><b>Email:</b> {student.email || "—"}</p>
          <p><b>APS score:</b> {student.aps_score ?? "—"}</p>
          <p><b>Next of kin:</b> {student.next_of_kin_name} ({student.next_of_kin_relationship}) — {student.next_of_kin_phone}</p>
          <p><b>Matched courses:</b></p>
          <ul>
            {(student.matched_courses || []).map((c, i) => (
              <li key={i}>{c.name || c}</li>
            ))}
          </ul>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
            {student.id_document_url && (
              <button onClick={() => loadDoc(student.id_document_url, "id")} style={docBtnStyle}>
                {urls.id ? <a href={urls.id} target="_blank" rel="noreferrer">Open ID doc</a> : "Load ID doc"}
              </button>
            )}
            {student.results_document_url && (
              <button onClick={() => loadDoc(student.results_document_url, "results")} style={docBtnStyle}>
                {urls.results ? <a href={urls.results} target="_blank" rel="noreferrer">Open results</a> : "Load results"}
              </button>
            )}
            {student.proof_of_payment_url && (
              <button onClick={() => loadDoc(student.proof_of_payment_url, "pop")} style={docBtnStyle}>
                {urls.pop ? <a href={urls.pop} target="_blank" rel="noreferrer">Open proof of payment</a> : "Load proof of payment"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const docBtnStyle = {
  padding: "8px 12px", borderRadius: 8, border: "1px solid #E4E7EC",
  background: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer",
};

function CoursesManager() {
  const [courses, setCourses] = useState([]);
  const [form, setForm] = useState({ university: "", faculty: "", course_name: "", min_score: "", requirements: "" });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("courses").select("*").order("university");
    setCourses(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const addCourse = async () => {
    if (!form.university || !form.faculty || !form.course_name || !form.min_score) return;
    await supabase.from("courses").insert({
      university: form.university,
      faculty: form.faculty,
      course_name: form.course_name,
      min_score: Number(form.min_score),
      requirements: form.requirements,
    });
    setForm({ university: "", faculty: "", course_name: "", min_score: "", requirements: "" });
    load();
  };

  const removeCourse = async (id) => {
    await supabase.from("courses").delete().eq("id", id);
    load();
  };

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 800 }}>Courses ({courses.length})</h2>

      <div style={{ background: "#F9FAFB", padding: 14, borderRadius: 14, marginBottom: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <input placeholder="University" value={form.university} onChange={(e) => setForm({ ...form, university: e.target.value })} style={miniInput} />
          <input placeholder="Faculty" value={form.faculty} onChange={(e) => setForm({ ...form, faculty: e.target.value })} style={miniInput} />
          <input placeholder="Course name" value={form.course_name} onChange={(e) => setForm({ ...form, course_name: e.target.value })} style={{ ...miniInput, gridColumn: "1 / -1" }} />
          <input placeholder="Min score" type="number" value={form.min_score} onChange={(e) => setForm({ ...form, min_score: e.target.value })} style={miniInput} />
          <input placeholder="Requirements (e.g. English 50%)" value={form.requirements} onChange={(e) => setForm({ ...form, requirements: e.target.value })} style={miniInput} />
        </div>
        <button onClick={addCourse} style={{ marginTop: 10, padding: "10px 16px", borderRadius: 8, border: "none", background: "#101828", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
          + Add course
        </button>
      </div>

      {loading ? <p>Loading...</p> : (
        courses.map((c) => (
          <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 10, borderBottom: "1px solid #F2F4F7" }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{c.course_name}</div>
              <div style={{ fontSize: 12, color: "#667085" }}>{c.university} • {c.faculty} • Min {c.min_score}</div>
            </div>
            <button onClick={() => removeCourse(c.id)} style={{ border: "none", background: "none", color: "#D92D20", cursor: "pointer" }}>Remove</button>
          </div>
        ))
      )}
    </div>
  );
}

const miniInput = { padding: 10, borderRadius: 8, border: "1px solid #E4E7EC", fontSize: 13 };

export default function AdminDashboard() {
  const [tab, setTab] = useState("students");
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadStudents = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("students").select("*").order("created_at", { ascending: false });
    if (!error) setStudents(data || []);
    setLoading(false);
  };

  useEffect(() => { loadStudents(); }, []);

  const updateStatus = async (id, status) => {
    setStudents((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
    await supabase.from("students").update({ status }).eq("id", id);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "24px 20px 60px", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: 26, fontWeight: 800 }}>Admin Dashboard</h1>
        <button onClick={logout} style={{ border: "none", background: "none", color: "#667085", cursor: "pointer", fontWeight: 700 }}>
          Log out
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 16, marginBottom: 20 }}>
        {["students", "courses"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "8px 16px", borderRadius: 999, border: "none", cursor: "pointer",
              fontWeight: 700, textTransform: "capitalize",
              background: tab === t ? "#101828" : "#F2F4F7",
              color: tab === t ? "#fff" : "#344054",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "students" && (
        loading ? <p>Loading...</p> : (
          students.length === 0
            ? <p style={{ color: "#98A2B3" }}>No applications yet.</p>
            : students.map((s) => (
              <StudentRow key={s.id} student={s} onStatusChange={updateStatus} />
            ))
        )
      )}

      {tab === "courses" && <CoursesManager />}
    </div>
  );
}
