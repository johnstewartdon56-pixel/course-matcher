import { useState } from "react";
import { supabase } from "./supabaseClient.js";

const inputStyle = {
  width: "100%", padding: 12, borderRadius: 10, border: "1px solid #E4E7EC",
  marginTop: 6, marginBottom: 14, fontSize: 15, boxSizing: "border-box",
};
const labelStyle = { fontWeight: 700, fontSize: 13, color: "#344054" };

async function uploadDoc(file, studentFolder, label) {
  if (!file) return null;
  const path = `${studentFolder}/${label}-${Date.now()}-${file.name}`;
  const { error } = await supabase.storage.from("student-documents").upload(path, file);
  if (error) throw error;
  return path;
}

export default function StudentIntakeForm({ matchedCourses, universityScore, universityId, onDone }) {
  const [form, setForm] = useState({
    fullName: "", idNumber: "", phone: "", email: "",
    nokName: "", nokRelationship: "", nokPhone: "",
  });
  const [files, setFiles] = useState({ id: null, results: null, pop: null });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const canSubmit =
    form.fullName && form.idNumber && form.phone &&
    form.nokName && form.nokPhone && files.id && files.results;

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");
    try {
      const studentFolder = `${form.idNumber || "student"}-${Date.now()}`;

      const [idUrl, resultsUrl, popUrl] = await Promise.all([
        uploadDoc(files.id, studentFolder, "id"),
        uploadDoc(files.results, studentFolder, "results"),
        uploadDoc(files.pop, studentFolder, "proof-of-payment"),
      ]);

      const { error: insertError } = await supabase.from("students").insert({
        full_name: form.fullName,
        id_number: form.idNumber,
        phone: form.phone,
        email: form.email || null,
        next_of_kin_name: form.nokName,
        next_of_kin_relationship: form.nokRelationship,
        next_of_kin_phone: form.nokPhone,
        university: universityId || null,
        aps_score: universityScore?.score ?? null,
        matched_courses: matchedCourses || [],
        id_document_url: idUrl,
        results_document_url: resultsUrl,
        proof_of_payment_url: popUrl,
        status: "Pending",
      });

      if (insertError) throw insertError;
      setDone(true);
    } catch (e) {
      setError(e.message || "Something went wrong submitting your application. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div style={{ textAlign: "center", padding: "40px 0" }}>
        <div style={{ fontSize: 40, color: "#12B76A" }}>✓</div>
        <h2 style={{ marginTop: 12 }}>Application received!</h2>
        <p style={{ color: "#475467" }}>
          We've got your details and documents. Our team will start applying on your behalf and will
          be in touch via WhatsApp with updates.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ marginBottom: 4 }}>Almost done</h2>
      <p style={{ color: "#667085", marginTop: 0, fontSize: 14 }}>
        We need a few details and documents to submit your applications for you.
      </p>

      <label style={labelStyle}>Full name</label>
      <input style={inputStyle} value={form.fullName} onChange={(e) => update("fullName", e.target.value)} />

      <label style={labelStyle}>ID number</label>
      <input style={inputStyle} value={form.idNumber} onChange={(e) => update("idNumber", e.target.value)} />

      <label style={labelStyle}>Phone number</label>
      <input style={inputStyle} value={form.phone} onChange={(e) => update("phone", e.target.value)} />

      <label style={labelStyle}>Email (optional)</label>
      <input style={inputStyle} value={form.email} onChange={(e) => update("email", e.target.value)} />

      <div style={{ height: 1, background: "#E4E7EC", margin: "8px 0 16px" }} />
      <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>Next of kin</div>

      <label style={labelStyle}>Next of kin name</label>
      <input style={inputStyle} value={form.nokName} onChange={(e) => update("nokName", e.target.value)} />

      <label style={labelStyle}>Relationship</label>
      <input style={inputStyle} value={form.nokRelationship} onChange={(e) => update("nokRelationship", e.target.value)} />

      <label style={labelStyle}>Next of kin phone</label>
      <input style={inputStyle} value={form.nokPhone} onChange={(e) => update("nokPhone", e.target.value)} />

      <div style={{ height: 1, background: "#E4E7EC", margin: "8px 0 16px" }} />
      <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>Documents</div>

      <label style={labelStyle}>ID document (copy of ID/passport)</label>
      <input
        style={inputStyle} type="file" accept="image/*,.pdf"
        onChange={(e) => setFiles((f) => ({ ...f, id: e.target.files[0] }))}
      />

      <label style={labelStyle}>Matric results / statement of results</label>
      <input
        style={inputStyle} type="file" accept="image/*,.pdf"
        onChange={(e) => setFiles((f) => ({ ...f, results: e.target.files[0] }))}
      />

      <label style={labelStyle}>Proof of payment (optional if already confirmed)</label>
      <input
        style={inputStyle} type="file" accept="image/*,.pdf"
        onChange={(e) => setFiles((f) => ({ ...f, pop: e.target.files[0] }))}
      />

      {error && <p style={{ color: "#D92D20", fontSize: 13 }}>{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={!canSubmit || submitting}
        style={{
          width: "100%", padding: 16, borderRadius: 999, border: "none",
          fontWeight: 800, fontSize: 16, marginTop: 8,
          background: canSubmit && !submitting ? "#101828" : "#D0D5DD",
          color: "#fff", cursor: canSubmit && !submitting ? "pointer" : "not-allowed",
        }}
      >
        {submitting ? "Submitting..." : "Submit application"}
      </button>
      <p style={{ fontSize: 11, color: "#98A2B3", marginTop: 10, textAlign: "center" }}>
        Your documents are stored securely and only visible to our admissions team.
      </p>
    </div>
  );
}
