/* ---------------------------------------------------------------
   University-specific APS / admission-score calculators.

   Every function takes the same `subjects` array:
     [{ subject: string, pct: number, isLO: boolean }, ...]
   and returns:
     { score: number, scale: string, breakdown?: string[] }

   IMPORTANT: These formulas were compiled from a third-party spec,
   not pulled live from each university's own site. Before this is
   used to give a real student a final answer, spot-check a couple
   of results against each university's own official APS
   calculator (most publish one) — getting this wrong could cost
   someone a valid application.
----------------------------------------------------------------- */

const levelFromPct = (pct) => {
  const p = Number(pct);
  if (isNaN(p)) return 0;
  if (p >= 80) return 7;
  if (p >= 70) return 6;
  if (p >= 60) return 5;
  if (p >= 50) return 4;
  if (p >= 40) return 3;
  if (p >= 30) return 2;
  return 1;
};

const nonLO = (subjects) => subjects.filter((s) => !s.isLO && s.subject && s.pct !== "");
const loSubject = (subjects) => subjects.find((s) => s.isLO);

const best = (arr, n, keyFn) =>
  [...arr].sort((a, b) => keyFn(b) - keyFn(a)).slice(0, n);

/* 1. Standard 6, LO excluded: NWU, UJ, UL, DUT, UNIZULU */
function standardSix(subjects) {
  const subs = nonLO(subjects);
  const top6 = best(subs, 6, (s) => levelFromPct(s.pct));
  const score = top6.reduce((sum, s) => sum + levelFromPct(s.pct), 0);
  return { score, scale: "out of 42", breakdown: top6.map((s) => `${s.subject}: ${levelFromPct(s.pct)}`) };
}

/* 2. Wits: best 7 including LO, Maths/English bonus */
function wits(subjects) {
  const isMathsOrEnglish = (name = "") =>
    /mathematics$/i.test(name.trim()) || /english/i.test(name);

  const scoreSubject = (s) => {
    const p = Number(s.pct);
    if (s.isLO) {
      if (p >= 90) return 4;
      if (p >= 80) return 3;
      if (p >= 70) return 2;
      if (p >= 60) return 1;
      return 0;
    }
    const bonusEligible = isMathsOrEnglish(s.subject) && p >= 60;
    if (isMathsOrEnglish(s.subject)) {
      if (p >= 90) return 10;
      if (p >= 80) return 9;
      if (p >= 70) return 8;
      if (p >= 60) return 7;
      if (p >= 50) return 4;
      if (p >= 40) return 3;
      return 0;
    }
    if (p >= 90) return 8;
    if (p >= 80) return 7;
    if (p >= 70) return 6;
    if (p >= 60) return 5;
    if (p >= 50) return 4;
    if (p >= 40) return 3;
    return 0;
  };

  const withLO = subjects.filter((s) => s.subject && s.pct !== "");
  const top7 = best(withLO, 7, scoreSubject);
  const score = top7.reduce((sum, s) => sum + scoreSubject(s), 0);
  return { score, scale: "Wits composite scale", breakdown: top7.map((s) => `${s.subject}: ${scoreSubject(s)}`) };
}

/* 3. UFS: best 6 academic + LO bonus (60%+ = +1, else +0) */
function ufs(subjects) {
  const scoreSubject = (s) => {
    const p = Number(s.pct);
    if (p >= 90) return 8;
    if (p >= 80) return 7;
    if (p >= 70) return 6;
    if (p >= 60) return 5;
    if (p >= 50) return 4;
    if (p >= 40) return 3;
    if (p >= 30) return 2;
    return 0;
  };
  const subs = nonLO(subjects);
  const top6 = best(subs, 6, scoreSubject);
  const academicScore = top6.reduce((sum, s) => sum + scoreSubject(s), 0);
  const lo = loSubject(subjects);
  const loBonus = lo && Number(lo.pct) >= 60 ? 1 : 0;
  return {
    score: academicScore + loBonus,
    scale: "out of 49",
    breakdown: [...top6.map((s) => `${s.subject}: ${scoreSubject(s)}`), `LO bonus: ${loBonus}`],
  };
}

