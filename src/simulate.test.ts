import { describe, expect, it } from "vitest";
import { calculateRequiredMonthlyContribution, simulate } from "./simulate";

describe("simulate", () => {
  it("returns an empty array when years is 0", () => {
    expect(
      simulate({ principal: 1000, monthlyContribution: 0, annualRate: 0.05, years: 0 }),
    ).toEqual([]);
  });

  it("keeps balance flat when rate is 0 and no contribution", () => {
    const result = simulate({
      principal: 100000,
      monthlyContribution: 0,
      annualRate: 0,
      years: 3,
    });
    expect(result).toHaveLength(3);
    expect(result[2].balance).toBe(100000);
    expect(result[2].totalContributed).toBe(100000);
  });

  it("accumulates contributions without growth when rate is 0", () => {
    const result = simulate({
      principal: 0,
      monthlyContribution: 10000,
      annualRate: 0,
      years: 1,
    });
    expect(result[0].balance).toBe(120000);
    expect(result[0].totalContributed).toBe(120000);
  });

  it("grows balance faster than contributions when rate is positive", () => {
    const result = simulate({
      principal: 100000,
      monthlyContribution: 10000,
      annualRate: 0.05,
      years: 10,
    });
    const last = result[result.length - 1];
    expect(last.balance).toBeGreaterThan(last.totalContributed);
  });

  it("produces one result entry per year", () => {
    const result = simulate({
      principal: 0,
      monthlyContribution: 1000,
      annualRate: 0.03,
      years: 5,
    });
    expect(result.map((r) => r.year)).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("calculateRequiredMonthlyContribution", () => {
  it("returns 0 for empty accounts", () => {
    const result = calculateRequiredMonthlyContribution([], 10, 10_000_000);
    expect(result.totalMonthlyContribution).toBe(0);
    expect(result.perAccount).toEqual([]);
  });

  it("matches simulate() for a single account with 0% rate (no growth, exact sum)", () => {
    const years = 5;
    const target = 6_000_000;
    const accounts = [{ id: "a1", name: "口座1", principal: 0, annualRate: 0 }];
    const result = calculateRequiredMonthlyContribution(accounts, years, target);

    // rate 0 の場合、必要な毎月積立額 = target / (years*12) に一致するはず
    expect(result.totalMonthlyContribution).toBe(Math.round(target / (years * 12)));

    // その積立額で simulate した場合、目標に到達すること
    const check = simulate({
      principal: 0,
      monthlyContribution: result.totalMonthlyContribution,
      annualRate: 0,
      years,
    });
    expect(check[check.length - 1].balance).toBeCloseTo(target, -2);
  });

  it("requires less monthly contribution when existing principal is larger", () => {
    const years = 10;
    const target = 10_000_000;
    const lowPrincipal = calculateRequiredMonthlyContribution(
      [{ id: "a1", name: "口座1", principal: 0, annualRate: 0.03 }],
      years,
      target,
    );
    const highPrincipal = calculateRequiredMonthlyContribution(
      [{ id: "a1", name: "口座1", principal: 5_000_000, annualRate: 0.03 }],
      years,
      target,
    );
    expect(highPrincipal.totalMonthlyContribution).toBeLessThan(
      lowPrincipal.totalMonthlyContribution,
    );
  });

  it("splits the required contribution evenly across multiple accounts", () => {
    const years = 8;
    const target = 8_000_000;
    const accounts = [
      { id: "a1", name: "口座1", principal: 0, annualRate: 0.04 },
      { id: "a2", name: "口座2", principal: 0, annualRate: 0.04 },
    ];
    const result = calculateRequiredMonthlyContribution(accounts, years, target);
    expect(result.perAccount).toHaveLength(2);
    const sumPerAccount = result.perAccount.reduce((s, a) => s + a.monthlyContribution, 0);
    // 均等割りなので合計とほぼ一致する（丸め誤差のみ許容）
    expect(sumPerAccount).toBeCloseTo(result.totalMonthlyContribution, -1);
    expect(result.perAccount[0].monthlyContribution).toBeCloseTo(
      result.perAccount[1].monthlyContribution,
      -1,
    );
  });

  it("returns 0 (not negative) when principal alone already exceeds the target", () => {
    const result = calculateRequiredMonthlyContribution(
      [{ id: "a1", name: "口座1", principal: 100_000_000, annualRate: 0.03 }],
      10,
      10_000_000,
    );
    expect(result.totalMonthlyContribution).toBe(0);
  });
});
