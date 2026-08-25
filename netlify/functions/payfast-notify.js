// Netlify Function: verifies PayFast's payment notification (ITN) and
// marks the matching payment as COMPLETE in Supabase.
//
// This runs on Netlify's servers, never in the browser -- that's what
// makes it trustworthy. It uses the SECRET service_role Supabase key
// (set as an environment variable in Netlify, never committed to
// GitHub) which bypasses Row Level Security, so it's the only thing
// able to mark a payment as paid.
//
// Required Netlify environment variables (Site configuration ->
// Environment variables):
//   SUPABASE_URL                - same URL used in the app
//   SUPABASE_SERVICE_ROLE_KEY   - the SECRET service_role key (not anon)
//   PAYFAST_MODE                - "sandbox" or "live"
//   PAYFAST_PASSPHRASE          - optional, only if you set one in PayFast

const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const params = new URLSearchParams(event.body);
    const data = Object.fromEntries(params.entries());

    // 1. Verify the signature PayFast sent us.
    const receivedSignature = data.signature;
    const paramsForSig = new URLSearchParams(event.body);
    paramsForSig.delete("signature");
    let sigString = paramsForSig.toString();
    const passphrase = process.env.PAYFAST_PASSPHRASE;
    if (passphrase) {
      sigString += `&passphrase=${encodeURIComponent(passphrase)}`;
    }
    const computedSignature = crypto.createHash("md5").update(sigString).digest("hex");

    if (computedSignature !== receivedSignature) {
      console.error("PayFast ITN: signature mismatch");
      return { statusCode: 400, body: "Invalid signature" };
    }

    // 2. Ask PayFast itself to confirm this notification is genuine.
    const mode = process.env.PAYFAST_MODE === "live" ? "live" : "sandbox";
    const validateUrl =
      mode === "live"
        ? "https://www.payfast.co.za/eng/query/validate"
        : "https://sandbox.payfast.co.za/eng/query/validate";

    const validateRes = await fetch(validateUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: event.body,
    });
    const validateText = (await validateRes.text()).trim();

    if (validateText !== "VALID") {
      console.error("PayFast ITN: validation failed", validateText);
      return { statusCode: 400, body: "Invalid ITN" };
    }

    // 3. Only mark it complete if PayFast says the payment succeeded.
    if (data.payment_status !== "COMPLETE") {
      return { statusCode: 200, body: "Noted, not complete" };
    }

    // 4. Update the matching payment row using the secret service_role key.
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { error } = await supabase
      .from("payments")
      .update({
        status: "COMPLETE",
        pf_payment_id: data.pf_payment_id || null,
        updated_at: new Date().toISOString(),
      })
      .eq("m_payment_id", data.m_payment_id);

    if (error) {
      console.error("Supabase update error:", error);
      return { statusCode: 500, body: "Database error" };
    }

    return { statusCode: 200, body: "OK" };
  } catch (err) {
    console.error("PayFast ITN handler error:", err);
    return { statusCode: 500, body: "Server error" };
  }
};
