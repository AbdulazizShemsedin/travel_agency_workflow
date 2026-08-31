"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CreditCard,
  CheckCircle2,
  Clock,
  Calendar,
  Download,
  Search,
  RefreshCw,
  Layers,
  DollarSign,
  UserCheck,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { fetchOperationalWorkspaceData } from "@/lib/api/applicantApi";
import { WorkspaceApplicantRow } from "@/types/workspace";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SimpleSelect } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function InjazReportView() {
  const [paymentFilter, setPaymentFilter] = React.useState<string>("All");
  const [medicalFilter, setMedicalFilter] = React.useState<string>("All");
  const [searchQuery, setSearchQuery] = React.useState<string>("");

  const {
    data: injazData = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["injaz_report_data"],
    queryFn: () => fetchOperationalWorkspaceData("injaz", "Saudi Arabia"),
    staleTime: 10000,
  });

  // Calculate Injaz-specific KPIs
  const totalInjaz = injazData.length;
  const paidInjaz = injazData.filter((r) => r.injazPayment === "PAID").length;
  const unpaidInjaz = injazData.filter((r) => r.injazPayment !== "PAID").length;
  const completedInjaz = injazData.filter((r) => r.injaz?.status === "Completed").length;
  const appointmentsScheduled = injazData.filter((r) => r.appointmentDate && r.appointmentDate !== "—").length;

  const fitMedicals = injazData.filter((r) => (r.medicalStatus || "").toUpperCase().includes("FIT")).length;

  const paymentPieData = [
    { name: "Paid", value: paidInjaz, color: "#059669" },
    { name: "Unpaid / Pending", value: unpaidInjaz, color: "#d97706" },
  ].filter((d) => d.value > 0);

  // Duration metrics
  const durationUnder30 = injazData.filter((r) => (r.duration || 0) <= 30).length;
  const duration30to60 = injazData.filter((r) => (r.duration || 0) > 30 && (r.duration || 0) <= 60).length;
  const duration60to90 = injazData.filter((r) => (r.duration || 0) > 60 && (r.duration || 0) <= 90).length;
  const durationOver90 = injazData.filter((r) => (r.duration || 0) > 90).length;

  const durationData = [
    { name: "< 30 Days", count: durationUnder30, fill: "#10b981" },
    { name: "30-60 Days", count: duration30to60, fill: "#3b82f6" },
    { name: "60-90 Days", count: duration60to90, fill: "#f59e0b" },
    { name: "> 90 Days", count: durationOver90, fill: "#ef4444" },
  ];

  // Filtered dataset
  const filteredRows = React.useMemo(() => {
    return injazData.filter((row) => {
      const matchesPayment =
        paymentFilter === "All" ||
        (paymentFilter === "PAID" && row.injazPayment === "PAID") ||
        (paymentFilter === "UNPAID" && row.injazPayment !== "PAID");

      const matchesMedical =
        medicalFilter === "All" ||
        (medicalFilter === "FIT" && (row.medicalStatus || "").toUpperCase().includes("FIT")) ||
        (medicalFilter === "UNFIT" && (row.medicalStatus || "").toUpperCase().includes("UNFIT"));

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        row.fullName.toLowerCase().includes(q) ||
        row.passportNumber.toLowerCase().includes(q) ||
        (row.contact && row.contact.toLowerCase().includes(q));

      return matchesPayment && matchesMedical && matchesSearch;
    });
  }, [injazData, paymentFilter, medicalFilter, searchQuery]);

  // CSV Export
  const handleExportCSV = () => {
    if (filteredRows.length === 0) return;
    const headers = [
      "NO",
      "NAME",
      "PASSPORT",
      "CONTRACT",
      "DURATION",
      "MEDICAL",
      "MED DATE",
      "MEDI REMAINING",
      "INJAZ PAYMENT",
      "APPOINTMENT DATE",
      "CONTACT",
      "REMARK",
    ];

    const rows = filteredRows.map((row, idx) => [
      idx + 1,
      `"${row.fullName.replace(/"/g, '""')}"`,
      `"${row.passportNumber}"`,
      `"${row.contractDate || ""}"`,
      row.duration ?? 0,
      `"${row.medicalStatus || "Pending"}"`,
      `"${row.medicalDate || ""}"`,
      `"${row.medicalRemaining || ""}"`,
      `"${row.injazPayment || "UNPAID"}"`,
      `"${row.appointmentDate || ""}"`,
      `"${(row.contact || "").replace(/"/g, '""')}"`,
      `"${(row.remark || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `teshir_injaz_report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------- */}
      {/* Top Header & Operational Actions                              */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400">
              <CreditCard className="h-4 w-4" />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Te'shir / Injaz MOFA Processing Report
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            Saudi Ministry of Foreign Affairs electronic visa application fees, biometric appointment dates, and medical linking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="h-8 px-2.5 text-xs font-medium gap-1.5 border-slate-200 dark:border-[#2c2c36]"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", (isLoading || isRefetching) && "animate-spin text-emerald-600")} />
            <span>Refresh</span>
          </Button>

          <Button
            size="sm"
            onClick={handleExportCSV}
            className="h-8 px-3 text-xs font-semibold gap-1.5 bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 text-white"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* KPI Cards Grid                                                */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121216]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">
                Total Injaz Candidates
              </span>
              <span className="p-1.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-zinc-300">
                <Layers className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900 dark:text-white">
                {totalInjaz}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-zinc-400">Saudi pipeline</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121216]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                Injaz Payment Settled
              </span>
              <span className="p-1.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-emerald-800 dark:text-emerald-400">
                {paidInjaz}
              </span>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-500">
                {totalInjaz > 0 ? `${Math.round((paidInjaz / totalInjaz) * 100)}% paid` : "0%"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121216]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                Awaiting Payment
              </span>
              <span className="p-1.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
                <Clock className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-amber-800 dark:text-amber-400">
                {unpaidInjaz}
              </span>
              <span className="text-[11px] text-amber-600 dark:text-amber-500">unsettled fees</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121216]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-blue-700 dark:text-blue-400">
                Appointments Scheduled
              </span>
              <span className="p-1.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400">
                <Calendar className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-blue-800 dark:text-blue-400">
                {appointmentsScheduled}
              </span>
              <span className="text-[11px] text-blue-600 dark:text-blue-500">biometrics set</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Visual Analytics Charts                                       */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Payment Share */}
        <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121216]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between">
              <span>Injaz MOFA Payment Status</span>
              <Badge variant="outline" className="text-[10px] font-medium">Fee Settlement</Badge>
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-zinc-400">
              Distribution of settled (Paid) vs pending Injaz fees.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-56 w-full flex items-center justify-center">
              {paymentPieData.length === 0 ? (
                <div className="text-xs text-slate-400">No Injaz data available</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={4}
                      label={({ name, percent }: any) => `${name} (${percent ? (percent * 100).toFixed(0) : 0}%)`}
                      labelLine={false}
                    >
                      {paymentPieData.map((entry, index) => (
                        <Cell key={`pay-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: "#181820", borderColor: "#272730", borderRadius: 8, fontSize: 12, color: "#fff" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Contract Duration Aging Breakdown */}
        <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121216]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between">
              <span>Duration Aging in Injaz Queue</span>
              <Badge variant="outline" className="text-[10px] font-medium">Elapsed Days</Badge>
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-zinc-400">
              Days elapsed from contract date for Te'shir candidates.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-56 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={durationData}>
                  <XAxis dataKey="name" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#181820", borderColor: "#272730", borderRadius: 8, fontSize: 12, color: "#fff" }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {durationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Detailed Operational Data Table                               */}
      {/* ------------------------------------------------------------- */}
      <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121216] overflow-hidden">
        <CardHeader className="p-4 border-b border-slate-100 dark:border-[#222227] bg-slate-50/50 dark:bg-[#15151a]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                Te'shir / Injaz Candidate Ledger
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-zinc-400">
                Accurate table matching the Te'shir / Injaz operational sheet layout.
              </CardDescription>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[200px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search candidate, passport..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 pl-8 text-xs bg-white dark:bg-[#1a1a20] border-slate-200 dark:border-[#2c2c36]"
                />
              </div>

              <div className="w-40">
                <SimpleSelect
                  value={paymentFilter}
                  onValueChange={setPaymentFilter}
                  options={[
                    { value: "All", label: "All Injaz Payments" },
                    { value: "PAID", label: "PAID" },
                    { value: "UNPAID", label: "UNPAID" },
                  ]}
                  triggerClassName="h-8 text-xs bg-white dark:bg-[#1a1a20] border-slate-200 dark:border-[#2c2c36]"
                  aria-label="Filter by Payment"
                />
              </div>

              <div className="w-36">
                <SimpleSelect
                  value={medicalFilter}
                  onValueChange={setMedicalFilter}
                  options={[
                    { value: "All", label: "All Medical" },
                    { value: "FIT", label: "FIT" },
                    { value: "UNFIT", label: "UNFIT" },
                  ]}
                  triggerClassName="h-8 text-xs bg-white dark:bg-[#1a1a20] border-slate-200 dark:border-[#2c2c36]"
                  aria-label="Filter by Medical"
                />
              </div>
            </div>
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="text-[11px] font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider bg-slate-100/90 dark:bg-[#181820]/95 border-b border-slate-200 dark:border-[#272730]">
              <tr>
                <th className="py-2.5 px-3 text-center">NO</th>
                <th className="py-2.5 px-3">NAME</th>
                <th className="py-2.5 px-3">PASSPORT</th>
                <th className="py-2.5 px-3">CONTRACT</th>
                <th className="py-2.5 px-3 text-center">DURATION</th>
                <th className="py-2.5 px-3 text-center">MEDICAL</th>
                <th className="py-2.5 px-3">MED DATE</th>
                <th className="py-2.5 px-3 text-center">MEDI REMAINING</th>
                <th className="py-2.5 px-3 text-center">INJAZ PAYMENT</th>
                <th className="py-2.5 px-3">APPOINTMENT DATE</th>
                <th className="py-2.5 px-3">CONTACT</th>
                <th className="py-2.5 px-3">REMARK</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#1f1f26]">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={12} className="py-3 px-3">
                      <div className="h-4 bg-slate-200 dark:bg-[#252530] rounded-sm w-full" />
                    </td>
                  </tr>
                ))
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-8 text-center text-slate-400 text-xs">
                    No Te'shir / Injaz records match the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => {
                  const isFit = (row.medicalStatus || "").toUpperCase().includes("FIT");
                  const isPaid = row.injazPayment === "PAID";

                  return (
                    <tr key={row.applicantId} className="hover:bg-slate-50 dark:hover:bg-[#181822] transition-colors">
                      <td className="py-2.5 px-3 text-center font-mono font-semibold text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white uppercase whitespace-nowrap">
                        {row.fullName}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-700 dark:text-zinc-300">
                        {row.passportNumber}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 dark:text-zinc-300">
                        {row.contractDate || "—"}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-800 dark:text-zinc-200">
                        {row.duration ?? 0}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <Badge
                          className={
                            isFit
                              ? "bg-emerald-600 text-white font-bold text-[10px]"
                              : "bg-rose-600 text-white font-bold text-[10px]"
                          }
                        >
                          {isFit ? "FIT" : "UNFIT"}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-zinc-400">
                        {row.medicalDate || "—"}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-semibold text-xs">
                        <span className={row.medicalRemaining?.includes("-") ? "text-rose-600 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-400"}>
                          {row.medicalRemaining || "—"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <Badge
                          className={
                            isPaid
                              ? "bg-emerald-600 text-white font-semibold text-[10px]"
                              : "bg-amber-500 text-white font-semibold text-[10px]"
                          }
                        >
                          {row.injazPayment || "UNPAID"}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-zinc-400">
                        {row.appointmentDate || "—"}
                      </td>
                      <td className="py-2.5 px-3 uppercase text-slate-700 dark:text-zinc-300 truncate max-w-[150px]">
                        {row.contact || "—"}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 dark:text-zinc-400 truncate max-w-[140px]">
                        {row.remark || "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