/* 4. Sol Plaatje University: best 6 + Maths/HL bonus + LO scale */
function spu(subjects) {
  const scoreSubject = (s) => levelFromPct(s.pct); // reuse 1-7... SPU actually uses level 1-8, approximate using standard bands
  const isBonusSubject = (s) => /mathematics$/i.test((s.subject || "").trim()) || /HL$/i.test(s.subject || "");

  const subs = nonLO(subjects);
  const top6 = best(subs, 6, scoreSubject);
  let base = top6.reduce((sum, s) => sum + scoreSubject(s), 0);

  let bonus = 0;
  top6.forEach((s) => {
    if (!isBonusSubject(s)) return;
    const p = Number(s.pct);
    if (p >= 60) bonus += 2;
    else if (p >= 40) bonus += 1;
  });

  const lo = loSubject(subjects);
  let loScore = 0;
  if (lo) {
    const lvl = levelFromPct(lo.pct);
    if (lvl >= 8) loScore = 4;
    else if (lvl === 7) loScore = 3;
    else if (lvl === 6) loScore = 2;
    else if (lvl === 5) loScore = 1;
  }

  return {
    score: base + bonus + loScore,
    scale: "SPU composite scale",
    breakdown: [...top6.map((s) => `${s.subject}: ${scoreSubject(s)}`), `Bonus: ${bonus}`, `LO: ${loScore}`],
  };
}

/* 5. Nelson Mandela University: actual % of best 6 (20-credit), out of 600 */
function nmu(subjects, { quintile1to3 = false } = {}) {
  const subs = nonLO(subjects);
  const top6 = best(subs, 6, (s) => Number(s.pct));
  const score = top6.reduce((sum, s) => sum + Number(s.pct), 0);
  const lo = loSubject(subjects);
  const quintileBonus = quintile1to3 && lo && Number(lo.pct) >= 50 ? 7 : 0;
  return {
    score: score + quintileBonus,
    scale: "out of 600",
    breakdown: [...top6.map((s) => `${s.subject}: ${s.pct}%`), `Quintile 1-3 LO bonus: ${quintileBonus}`],
  };
}

/* 6. UCT: APS = English + best 5 others (actual %), out of 600; faculty adjustments */
function uct(subjects, { faculty = "Humanities, Law, Commerce, EBE", disadvantageFactor = 0 } = {}) {
  const subs = nonLO(subjects).filter((s) => Number(s.pct) >= 40);
  const english = subs.find((s) => /english/i.test(s.subject));
  const others = subs.filter((s) => s !== english);
  const bestOthers = best(others, 5, (s) => Number(s.pct));
  const apsSubjects = english ? [english, ...bestOthers] : best(subs, 6, (s) => Number(s.pct));
  const aps = apsSubjects.reduce((sum, s) => sum + Number(s.pct), 0);

  let fps = aps;
  let fpsScale = "out of 600";

  if (faculty === "Science") {
    const maths = subs.find((s) => /^mathematics$/i.test(s.subject));
    const physSci = subs.find((s) => /physical sciences/i.test(s.subject));
    fps = aps + (maths ? Number(maths.pct) : 0) + (physSci ? Number(physSci.pct) : 0);
    fpsScale = "out of 800";
  } else if (faculty === "Health Sciences") {
    fps = aps; // NBT scores not collected in this UI yet
    fpsScale = "out of 900 (APS shown; add your 3 NBT scores separately)";
  }

  const wps = fps + (disadvantageFactor / 100) * fps;

  return {
    score: Math.round(wps),
    scale: `UCT ${faculty} — ${fpsScale}`,
    breakdown: [
      `APS: ${aps}`,
      `FPS: ${fps}`,
      `Disadvantage factor: ${disadvantageFactor}%`,
      `WPS: ${Math.round(wps)}`,
    ],
  };
}

/* 7. Walter Sisulu University: categorised */
function wsu(subjects, { isFoundationPhase = false } = {}) {
  const scoreSubject = (s) => {
    const p = Number(s.pct);
    if (p >= 90) return 8;
    if (p >= 80) return 7;
    if (p >= 70) return 6;
    if (p >= 60) return 5;
    if (p >= 50) return 4;
    if (p >= 40) return 3;
    if (p >= 30) return 2;
    return 1;
  };
  const languages = nonLO(subjects).filter((s) => /english|hl$/i.test(s.subject));
  const cat1 = best(languages, 2, scoreSubject);
  const rest = nonLO(subjects).filter((s) => !cat1.includes(s));
  const cat2 = best(rest, 4, scoreSubject);

  let included = [...cat1, ...cat2];
  let score = included.reduce((sum, s) => sum + scoreSubject(s), 0);

  if (isFoundationPhase) {
    const lo = loSubject(subjects);
    if (lo) score += scoreSubject(lo);
  }

  return {
    score,
    scale: isFoundationPhase ? "out of 56 (7 subjects, B.Ed Foundation Phase)" : "out of 48",
    breakdown: included.map((s) => `${s.subject}: ${scoreSubject(s)}`),
  };
}

/* 8. University of Venda: best 7, proportional decimals, <40% excluded */
function univen(subjects) {
  const subs = subjects.filter((s) => !s.isLO && s.subject && s.pct !== "" && Number(s.pct) >= 40);
  const top7 = best(subs, 7, (s) => Number(s.pct));
  const score = top7.reduce((sum, s) => sum + Number(s.pct) / 10, 0);
  return {
    score: Math.round(score * 10) / 10,
    scale: "decimal scale (best 7 subjects)",
    breakdown: top7.map((s) => `${s.subject}: ${(Number(s.pct) / 10).toFixed(1)}`),
  };
}

