"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"

type Props = {
  onResult: (scenario: any) => void
}

export function RoiForm({ onResult }: Props) {
  const { toast } = useToast()
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    invoicesPerMonth: 500,
    manualMinsPerInvoice: 12,
    automationMinsPerInvoice: 3,
    hourlyWage: 35,
    softwareCostPerMonth: 250,
    implementationCostOneTime: 0,
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: Number(value) }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch("/api/calc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to calculate")
      onResult(data.scenario)
      // Persist a copy into /api/scenarios in-memory list for listing endpoint
      await fetch("/api/scenarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario: data.scenario }),
      })
      toast({ title: "Calculation complete", description: "Scenario saved to history (ephemeral)." })
    } catch (err: any) {
      toast({ title: "Error", description: err?.message ?? "Something went wrong" })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-balance">Automation ROI Calculator</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="invoicesPerMonth">Invoices per month</Label>
            <Input
              id="invoicesPerMonth"
              name="invoicesPerMonth"
              type="number"
              min={0}
              value={form.invoicesPerMonth}
              onChange={handleChange}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="manualMinsPerInvoice">Manual mins / invoice</Label>
            <Input
              id="manualMinsPerInvoice"
              name="manualMinsPerInvoice"
              type="number"
              min={0}
              value={form.manualMinsPerInvoice}
              onChange={handleChange}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="automationMinsPerInvoice">Automated mins / invoice</Label>
            <Input
              id="automationMinsPerInvoice"
              name="automationMinsPerInvoice"
              type="number"
              min={0}
              value={form.automationMinsPerInvoice}
              onChange={handleChange}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="hourlyWage">Hourly wage ($)</Label>
            <Input
              id="hourlyWage"
              name="hourlyWage"
              type="number"
              min={0}
              value={form.hourlyWage}
              onChange={handleChange}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="softwareCostPerMonth">Software cost / month ($)</Label>
            <Input
              id="softwareCostPerMonth"
              name="softwareCostPerMonth"
              type="number"
              min={0}
              value={form.softwareCostPerMonth}
              onChange={handleChange}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="implementationCostOneTime">One-time implementation cost ($)</Label>
            <Input
              id="implementationCostOneTime"
              name="implementationCostOneTime"
              type="number"
              min={0}
              value={form.implementationCostOneTime}
              onChange={handleChange}
            />
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "Calculating…" : "Calculate ROI"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
