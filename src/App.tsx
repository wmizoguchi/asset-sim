import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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

function formatYenShort(value: number): string {
  if (Math.abs(value) >= 1_0000_0000) return `${(value / 1_0000_0000).toFixed(1)}億`;
  if (Math.abs(value) >= 1_0000) return `${Math.round(value / 1_0000)}万`;
  return `${value}`;
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

// --- 共通UIパーツ -----------------------------------------------------

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 ${className}`}
    >
      {children}
    </section>
  );
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
      {children}
    </h2>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-600 dark:text-gray-300">
        {label}
      </span>
      <div className="relative">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 tabular-nums text-gray-900 outline-none transition focus:border-accent-500 focus:bg-white focus:ring-2 focus:ring-accent-100 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-accent-700/30"
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
            {suffix}
          </span>
        )}
      </div>
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-600 dark:text-gray-300">
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-gray-900 outline-none transition focus:border-accent-500 focus:bg-white focus:ring-2 focus:ring-accent-100 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-accent-700/30"
      />
    </label>
  );
}

function StatPill({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "accent" }) {
  return (
    <div
      className={`rounded-xl p-4 ${
        tone === "accent"
          ? "bg-accent-50 dark:bg-accent-700/20"
          : "bg-gray-50 dark:bg-gray-900/40"
      }`}
    >
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
      <p
        className={`mt-1 text-xl font-bold tabular-nums ${
          tone === "accent" ? "text-accent-700 dark:text-accent-500" : "text-gray-900 dark:text-gray-100"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

// --- メインアプリ -------------------------------------------------------

export default function App() {
  const persisted = useMemo(() => loadPersistedState(), []);

  const [mode, setMode] = useState<"forecast" | "reverse">(persisted?.mode ?? "forecast");

  const [principal, setPrincipal] = useState(persisted?.principal ?? 1000000);
  const [monthlyContribution, setMonthlyContribution] = useState(
    persisted?.monthlyContribution ?? 30000,
  );
  const [annualRatePercent, setAnnualRatePercent] = useState(persisted?.annualRatePercent ?? 5);
  const [years, setYears] = useState(persisted?.years ?? 20);

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

  const chartData = useMemo(
    () =>
      results.map((r) => ({
        year: `${r.year}年`,
        資産総額: r.balance,
        投入元本: r.totalContributed,
      })),
    [results],
  );

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
    <main className="min-h-screen bg-gray-50 px-4 py-8 dark:bg-gray-900 sm:py-12">
      <div className="mx-auto max-w-3xl space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            資産運用シミュレータ
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            入力した内容はこのブラウザにキャッシュされ、次回開いたときも復元されます。
          </p>
        </header>

        <div
          role="tablist"
          className="inline-flex rounded-full bg-gray-200/70 p-1 dark:bg-gray-800"
        >
          <button
            type="button"
            role="tab"
            onClick={() => setMode("forecast")}
            aria-pressed={mode === "forecast"}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              mode === "forecast"
                ? "bg-white text-accent-700 shadow-sm dark:bg-gray-700 dark:text-accent-500"
                : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            将来予測
          </button>
          <button
            type="button"
            role="tab"
            onClick={() => setMode("reverse")}
            aria-pressed={mode === "reverse"}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              mode === "reverse"
                ? "bg-white text-accent-700 shadow-sm dark:bg-gray-700 dark:text-accent-500"
                : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            目標額から逆算
          </button>
        </div>

        {mode === "forecast" && (
          <>
            <Card>
              <CardTitle>入力条件</CardTitle>
              <div className="grid gap-4 sm:grid-cols-2">
                <NumberField
                  label="初期投資額"
                  value={principal}
                  min={0}
                  onChange={setPrincipal}
                  suffix="円"
                />
                <NumberField
                  label="毎月の積立額"
                  value={monthlyContribution}
                  min={0}
                  onChange={setMonthlyContribution}
                  suffix="円"
                />
                <NumberField
                  label="想定年率"
                  value={annualRatePercent}
                  step={0.1}
                  onChange={setAnnualRatePercent}
                  suffix="%"
                />
                <NumberField
                  label="運用年数"
                  value={years}
                  min={1}
                  max={80}
                  onChange={setYears}
                  suffix="年"
                />
              </div>
            </Card>

            {final && (
              <Card>
                <CardTitle>{years}年後の推定結果</CardTitle>
                <div className="grid gap-3 sm:grid-cols-3">
                  <StatPill label="資産総額" value={formatYen(final.balance)} tone="accent" />
                  <StatPill label="投入元本" value={formatYen(final.totalContributed)} />
                  <StatPill
                    label="運用益"
                    value={formatYen(final.balance - final.totalContributed)}
                  />
                </div>
              </Card>
            )}

            <Card>
              <CardTitle>年次推移</CardTitle>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorContributed" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="year" tick={{ fontSize: 12, fill: "#9ca3af" }} />
                    <YAxis
                      tick={{ fontSize: 12, fill: "#9ca3af" }}
                      tickFormatter={formatYenShort}
                      width={56}
                    />
                    <Tooltip
                      formatter={(value: number) => formatYen(value)}
                      contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb" }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Area
                      type="monotone"
                      dataKey="資産総額"
                      stroke="#6366f1"
                      strokeWidth={2}
                      fill="url(#colorBalance)"
                    />
                    <Area
                      type="monotone"
                      dataKey="投入元本"
                      stroke="#94a3b8"
                      strokeWidth={2}
                      fill="url(#colorContributed)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4 max-h-56 overflow-y-auto rounded-lg border border-gray-100 dark:border-gray-700">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-gray-50 dark:bg-gray-900/60">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-400">
                        年
                      </th>
                      <th className="px-3 py-2 text-right font-medium text-gray-500 dark:text-gray-400">
                        資産総額
                      </th>
                      <th className="px-3 py-2 text-right font-medium text-gray-500 dark:text-gray-400">
                        投入元本
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {results.map((r) => (
                      <tr key={r.year} className="tabular-nums">
                        <td className="px-3 py-1.5 text-gray-700 dark:text-gray-300">{r.year}</td>
                        <td className="px-3 py-1.5 text-right text-gray-900 dark:text-gray-100">
                          {formatYen(r.balance)}
                        </td>
                        <td className="px-3 py-1.5 text-right text-gray-500 dark:text-gray-400">
                          {formatYen(r.totalContributed)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}

        {mode === "reverse" && (
          <>
            <Card>
              <CardTitle>目標条件</CardTitle>
              <div className="grid gap-4 sm:grid-cols-2">
                <NumberField
                  label="目標金額"
                  value={targetAmount}
                  min={0}
                  onChange={setTargetAmount}
                  suffix="円"
                />
                <NumberField
                  label="達成までの年数"
                  value={years}
                  min={1}
                  max={80}
                  onChange={setYears}
                  suffix="年"
                />
              </div>
            </Card>

            <Card>
              <CardTitle>口座</CardTitle>
              <div className="space-y-3">
                {accounts.map((account) => (
                  <div
                    key={account.id}
                    className="grid grid-cols-1 gap-3 rounded-xl border border-gray-100 p-3 dark:border-gray-700 sm:grid-cols-[1.2fr_1fr_1fr_auto] sm:items-end"
                  >
                    <TextField
                      label="口座名"
                      value={account.name}
                      onChange={(v) => updateAccount(account.id, { name: v })}
                    />
                    <NumberField
                      label="現在の資産額"
                      value={account.principal}
                      min={0}
                      onChange={(v) => updateAccount(account.id, { principal: v })}
                      suffix="円"
                    />
                    <NumberField
                      label="想定年率"
                      value={account.annualRate * 100}
                      step={0.1}
                      onChange={(v) => updateAccount(account.id, { annualRate: v / 100 })}
                      suffix="%"
                    />
                    <button
                      type="button"
                      onClick={() => removeAccount(account.id)}
                      disabled={accounts.length <= 1}
                      className="h-10 rounded-lg border border-gray-200 px-3 text-sm font-medium text-gray-500 transition hover:border-red-300 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-600 dark:text-gray-400"
                    >
                      削除
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addAccount}
                className="mt-4 rounded-lg border border-dashed border-gray-300 px-4 py-2 text-sm font-medium text-gray-500 transition hover:border-accent-400 hover:text-accent-600 dark:border-gray-600 dark:text-gray-400"
              >
                + 口座を追加
              </button>
            </Card>

            <Card>
              <CardTitle>必要な毎月積立額</CardTitle>
              <StatPill
                label="合計 / 月"
                value={formatYen(reverseResult.totalMonthlyContribution)}
                tone="accent"
              />
              <div className="mt-4 overflow-hidden rounded-lg border border-gray-100 dark:border-gray-700">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-900/60">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-400">
                        口座
                      </th>
                      <th className="px-3 py-2 text-right font-medium text-gray-500 dark:text-gray-400">
                        毎月の積立額
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {reverseResult.perAccount.map((a) => (
                      <tr key={a.id} className="tabular-nums">
                        <td className="px-3 py-1.5 text-gray-700 dark:text-gray-300">{a.name}</td>
                        <td className="px-3 py-1.5 text-right text-gray-900 dark:text-gray-100">
                          {formatYen(a.monthlyContribution)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}
      </div>
    </main>
  );
}
