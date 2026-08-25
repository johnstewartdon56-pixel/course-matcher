// Change this to "live" once you've tested with the sandbox and are
// ready to accept real payments. Also update the merchant credentials
// below with your LIVE ones at that point (sandbox and live use
// different Merchant ID / Merchant Key).
export const PAYFAST_MODE = "sandbox"; // "sandbox" | "live"

const PAYFAST_MERCHANT_ID = "10000100"; // PayFast's public sandbox test ID -- replace with yours
const PAYFAST_MERCHANT_KEY = "46f0cd694581a"; // PayFast's public sandbox test key -- replace with yours

const PROCESS_URL =
  PAYFAST_MODE === "live"
    ? "https://www.payfast.co.za/eng/process"
    : "https://sandbox.payfast.co.za/eng/process";

function randomRef() {
  return `acadia-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Stashes the student's current progress (so it survives the redirect
 * to PayFast and back), creates a PENDING payment row in Supabase, and
 * submits a hidden form to PayFast's checkout.
 */
export async function startPayfastCheckout({ supabase, amount, matchedCourses, apsScore }) {
  const reference = randomRef();

  // Save progress locally so we can restore it when the student returns.
  localStorage.setItem(
    "acadia_pending_payment",
    JSON.stringify({ reference, matchedCourses, apsScore, amount })
  );

  // Create the PENDING row the Netlify function will later mark COMPLETE.
  const { error } = await supabase.from("payments").insert({
    m_payment_id: reference,
    amount,
    status: "PENDING",
    matched_courses: matchedCourses,
    aps_score: apsScore,
  });
  if (error) {
    alert("Could not start payment. Please try again.");
    console.error(error);
    return;
  }

  const origin = window.location.origin;

  const fields = {
    merchant_id: PAYFAST_MERCHANT_ID,
    merchant_key: PAYFAST_MERCHANT_KEY,
    return_url: `${origin}/?pf_ref=${reference}`,
    cancel_url: `${origin}/?pf_cancelled=${reference}`,
    notify_url: `${origin}/.netlify/functions/payfast-notify`,
    m_payment_id: reference,
    amount: Number(amount).toFixed(2),
    item_name: "Acadia course match results",
  };

  const form = document.createElement("form");
  form.method = "POST";
  form.action = PROCESS_URL;

  Object.entries(fields).forEach(([key, value]) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = key;
    input.value = value;
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
}

/**
 * Called when the student lands back on the site after PayFast. Polls
 * the payments table (the ITN webhook can take a few seconds to land)
 * until the Netlify function has marked it COMPLETE, or times out.
 */
export async function checkPaymentStatus(supabase, reference, { retries = 15, delayMs = 2000 } = {}) {
  for (let i = 0; i < retries; i++) {
    const { data, error } = await supabase
      .from("payments")
      .select("status")
      .eq("m_payment_id", reference)
      .single();

    if (!error && data?.status === "COMPLETE") return true;
    await new Promise((res) => setTimeout(res, delayMs));
  }
  return false;
}
