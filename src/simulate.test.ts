import { describe, expect, it } from "vitest";
import { simulate } from "./simulate";

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
