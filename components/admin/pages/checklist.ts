/** Opening/closing compliance checklist. Keys match DEFAULT_CHECKLIST in the mock repository. */
export const CHECKLIST = [
  { key: "signs", label: "Age and health warning signs posted at the counter" },
  { key: "hidden", label: "Nothing visible from Dunlop St through the window" },
  { key: "sign", label: "Outside sign shows the name only, no promo wording" },
  { key: "stamps", label: "All stock on the shelf has the Ontario stamp" },
  { key: "bags", label: "Delivery bags labelled 19+" },
  { key: "two", label: "Two staff on after 10 pm (Fri & Sat)" },
  { key: "testing", label: "Testing rules posted: two people max, own device or disposable mouthpiece" },
  { key: "reg", label: "Specialty vape store registration on file with the health unit" },
] as const;
