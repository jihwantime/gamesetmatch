// Formatting helpers shared across pages.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatDate(yyyymmdd: number | null | undefined): string {
  if (!yyyymmdd) return "—";
  const y = Math.floor(yyyymmdd / 10000);
  const m = Math.floor((yyyymmdd % 10000) / 100);
  const d = yyyymmdd % 100;
  return `${MONTHS[m - 1] ?? "?"} ${d}, ${y}`;
}

export function ageFromDob(dob: number | null | undefined): number | null {
  if (!dob) return null;
  const now = new Date();
  const nowNum = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
  return Math.floor((nowNum - dob) / 10000);
}

export const LEVEL_NAMES: Record<string, string> = {
  G: "Grand Slam",
  M: "Masters 1000",
  A: "ATP Tour",
  F: "Tour Finals",
  D: "Davis Cup",
  O: "Olympics",
};

export const LEVEL_BADGE: Record<string, string> = {
  G: "bg-amber-500/15 text-amber-400",
  M: "bg-violet-500/15 text-violet-400",
  A: "bg-slate-500/15 text-slate-400",
  F: "bg-cyan-500/15 text-cyan-400",
  D: "bg-emerald-500/15 text-emerald-400",
  O: "bg-rose-500/15 text-rose-300",
};

export const ROUND_NAMES: Record<string, string> = {
  F: "Final",
  SF: "Semifinal",
  QF: "Quarterfinal",
  R16: "Round of 16",
  R32: "Round of 32",
  R64: "Round of 64",
  R128: "Round of 128",
  RR: "Round Robin",
  BR: "Bronze match",
};

// IOC country code → ISO 3166-1 alpha-2, for flag emoji. Covers the tour.
const IOC_TO_ISO2: Record<string, string> = {
  AHO: "CW", ALB: "AL", ALG: "DZ", AND: "AD", ARG: "AR", ARM: "AM", AUS: "AU",
  AUT: "AT", AZE: "AZ", BAH: "BS", BAR: "BB", BEL: "BE", BIH: "BA", BLR: "BY",
  BOL: "BO", BRA: "BR", BRN: "BH", BUL: "BG", CAN: "CA", CHI: "CL", CHN: "CN",
  CIV: "CI", COL: "CO", CRC: "CR", CRO: "HR", CYP: "CY", CZE: "CZ", DEN: "DK",
  DOM: "DO", ECU: "EC", EGY: "EG", ESA: "SV", ESP: "ES", EST: "EE", FIN: "FI",
  FRA: "FR", GBR: "GB", GEO: "GE", GER: "DE", GRE: "GR", GUA: "GT", HAI: "HT",
  HKG: "HK", HUN: "HU", INA: "ID", IND: "IN", IRI: "IR", IRL: "IE", ISR: "IL",
  ISL: "IS", ITA: "IT", JAM: "JM", JPN: "JP", JOR: "JO", KAZ: "KZ", KEN: "KE",
  KGZ: "KG", KOR: "KR", KSA: "SA", KUW: "KW", LAT: "LV", LIB: "LB", LTU: "LT",
  LUX: "LU", MAR: "MA", MDA: "MD", MEX: "MX", MKD: "MK", MNE: "ME", MON: "MC",
  NED: "NL", NGR: "NG", NOR: "NO", NZL: "NZ", PAK: "PK", PAN: "PA", PAR: "PY",
  PER: "PE", PHI: "PH", POL: "PL", POR: "PT", PUR: "PR", QAT: "QA", ROU: "RO",
  RSA: "ZA", RUS: "RU", SLO: "SI", SRB: "RS", SUI: "CH", SVK: "SK", SWE: "SE",
  THA: "TH", TJK: "TJ", TOG: "TG", TPE: "TW", TTO: "TT", TUN: "TN", TUR: "TR",
  UAE: "AE", UKR: "UA", URU: "UY", USA: "US", UZB: "UZ", VEN: "VE", VIE: "VN",
  ZIM: "ZW",
};

export function flagEmoji(ioc: string | null | undefined): string {
  const iso = ioc ? IOC_TO_ISO2[ioc] : undefined;
  if (!iso) return "🏳️";
  return String.fromCodePoint(...[...iso].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

// Rating tiers, op.gg style. Rating text is always shown next to the color.
export function ratingTier(rating: number | null | undefined): {
  label: string;
  className: string;
} {
  if (rating == null) return { label: "—", className: "bg-slate-800 text-slate-500" };
  if (rating >= 8.5) return { label: rating.toFixed(1), className: "bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/40" };
  if (rating >= 7) return { label: rating.toFixed(1), className: "bg-sky-500/20 text-sky-400" };
  if (rating >= 5) return { label: rating.toFixed(1), className: "bg-emerald-500/20 text-emerald-400" };
  if (rating >= 3.5) return { label: rating.toFixed(1), className: "bg-slate-600/30 text-slate-300" };
  return { label: rating.toFixed(1), className: "bg-red-500/15 text-red-400" };
}

export function pct(num: number | null, den: number | null): number | null {
  if (num == null || den == null || den === 0) return null;
  return (num / den) * 100;
}
