export type RoiInput = {
  invoicesPerMonth: number
  manualMinsPerInvoice: number
  automationMinsPerInvoice: number
  hourlyWage: number
  softwareCostPerMonth: number
  implementationCostOneTime?: number
}

export type RoiResult = {
  monthlyManualLaborCost: number
  monthlyAutomatedLaborCost: number
  monthlySoftwareCost: number
  monthlyTotalManual: number
  monthlyTotalAutomated: number
  monthlySavings: number
  annualSavings: number
  annualSoftwareCost: number
  roiRatio: number // e.g. 2.5 means 250%
  roiPercent: number // e.g. 250 means 250%
  paybackMonths: number | null // months to recover implementation cost
  series: Array<{ month: number; manual: number; automated: number; cumulativeSavings: number }>
}

export function toNumber(n: unknown, fallback = 0): number {
  const v = typeof n === "string" ? Number.parseFloat(n) : (n as number)
  return Number.isFinite(v) ? v : fallback
}

export function calcRoi(input: RoiInput): RoiResult {
  const invoicesPerMonth = toNumber(input.invoicesPerMonth)
  const manualMinsPerInvoice = toNumber(input.manualMinsPerInvoice)
  const automationMinsPerInvoice = toNumber(input.automationMinsPerInvoice)
  const hourlyWage = toNumber(input.hourlyWage)
  const softwareCostPerMonth = toNumber(input.softwareCostPerMonth)
  const implementationCostOneTime = toNumber(input.implementationCostOneTime ?? 0)

  const manualCostPerInvoice = (manualMinsPerInvoice / 60) * hourlyWage
  const automatedCostPerInvoice = (automationMinsPerInvoice / 60) * hourlyWage

  const monthlyManualLaborCost = invoicesPerMonth * manualCostPerInvoice
  const monthlyAutomatedLaborCost = invoicesPerMonth * automatedCostPerInvoice

  const monthlySoftwareCost = softwareCostPerMonth

  const monthlyTotalManual = monthlyManualLaborCost
  const monthlyTotalAutomated = monthlyAutomatedLaborCost + monthlySoftwareCost

  const monthlySavings = monthlyTotalManual - monthlyTotalAutomated
  const annualSavings = monthlySavings * 12
  const annualSoftwareCost = monthlySoftwareCost * 12

  const roiRatio = annualSoftwareCost > 0 ? annualSavings / annualSoftwareCost : 0
  const roiPercent = roiRatio * 100

  const paybackMonths =
    monthlySavings > 0 && implementationCostOneTime > 0 ? implementationCostOneTime / monthlySavings : null

  // Build 12-month series for visualization
  const series: RoiResult["series"] = []
  let cumulative = 0
  for (let m = 1; m <= 12; m++) {
    cumulative += monthlySavings
    series.push({
      month: m,
      manual: monthlyTotalManual,
      automated: monthlyTotalAutomated,
      cumulativeSavings: cumulative,
    })
  }

  return {
    monthlyManualLaborCost,
    monthlyAutomatedLaborCost,
    monthlySoftwareCost,
    monthlyTotalManual,
    monthlyTotalAutomated,
    monthlySavings,
    annualSavings,
    annualSoftwareCost,
    roiRatio,
    roiPercent,
    paybackMonths,
    series,
  }
}