/* 9. CPUT: 3 methods */
function cput(subjects, { method = 1 } = {}) {
  const subs = nonLO(subjects);
  const getPct = (name) => {
    const found = subs.find((s) => s.subject.toLowerCase().includes(name.toLowerCase()));
    return found ? Number(found.pct) : 0;
  };
  const english = getPct("english");

  if (method === 1) {
    const top6 = best(subs, 6, (s) => Number(s.pct));
    const sum = top6.reduce((s, x) => s + Number(x.pct), 0);
    return { score: Math.round((sum / 10) * 10) / 10, scale: "CPUT Method 1 (Standard)", breakdown: top6.map((s) => `${s.subject}: ${s.pct}%`) };
  }
  if (method === 2) {
    const maths = getPct("mathematics");
    const physSci = getPct("physical sciences");
    const others = subs.filter((s) => !/english|mathematics$|physical sciences/i.test(s.subject));
    const nextBest = best(others, 1, (s) => Number(s.pct))[0];
    const sum = english + (nextBest ? Number(nextBest.pct) : 0) + maths * 2 + physSci * 2;
    return { score: Math.round((sum / 10) * 10) / 10, scale: "CPUT Method 2 (Science/Engineering)" };
  }
  // method 3
  const maths = getPct("mathematics");
  const accounting = getPct("accounting");
  const others = subs.filter((s) => !/english|mathematics$|accounting/i.test(s.subject));
  const next3 = best(others, 3, (s) => Number(s.pct));
  const next3sum = next3.reduce((s, x) => s + Number(x.pct), 0);
  const sum = english + next3sum + maths * 2 + accounting * 2;
  return { score: Math.round((sum / 10) * 10) / 10, scale: "CPUT Method 3 (Accountancy/Business)" };
}

/* 10. Central University of Technology: LO capped at 1 */
function cut(subjects) {
  const scoreSubject = (s) => {
    const p = Number(s.pct);
    if (p >= 90) return 8;
    if (p >= 80) return 7;
    if (p >= 70) return 6;
    if (p >= 60) return 5;
    if (p >= 50) return 4;
    if (p >= 40) return 3;
    if (p >= 30) return 2;
    return 0;
  };
  const subs = nonLO(subjects);
  const top6 = best(subs, 6, scoreSubject);
  const academicScore = top6.reduce((sum, s) => sum + scoreSubject(s), 0);
  const lo = loSubject(subjects);
  const loScore = lo && Number(lo.pct) >= 50 ? 1 : 0;
  return {
    score: academicScore + loScore,
    scale: "CUT scale",
    breakdown: [...top6.map((s) => `${s.subject}: ${scoreSubject(s)}`), `LO (capped): ${loScore}`],
  };
}

export const UNIVERSITIES = [
  { id: "nwu", name: "North-West University (NWU)", archetype: "standardSix" },
  { id: "uj", name: "University of Johannesburg (UJ)", archetype: "standardSix" },
  { id: "ul", name: "University of Limpopo (UL)", archetype: "standardSix" },
  { id: "dut", name: "Durban University of Technology (DUT)", archetype: "standardSix" },
  { id: "unizulu", name: "University of Zululand (UNIZULU)", archetype: "standardSix" },
  { id: "wits", name: "University of the Witwatersrand (Wits)", archetype: "wits" },
  { id: "ufs", name: "University of the Free State (UFS)", archetype: "ufs" },
  { id: "spu", name: "Sol Plaatje University (SPU)", archetype: "spu" },
  { id: "nmu", name: "Nelson Mandela University (NMU)", archetype: "nmu" },
  { id: "uct", name: "University of Cape Town (UCT)", archetype: "uct" },
  { id: "wsu", name: "Walter Sisulu University (WSU)", archetype: "wsu" },
  { id: "univen", name: "University of Venda (Univen)", archetype: "univen" },
  { id: "cput", name: "Cape Peninsula University of Technology (CPUT)", archetype: "cput" },
  { id: "cut", name: "Central University of Technology (CUT)", archetype: "cut" },
];

export function calculateScore(archetype, subjects, options) {
  switch (archetype) {
    case "standardSix": return standardSix(subjects);
    case "wits": return wits(subjects);
    case "ufs": return ufs(subjects);
    case "spu": return spu(subjects);
    case "nmu": return nmu(subjects, options);
    case "uct": return uct(subjects, options);
    case "wsu": return wsu(subjects, options);
    case "univen": return univen(subjects);
    case "cput": return cput(subjects, options);
    case "cut": return cut(subjects);
    default: return standardSix(subjects);
  }
}
