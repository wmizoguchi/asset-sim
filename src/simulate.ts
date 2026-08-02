/**
 * 資産運用シミュレーションの核となる純粋関数群。
 * UI から分離しておくことでユニットテストしやすくする。
 */

export interface SimulationInput {
  /** 初期投資額（円） */
  principal: number;
  /** 毎月の積立額（円） */
  monthlyContribution: number;
  /** 想定年率（例: 0.05 = 5%） */
  annualRate: number;
  /** シミュレーション年数 */
  years: number;
}

export interface YearlyResult {
  year: number;
  /** 年末時点の総資産額 */
  balance: number;
  /** その年までの累計投入額（元本） */
  totalContributed: number;
}

/**
 * 毎月一定額を積立てながら、年率をもとに複利で資産が増える様子をシミュレートする。
 * 月次で積立→複利計算を行い、年末時点の結果を配列で返す。
 */
export function simulate(input: SimulationInput): YearlyResult[] {
  const { principal, monthlyContribution, annualRate, years } = input;

  if (years <= 0) {
    return [];
  }

  const monthlyRate = annualRate / 12;
  let balance = principal;
  let totalContributed = principal;
  const results: YearlyResult[] = [];

  for (let year = 1; year <= years; year++) {
    for (let month = 0; month < 12; month++) {
      balance += monthlyContribution;
      totalContributed += monthlyContribution;
      balance *= 1 + monthlyRate;
    }
    results.push({
      year,
      balance: Math.round(balance),
      totalContributed: Math.round(totalContributed),
    });
  }

  return results;
}

/**
 * 「毎月積立額 C を年率 r で n ヶ月積立てたときの将来価値」を表す係数（年金終価係数、期首払い）。
 * simulate() のロジック（積立→複利）と一致する: FV = C * annuityFactor(r, years)
 */
export function annuityFactor(annualRate: number, years: number): number {
  const months = Math.max(0, Math.round(years * 12));
  if (months <= 0) {
    return 0;
  }
  const monthlyRate = annualRate / 12;
  if (monthlyRate === 0) {
    return months;
  }
  return (1 + monthlyRate) * (((1 + monthlyRate) ** months - 1) / monthlyRate);
}

/**
 * 初期投資額 principal を年率 annualRate で years 年運用したときの将来価値。
 */
export function principalFutureValue(principal: number, annualRate: number, years: number): number {
  const months = Math.max(0, Math.round(years * 12));
  const monthlyRate = annualRate / 12;
  return principal * (1 + monthlyRate) ** months;
}

export interface AccountInput {
  id: string;
  /** 口座名（表示用） */
  name: string;
  /** 現在の初期投資額（円） */
  principal: number;
  /** 想定年率（例: 0.05 = 5%） */
  annualRate: number;
}

export interface RequiredContributionResult {
  /** 目標達成に必要な、全口座合計の毎月積立額 */
  totalMonthlyContribution: number;
  /** 口座ごとの必要毎月積立額（合計を口座数で均等割り） */
  perAccount: { id: string; name: string; monthlyContribution: number }[];
}

/**
 * 複数口座を持っている前提で、目標金額(targetAmount)を years 年後に達成するために
 * 必要な毎月の積立額（合計・口座ごと）を逆算する。
 *
 * 各口座の初期投資額は既存の年率でそのまま複利運用され、
 * 追加の積立額は口座数で均等に振り分けられるものとして計算する。
 */
export function calculateRequiredMonthlyContribution(
  accounts: AccountInput[],
  years: number,
  targetAmount: number,
): RequiredContributionResult {
  if (accounts.length === 0 || years <= 0) {
    return { totalMonthlyContribution: 0, perAccount: [] };
  }

  const weight = 1 / accounts.length;
  const totalAnnuityFactor = accounts.reduce(
    (sum, account) => sum + weight * annuityFactor(account.annualRate, years),
    0,
  );
  const totalPrincipalFutureValue = accounts.reduce(
    (sum, account) => sum + principalFutureValue(account.principal, account.annualRate, years),
    0,
  );

  const remaining = targetAmount - totalPrincipalFutureValue;
  const totalMonthlyContribution =
    totalAnnuityFactor > 0 ? Math.max(0, remaining / totalAnnuityFactor) : 0;

  const perAccount = accounts.map((account) => ({
    id: account.id,
    name: account.name,
    monthlyContribution: Math.round(totalMonthlyContribution * weight),
  }));

  return {
    totalMonthlyContribution: Math.round(totalMonthlyContribution),
    perAccount,
  };
}
