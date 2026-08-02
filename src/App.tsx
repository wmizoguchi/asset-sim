import { useMemo, useState } from "react";
import { simulate } from "./simulate";

function formatYen(value: number): string {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function App() {
  const [principal, setPrincipal] = useState(1000000);
  const [monthlyContribution, setMonthlyContribution] = useState(30000);
  const [annualRatePercent, setAnnualRatePercent] = useState(5);
  const [years, setYears] = useState(20);

  const results = useMemo(
    () =>
      simulate({
        principal,
        monthlyContribution,
        annualRate: annualRatePercent / 100,
        years,
      }),
    [principal, monthlyContribution, annualRatePercent, years],
  );

  const final = results[results.length - 1];

  return (
    <main style={{ fontFamily: "sans-serif", maxWidth: 720, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>資産運用シミュレータ</h1>
      <p style={{ color: "#555" }}>
        初期投資額・毎月の積立額・想定年率・運用年数を入力すると、将来の資産額を推定します。
      </p>

      <section style={{ display: "grid", gap: "1rem", marginBottom: "2rem" }}>
        <label>
          初期投資額（円）
          <input
            type="number"
            value={principal}
            min={0}
            onChange={(e) => setPrincipal(Number(e.target.value))}
            style={{ width: "100%" }}
          />
        </label>
        <label>
          毎月の積立額（円）
          <input
            type="number"
            value={monthlyContribution}
            min={0}
            onChange={(e) => setMonthlyContribution(Number(e.target.value))}
            style={{ width: "100%" }}
          />
        </label>
        <label>
          想定年率（%）
          <input
            type="number"
            value={annualRatePercent}
            step={0.1}
            onChange={(e) => setAnnualRatePercent(Number(e.target.value))}
            style={{ width: "100%" }}
          />
        </label>
        <label>
          運用年数
          <input
            type="number"
            value={years}
            min={1}
            max={80}
            onChange={(e) => setYears(Number(e.target.value))}
            style={{ width: "100%" }}
          />
        </label>
      </section>

      {final && (
        <section style={{ marginBottom: "2rem" }}>
          <h2>{years}年後の推定結果</h2>
          <p>
            資産総額: <strong>{formatYen(final.balance)}</strong>
          </p>
          <p>
            うち投入元本: {formatYen(final.totalContributed)} / 運用益:{" "}
            {formatYen(final.balance - final.totalContributed)}
          </p>
        </section>
      )}

      <section>
        <h2>年次推移</h2>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>年</th>
              <th style={{ textAlign: "right", borderBottom: "1px solid #ccc" }}>資産総額</th>
              <th style={{ textAlign: "right", borderBottom: "1px solid #ccc" }}>投入元本</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => (
              <tr key={r.year}>
                <td>{r.year}</td>
                <td style={{ textAlign: "right" }}>{formatYen(r.balance)}</td>
                <td style={{ textAlign: "right" }}>{formatYen(r.totalContributed)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
