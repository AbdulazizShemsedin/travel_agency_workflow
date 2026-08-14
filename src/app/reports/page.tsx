import { BarChart3, Download, FileSpreadsheet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Reports & Analytics
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Applicant processing metrics, conversion rates, and departure timelines.
          </p>
        </div>
        <Button variant="outline" size="sm" className="text-xs text-slate-700 bg-white">
          <Download className="mr-1.5 h-3.5 w-3.5" /> Export All Reports
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { title: "Data Collection Rate", value: "92%", desc: "+4% from last week" },
          { title: "CV Generation Speed", value: "1.4 days", desc: "Average turnaround" },
          { title: "Embassy Stamp Rate", value: "88%", desc: "Approval rate" },
          { title: "Monthly Departures", value: "34", desc: "On target" },
        ].map((stat) => (
          <Card key={stat.title} className="border-slate-200/80 bg-white">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-semibold uppercase text-slate-500">
                {stat.title}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
              <p className="text-xs text-emerald-700 mt-1">{stat.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
