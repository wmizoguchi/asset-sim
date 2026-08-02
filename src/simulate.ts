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
