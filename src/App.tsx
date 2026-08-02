import { useEffect, useMemo, useState } from "react";
import {
  calculateRequiredMonthlyContribution,
  simulate,
  type AccountInput,
} from "./simulate";

const STORAGE_KEY = "asset-sim:v2";

function formatYen(value: number): string {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(value);
}

interface PersistedState {
  mode: "forecast" | "reverse";
  principal: number;
  monthlyContribution: number;
  annualRatePercent: number;
  years: number;
  targetAmount: number;
  accounts: AccountInput[];
}

function loadPersistedState(): PersistedState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedState;
  } catch {
    return null;
  }
}

function makeAccountId(): string {
  return `acc-${Math.random().toString(36).slice(2, 10)}`;
}

const defaultAccounts: AccountInput[] = [
  { id: makeAccountId(), name: "口座1", principal: 1000000, annualRate: 0.05 },
];

export default function App() {
  const persisted = useMemo(() => loadPersistedState(), []);

  const [mode, setMode] = useState<"forecast" | "reverse">(persisted?.mode ?? "forecast");

  // 通常シミュレーション（将来予測）用の入力
  const [principal, setPrincipal] = useState(persisted?.principal ?? 1000000);
  const [monthlyContribution, setMonthlyContribution] = useState(
    persisted?.monthlyContribution ?? 30000,
  );
  const [annualRatePercent, setAnnualRatePercent] = useState(persisted?.annualRatePercent ?? 5);
  const [years, setYears] = useState(persisted?.years ?? 20);

  // 逆算モード用の入力
  const [targetAmount, setTargetAmount] = useState(persisted?.targetAmount ?? 20000000);
  const [accounts, setAccounts] = useState<AccountInput[]>(
    persisted?.accounts && persisted.accounts.length > 0 ? persisted.accounts : defaultAccounts,
  );

  useEffect(() => {
    const state: PersistedState = {
      mode,
      principal,
      monthlyContribution,
      annualRatePercent,
      years,
      targetAmount,
      accounts,
    };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // localStorageが使えない環境では諦めて何もしない
    }
  }, [mode, principal, monthlyContribution, annualRatePercent, years, targetAmount, accounts]);

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

  const reverseResult = useMemo(
    () => calculateRequiredMonthlyContribution(accounts, years, targetAmount),
    [accounts, years, targetAmount],
  );

  function updateAccount(id: string, patch: Partial<AccountInput>) {
    setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  }

  function addAccount() {
    setAccounts((prev) => [
      ...prev,
      {
        id: makeAccountId(),
        name: `口座${prev.length + 1}`,
        principal: 0,
        annualRate: 0.03,
      },
    ]);
  }

  function removeAccount(id: string) {
    setAccounts((prev) => (prev.length > 1 ? prev.filter((a) => a.id !== id) : prev));
  }

  return (
    <main style={{ fontFamily: "sans-serif", maxWidth: 720, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>資産運用シミュレータ</h1>
      <p style={{ color: "#555" }}>
        入力した内容はこのブラウザにキャッシュされ、次回開いたときも復元されます。
      </p>

      <div role="tablist" style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
        <button
          type="button"
          onClick={() => setMode("forecast")}
          aria-pressed={mode === "forecast"}
          style={{ fontWeight: mode === "forecast" ? "bold" : "normal" }}
        >
          将来予測
        </button>
        <button
          type="button"
          onClick={() => setMode("reverse")}
          aria-pressed={mode === "reverse"}
          style={{ fontWeight: mode === "reverse" ? "bold" : "normal" }}
        >
          目標額から逆算
        </button>
      </div>

      {mode === "forecast" && (
        <>
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
        </>
      )}

      {mode === "reverse" && (
        <>
          <section style={{ display: "grid", gap: "1rem", marginBottom: "1.5rem" }}>
            <label>
              目標金額（円）
              <input
                type="number"
                value={targetAmount}
                min={0}
                onChange={(e) => setTargetAmount(Number(e.target.value))}
                style={{ width: "100%" }}
              />
            </label>
            <label>
              達成までの年数
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

          <section style={{ marginBottom: "1.5rem" }}>
            <h2>口座</h2>
            {accounts.map((account) => (
              <div
                key={account.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr auto",
                  gap: "0.5rem",
                  alignItems: "end",
                  marginBottom: "0.75rem",
                }}
              >
                <label>
                  口座名
                  <input
                    type="text"
                    value={account.name}
                    onChange={(e) => updateAccount(account.id, { name: e.target.value })}
                    style={{ width: "100%" }}
                  />
                </label>
                <label>
                  現在の資産額（円）
                  <input
                    type="number"
                    value={account.principal}
                    min={0}
                    onChange={(e) =>
                      updateAccount(account.id, { principal: Number(e.target.value) })
                    }
                    style={{ width: "100%" }}
                  />
                </label>
                <label>
                  想定年率（%）
                  <input
                    type="number"
                    value={account.annualRate * 100}
                    step={0.1}
                    onChange={(e) =>
                      updateAccount(account.id, { annualRate: Number(e.target.value) / 100 })
                    }
                    style={{ width: "100%" }}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => removeAccount(account.id)}
                  disabled={accounts.length <= 1}
                >
                  削除
                </button>
              </div>
            ))}
            <button type="button" onClick={addAccount}>
              + 口座を追加
            </button>
          </section>

          <section>
            <h2>必要な毎月積立額</h2>
            <p>
              合計: <strong>{formatYen(reverseResult.totalMonthlyContribution)}</strong> / 月
            </p>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>口座</th>
                  <th style={{ textAlign: "right", borderBottom: "1px solid #ccc" }}>
                    毎月の積立額
                  </th>
                </tr>
              </thead>
              <tbody>
                {reverseResult.perAccount.map((a) => (
                  <tr key={a.id}>
                    <td>{a.name}</td>
                    <td style={{ textAlign: "right" }}>{formatYen(a.monthlyContribution)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </main>
  );
}
