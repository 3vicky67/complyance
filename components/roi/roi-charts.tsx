"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"

type Props = {
  scenario: any | null
}

export function RoiResults({ scenario }: Props) {
  if (!scenario) return null
  const { result } = scenario

  const costData = [
    {
      name: "Monthly Cost",
      Manual: Math.round(result.monthlyTotalManual),
      Automated: Math.round(result.monthlyTotalAutomated),
    },
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-balance">Monthly Cost Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              Manual: { label: "Manual", color: "hsl(var(--chart-1))" },
              Automated: { label: "Automated", color: "hsl(var(--chart-2))" },
            }}
            className="h-[280px]"
          >
            <BarChart data={costData} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="Manual" fill="var(--color-Manual)" radius={6} />
              <Bar dataKey="Automated" fill="var(--color-Automated)" radius={6} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-balance">Key Metrics</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <Metric label="Monthly savings" value={result.monthlySavings} prefix="$" />
          <Metric label="Annual savings" value={result.annualSavings} prefix="$" />
          <Metric label="ROI" value={result.roiPercent} suffix="%" />
          <Metric
            label="Payback"
            value={result.paybackMonths ? result.paybackMonths : 0}
            suffix={result.paybackMonths ? " months" : " —"}
          />
        </CardContent>
      </Card>

      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle className="text-balance">12-Month Cumulative Savings</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{ cumulativeSavings: { label: "Cumulative Savings", color: "hsl(var(--chart-3))" } }}
            className="h-[280px]"
          >
            <LineChart data={scenario.result.series}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                type="monotone"
                dataKey="cumulativeSavings"
                stroke="var(--color-cumulativeSavings)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}

function Metric({ label, value, prefix, suffix }: { label: string; value: number; prefix?: string; suffix?: string }) {
  const formatted =
    typeof value === "number"
      ? prefix
        ? `${prefix}${Math.round(value).toLocaleString()}`
        : `${Math.round(value).toLocaleString()}${suffix ?? ""}`
      : "—"
  return (
    <div className="flex items-center justify-between rounded-md border p-3">
      <div className="text-muted-foreground">{label}</div>
      <div className="font-mono font-medium tabular-nums">
        {suffix && !prefix ? `${Math.round(value).toLocaleString()}${suffix}` : formatted}
      </div>
    </div>
  )
}
