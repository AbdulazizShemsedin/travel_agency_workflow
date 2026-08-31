"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Plane,
  Ticket,
  CheckCircle2,
  Clock,
  Download,
  Search,
  RefreshCw,
  Layers,
  HeartPulse,
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

export function DepartureReportView() {
  const [ticketFilter, setTicketFilter] = React.useState<string>("All");
  const [corridorFilter, setCorridorFilter] = React.useState<string>("All");
  const [searchQuery, setSearchQuery] = React.useState<string>("");

  const {
    data: departureData = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["departure_report_data", corridorFilter],
    queryFn: () => fetchOperationalWorkspaceData("departure", corridorFilter),
    staleTime: 10000,
  });

  // Calculate KPIs
  const totalCandidates = departureData.length;
  const bookedTickets = departureData.filter((r) => r.ticketStatus === "Booked" || (r.ticketNumber && r.ticketNumber !== "—")).length;
  const pendingTickets = departureData.filter((r) => !r.ticketStatus || r.ticketStatus === "Pending").length;
  const departedCandidates = departureData.filter((r) => r.departure?.status === "Departed").length;
  const med2Passed = departureData.filter((r) => r.departure?.medical_2_result === "Pass").length;

  const ticketPieData = [
    { name: "Booked", value: bookedTickets, color: "#059669" },
    { name: "Pending Booking", value: pendingTickets, color: "#d97706" },
  ].filter((d) => d.value > 0);

  // Duration metrics
  const durationUnder30 = departureData.filter((r) => (r.duration || 0) <= 30).length;
  const duration30to60 = departureData.filter((r) => (r.duration || 0) > 30 && (r.duration || 0) <= 60).length;
  const duration60to90 = departureData.filter((r) => (r.duration || 0) > 60 && (r.duration || 0) <= 90).length;
  const durationOver90 = departureData.filter((r) => (r.duration || 0) > 90).length;

  const durationData = [
    { name: "< 30 Days", count: durationUnder30, fill: "#10b981" },
    { name: "30-60 Days", count: duration30to60, fill: "#3b82f6" },
    { name: "60-90 Days", count: duration60to90, fill: "#f59e0b" },
    { name: "> 90 Days", count: durationOver90, fill: "#ef4444" },
  ];

  // Filtered dataset
  const filteredRows = React.useMemo(() => {
    return departureData.filter((row) => {
      const isBooked = row.ticketStatus === "Booked" || (row.ticketNumber && row.ticketNumber !== "—");
      const matchesTicket =
        ticketFilter === "All" ||
        (ticketFilter === "Booked" && isBooked) ||
        (ticketFilter === "Pending" && !isBooked);

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        row.fullName.toLowerCase().includes(q) ||
        row.passportNumber.toLowerCase().includes(q) ||
        (row.sponsorName && row.sponsorName.toLowerCase().includes(q)) ||
        (row.company && row.company.toLowerCase().includes(q));

      return matchesTicket && matchesSearch;
    });
  }, [departureData, ticketFilter, searchQuery]);

  // CSV Export
  const handleExportCSV = () => {
    if (filteredRows.length === 0) return;
    const headers = [
      "NO",
      "LABOR ID",
      "NAME",
      "PASSPORT",
      "CONTRACT",
      "DURATION",
      "VISA #",
      "SPONSOR NAME",
      "SPONSOR ID",
      "TELEPHONE",
      "COMPANY",
      "LMIS STATUS",
      "EMBASSY STATUS",
      "TICKET",
      "HOUSE / REMARK",
    ];

    const rows = filteredRows.map((row, idx) => [
      idx + 1,
      `"${row.laborId || ""}"`,
      `"${row.fullName.replace(/"/g, '""')}"`,
      `"${row.passportNumber}"`,
      `"${row.contractDate || ""}"`,
      row.duration ?? 0,
      `"${row.visaNumber || ""}"`,
      `"${(row.sponsorName || "").replace(/"/g, '""')}"`,
      `"${(row.sponsorId || "").replace(/"/g, '""')}"`,
      `"${row.telephone || ""}"`,
      `"${(row.company || "").replace(/"/g, '""')}"`,
      `"${row.lmisStatus || "Pending"}"`,
      `"${row.embassyStatus || "Pending"}"`,
      `"${row.ticketNumber && row.ticketNumber !== "—" ? row.ticketNumber : row.ticketStatus || "Pending"}"`,
      `"${(row.jobApplied || row.remark || "Housemaid").replace(/"/g, '""')}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ticket_departure_report_${new Date().toISOString().split("T")[0]}.csv`);
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
              <Plane className="h-4 w-4" />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Flight Ticketing & Departure Operations Report
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            Airline e-ticket booking metrics, Bole airport flight schedules, and pre-departure medical fitness verification.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Corridor selector */}
          <div className="flex items-center rounded-lg border border-slate-200 dark:border-[#2c2c36] bg-white dark:bg-[#1a1a20] p-0.5">
            {["All", "Saudi Arabia", "Kuwait"].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCorridorFilter(c)}
                className={cn(
                  "px-2.5 py-1 text-xs font-semibold rounded-md transition-all",
                  corridorFilter === c
                    ? "bg-emerald-900 text-white dark:bg-emerald-600 shadow-xs"
                    : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                {c}
              </button>
            ))}
          </div>

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
                Ticketing Queue
              </span>
              <span className="p-1.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-zinc-300">
                <Layers className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900 dark:text-white">
                {totalCandidates}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-zinc-400">candidates</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121216]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                Tickets Booked
              </span>
              <span className="p-1.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                <Ticket className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-emerald-800 dark:text-emerald-400">
                {bookedTickets}
              </span>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-500">
                {totalCandidates > 0 ? `${Math.round((bookedTickets / totalCandidates) * 100)}% confirmed` : "0%"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121216]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-blue-700 dark:text-blue-400">
                Pre-Departure Medical 2
              </span>
              <span className="p-1.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400">
                <HeartPulse className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-blue-800 dark:text-blue-400">
                {med2Passed}
              </span>
              <span className="text-[11px] text-blue-600 dark:text-blue-500">fit to fly</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121216]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                Flown / Departed
              </span>
              <span className="p-1.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                <Plane className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-emerald-800 dark:text-emerald-400">
                {departedCandidates}
              </span>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-500">dispatched</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Visual Analytics Charts                                       */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Ticket Booking Share */}
        <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121216]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between">
              <span>Flight Booking Status Distribution</span>
              <Badge variant="outline" className="text-[10px] font-medium">Airline PNR</Badge>
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-zinc-400">
              Ratio of Booked tickets vs Pending flight reservations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-56 w-full flex items-center justify-center">
              {ticketPieData.length === 0 ? (
                <div className="text-xs text-slate-400">No ticketing data available</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={ticketPieData}
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
                      {ticketPieData.map((entry, index) => (
                        <Cell key={`tkt-${index}`} fill={entry.color} />
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
              <span>Duration Aging to Flight Dispatch</span>
              <Badge variant="outline" className="text-[10px] font-medium">Elapsed Days</Badge>
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-zinc-400">
              Total days elapsed from initial registration to flight dispatch.
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
                Ticketing & Departure Pipeline Ledger
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-zinc-400">
                Detailed candidate rows matching the exact TICKET sheet specifications.
              </CardDescription>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[200px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search candidate, sponsor, company..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 pl-8 text-xs bg-white dark:bg-[#1a1a20] border-slate-200 dark:border-[#2c2c36]"
                />
              </div>

              <div className="w-44">
                <SimpleSelect
                  value={ticketFilter}
                  onValueChange={setTicketFilter}
                  options={[
                    { value: "All", label: "All Ticket Statuses" },
                    { value: "Booked", label: "Booked" },
                    { value: "Pending", label: "Pending Booking" },
                  ]}
                  triggerClassName="h-8 text-xs bg-white dark:bg-[#1a1a20] border-slate-200 dark:border-[#2c2c36]"
                  aria-label="Filter by Ticket Status"
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
                <th className="py-2.5 px-3">LABOR ID</th>
                <th className="py-2.5 px-3">NAME</th>
                <th className="py-2.5 px-3">PASSPORT</th>
                <th className="py-2.5 px-3">CONTRACT</th>
                <th className="py-2.5 px-3 text-center">DURATION</th>
                <th className="py-2.5 px-3">VISA #</th>
                <th className="py-2.5 px-3">SPONSOR NAME</th>
                <th className="py-2.5 px-3">SPONSOR ID</th>
                <th className="py-2.5 px-3">TELEPHONE</th>
                <th className="py-2.5 px-3">COMPANY</th>
                <th className="py-2.5 px-3 text-center">LMIS STATUS</th>
                <th className="py-2.5 px-3 text-center">EMBASSY STATUS</th>
                <th className="py-2.5 px-3 text-center">TICKET</th>
                <th className="py-2.5 px-3">HOUSE / REMARK</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#1f1f26]">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={15} className="py-3 px-3">
                      <div className="h-4 bg-slate-200 dark:bg-[#252530] rounded-sm w-full" />
                    </td>
                  </tr>
                ))
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={15} className="py-8 text-center text-slate-400 text-xs">
                    No Ticketing / Departure records match the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => {
                  const isApproved = row.embassyStatus === "Approved" || row.stamp?.status === "Completed";
                  const isBooked = row.ticketStatus === "Booked" || (row.ticketNumber && row.ticketNumber !== "—");

                  return (
                    <tr key={row.applicantId} className="hover:bg-slate-50 dark:hover:bg-[#181822] transition-colors">
                      <td className="py-2.5 px-3 text-center font-mono font-semibold text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-zinc-400">
                        {row.laborId || "—"}
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
                      <td className="py-2.5 px-3 font-mono text-slate-800 dark:text-zinc-200 font-medium">
                        {row.visaNumber || "—"}
                      </td>
                      <td className="py-2.5 px-3 uppercase font-medium text-slate-900 dark:text-white truncate max-w-[150px]">
                        {row.sponsorName || "—"}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-700 dark:text-zinc-300 text-xs truncate max-w-[150px]">
                        {row.sponsorId || "—"}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-700 dark:text-zinc-300">
                        {row.telephone || "—"}
                      </td>
                      <td className="py-2.5 px-3 uppercase text-slate-800 dark:text-zinc-200 truncate max-w-[140px]">
                        {row.company || "—"}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <Badge
                          className={
                            row.lmisStatus === "Issued" || row.lmisStatus === "Approved"
                              ? "bg-emerald-600 text-white font-semibold text-[10px]"
                              : row.lmisStatus === "Rejected"
                              ? "bg-rose-600 text-white font-semibold text-[10px]"
                              : "bg-amber-500 text-white font-semibold text-[10px]"
                          }
                        >
                          {row.lmisStatus || "Pending"}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <Badge
                          className={
                            isApproved
                              ? "bg-emerald-600 text-white font-semibold text-[10px]"
                              : "bg-amber-500 text-white font-semibold text-[10px]"
                          }
                        >
                          {isApproved ? "Approved" : row.embassyStatus || "Pending"}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <Badge
                          className={
                            isBooked
                              ? "bg-emerald-600 text-white font-semibold text-[10px]"
                              : "bg-amber-500 text-white font-semibold text-[10px]"
                          }
                        >
                          {isBooked ? (row.ticketNumber && row.ticketNumber !== "—" ? row.ticketNumber : "Booked") : "Pending"}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-zinc-400 truncate max-w-[130px]">
                        {row.jobApplied || row.remark || "Housemaid"}
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
