import { PageHeader } from "../ui";

const DAYS = ["Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SHIFTS: [string, string[]][] = [
  ["Owner", ["12–9", "12–9", "12–6", "12–6", "12–6", "12–8"]],
  ["Counter 2", ["—", "—", "6–10", "6–1", "6–1", "—"]],
  ["Driver 1", ["5–9", "5–9", "5–10", "6–1", "6–1", "—"]],
  ["Driver 2", ["—", "—", "—", "8–1", "8–1", "12–8"]],
];

/** In-store people on after 10 pm (drivers are on the road, not in the store). */
function lateCover(dayIdx: number) {
  return SHIFTS.filter(([who, s]) => !who.startsWith("Driver") && /–1$/.test(s[dayIdx])).length;
}

export function Staff() {
  const fri = lateCover(3);
  const sat = lateCover(4);
  return (
    <>
      <PageHeader title="Late shifts" sub="Two people in the store after 10 pm on Fridays and Saturdays, plus drivers." />
      <section className="pn" aria-labelledby="rota-h">
        <h2 id="rota-h" className="sr-only">
          Rota
        </h2>
        <div className="tw" tabIndex={0} role="region" aria-label="Rota">
          <table className="t">
            <thead>
              <tr>
                <th scope="col">Staff</th>
                {DAYS.map((d) => (
                  <th scope="col" key={d}>
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SHIFTS.map(([who, s]) => (
                <tr key={who}>
                  <th scope="row" style={{ textAlign: "left" }}>
                    {who}
                  </th>
                  {s.map((x, i) => (
                    <td key={i} style={{ fontFamily: "var(--mono)", fontSize: 12.5, color: x === "—" ? "var(--gray)" : /–1$/.test(x) ? "var(--hot-ink)" : undefined, fontWeight: /–1$/.test(x) ? 600 : undefined }}>
                      {x}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ margin: "12px 0 0" }}>
          <span className="sample">Sample schedule</span> <span className="muted" style={{ fontSize: 13 }}>Monday closed until hours are confirmed.</span>
        </p>
      </section>
      <div className="g g3 mt">
        <section className="pn">
          <h2>Two in store after 10 pm</h2>
          <div className="ls" style={{ marginTop: 6 }}>
            <div className="it">
              <span>Friday</span>
              <span className={`pill ${fri >= 2 ? "p-ok" : "p-bad"}`}>{fri} on</span>
            </div>
            <div className="it">
              <span>Saturday</span>
              <span className={`pill ${sat >= 2 ? "p-ok" : "p-bad"}`}>{sat} on</span>
            </div>
          </div>
          {(fri < 2 || sat < 2) && (
            <p className="warnbox" style={{ marginTop: 10 }}>
              Only one person in the store after 10 pm. Add a second counter shift.
            </p>
          )}
        </section>
        <section className="pn">
          <h2>Training</h2>
          <div className="ls" style={{ marginTop: 6 }}>
            <div className="it">
              <span>
                Owner<small>Retailer training</small>
              </span>
              <span className="pill p-ok">Current</span>
            </div>
            <div className="it">
              <span>
                Counter 2<small>ID checks &amp; refusals</small>
              </span>
              <span className="pill p-ok">Current</span>
            </div>
            <div className="it">
              <span>
                Drivers<small>Door ID checks, written procedure</small>
              </span>
              <span className="pill p-warn">Driver 2 due</span>
            </div>
          </div>
        </section>
        <section className="pn">
          <h2>Closing</h2>
          <div className="ls" style={{ marginTop: 6 }}>
            <div className="it">
              <span>
                Cash count, two people<small>After the 1 am close</small>
              </span>
            </div>
            <div className="it">
              <span>
                All flights landed or returned<small>Before lock-up</small>
              </span>
            </div>
            <div className="it">
              <span>Returned orders back on the shelf</span>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
