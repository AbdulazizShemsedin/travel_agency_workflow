"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plane,
  Ticket,
  HeartPulse,
  Calendar,
  Clock,
  User,
  ShieldCheck,
} from "lucide-react";
import { OperationalColumn, WorkspaceApplicantRow } from "@/types/workspace";
import { OperationalTable } from "../OperationalTable";
import {
  OperationalDrawer,
  DrawerField,
  DrawerSection,
} from "../OperationalDrawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  recordTicketDetailsV2,
  recordRescheduleV2,
  advancePlacementV2,
} from "@/lib/api/v2/placements";
import { useAuth } from "@/components/providers/AuthProvider";

interface DepartureWorkspaceProps {
  data: WorkspaceApplicantRow[];
  isLoading: boolean;
  onRefresh: () => void;
  employees: { name: string; full_name?: string; email?: string }[];
  corridorFilter: string;
  onCorridorChange: (corridor: string) => void;
}

export function DepartureWorkspace({
  data,
  isLoading,
  onRefresh,
  employees,
  corridorFilter,
  onCorridorChange,
}: DepartureWorkspaceProps) {
  const queryClient = useQueryClient();
  const { authUser, roles } = useAuth();

  const isAdmin = React.useMemo<boolean>(() => {
    const emailOrName = (authUser?.email || authUser?.full_name || "").toLowerCase().trim();
    if (emailOrName === "administrator" || emailOrName.startsWith("admin")) return true;
    if (!Array.isArray(roles)) return false;
    return roles.some((r) => {
      const norm = String(r).trim().toLowerCase();
      return norm === "system manager" || norm === "administrator" || norm === "manager" || norm === "agency admin";
    });
  }, [authUser, roles]);

  const canEdit = React.useMemo<boolean>(() => {
    if (isAdmin) return true;
    if (!Array.isArray(roles)) return false;
    return roles.some((r) => {
      const norm = String(r).trim().toLowerCase();
      return norm === "ticketing officer" || norm === "departure officer" || norm === "logistics officer";
    });
  }, [isAdmin, roles]);

  const [selectedRow, setSelectedRow] = React.useState<WorkspaceApplicantRow | null>(null);

  // Form State for Drawer
  // Ticket fields
  const [ticketStatus, setTicketStatus] = React.useState<"Pending" | "Booked" | "Cancelled">("Pending");
  const [ticketNumber, setTicketNumber] = React.useState("");
  const [airline, setAirline] = React.useState("Ethiopian Airlines");
  const [flightDate, setFlightDate] = React.useState("");
  const [ticketCost, setTicketCost] = React.useState<number | "">("");
  const [ticketCurrency, setTicketCurrency] = React.useState("USD");
  const [ticketDetails, setTicketDetails] = React.useState("");
  const [employee, setEmployee] = React.useState("");

  // Medical 2 fields
  const [medical2Result, setMedical2Result] = React.useState<"Pass" | "Fail" | "">("");
  const [medical2Date, setMedical2Date] = React.useState("");
  const [medical2Remark, setMedical2Remark] = React.useState("");

  // Departure fields
  const [departureStatus, setDepartureStatus] = React.useState<"Pending" | "Departed" | "Rescheduled" | "Cancelled">("Pending");
  const [departureTime, setDepartureTime] = React.useState("");
  const [rescheduleDate, setRescheduleDate] = React.useState("");
  const [rescheduleCause, setRescheduleCause] = React.useState<"Internal" | "Airport">("Airport");
  const [rescheduleCost, setRescheduleCost] = React.useState<number | "">("");

  // Sync drawer form state when row changes
  React.useEffect(() => {
    if (selectedRow) {
      const tkt = selectedRow.ticket;
      const dep = selectedRow.departure;

      setTicketStatus(selectedRow.ticketStatus === "Booked" ? "Booked" : "Pending");
      setTicketNumber(selectedRow.ticketNumber && selectedRow.ticketNumber !== "—" ? selectedRow.ticketNumber : tkt?.ticket_number || "");
      setAirline((tkt as any)?.airline || "Ethiopian Airlines");
      setFlightDate(tkt?.flight_date || "");
      setTicketCost((tkt as any)?.ticket_cost || "");
      setTicketCurrency((tkt as any)?.currency || "USD");
      setTicketDetails((tkt as any)?.ticket_details || "");
      setEmployee((tkt as any)?.employee || (dep as any)?.employee || "");

      setMedical2Result((dep as any)?.medical_2_result || "");
      setMedical2Date((dep as any)?.medical_2_date || "");
      setMedical2Remark((dep as any)?.medical_2_remark || "");

      const isDep = Boolean(dep?.departed_on);
      setDepartureStatus(isDep ? "Departed" : "Pending");
      setDepartureTime(dep?.departed_on || "");
      setRescheduleDate((dep as any)?.reschedule_date || "");
      setRescheduleCause((dep as any)?.reschedule_cause || "Airport");
      setRescheduleCost((dep as any)?.reschedule_cost || "");
    }
  }, [selectedRow]);

  // Mutation to persist Ticket & Departure via V2
  const mutation = useMutation({
    mutationFn: async () => {
      if (!selectedRow) return;
      const placementName = selectedRow.placementId || selectedRow.dsrName;

      if (!placementName) {
        throw new Error("No linked active placement found for this candidate.");
      }

      // 1. Record Ticket Details
      if (ticketNumber.trim()) {
        await recordTicketDetailsV2(
          placementName,
          ticketNumber.trim(),
          flightDate || new Date().toISOString().split("T")[0],
          typeof ticketCost === "number" ? ticketCost : undefined,
          ticketCurrency
        );

        if (ticketStatus === "Booked") {
          try {
            await advancePlacementV2(placementName, "Ticketed");
          } catch (err: any) {
            console.warn("advancePlacementV2 (Ticketed) warning:", err);
          }
        }
      }

      // 2. Record Reschedule if applicable
      if (departureStatus === "Rescheduled" && rescheduleDate) {
        await recordRescheduleV2(
          placementName,
          rescheduleDate,
          rescheduleCause,
          typeof rescheduleCost === "number" ? rescheduleCost : undefined,
          ticketCurrency
        );
      }

      // 3. Record Departure
      if (departureStatus === "Departed") {
        try {
          await advancePlacementV2(placementName, "Departed");
        } catch (err: any) {
          console.warn("advancePlacementV2 (Departed) warning:", err);
        }
      }
    },
    onSuccess: () => {
      toast.success(`Flight & Departure details for ${selectedRow?.fullName} updated successfully!`);
      queryClient.invalidateQueries({ queryKey: ["operational_workspace"] });
      queryClient.invalidateQueries({ queryKey: ["placements"] });
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      onRefresh();
      setSelectedRow(null);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update Ticket / Departure record.");
    },
  });

  // Columns definition matching TICKET / DEPARTURE Sheet specifications (Exact 16 Columns)
  const columns: OperationalColumn<WorkspaceApplicantRow>[] = [
    {
      id: "no",
      header: "NO",
      width: "50px",
      align: "center",
      sortable: false,
      cell: (_row, index) => (
        <span className="font-semibold text-slate-500 dark:text-zinc-400 font-mono text-xs">
          {index ?? 1}
        </span>
      ),
    },
    {
      id: "laborId",
      header: "LABOR ID",
      accessorKey: "laborId",
      width: "120px",
      cell: (row) => (
        <span className="font-mono text-slate-600 dark:text-zinc-400 font-medium">
          {row.laborId || "—"}
        </span>
      ),
    },
    {
      id: "name",
      header: "NAME",
      accessorKey: "fullName",
      width: "200px",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold text-[10px] border border-emerald-300/40 uppercase">
            {row.fullName.substring(0, 2)}
          </div>
          <span className="font-semibold text-slate-900 dark:text-white uppercase truncate block max-w-[180px]">
            {row.fullName}
          </span>
        </div>
      ),
    },
    {
      id: "passport",
      header: "PASSPORT",
      accessorKey: "passportNumber",
      width: "120px",
      cell: (row) => (
        <span className="font-mono font-medium text-slate-700 dark:text-zinc-300">
          {row.passportNumber}
        </span>
      ),
    },
    {
      id: "contract",
      header: "CONTRACT",
      accessorKey: "contractDate",
      width: "110px",
      cell: (row) => (
        <span className="text-slate-700 dark:text-zinc-300 font-medium">
          {row.contractDate || "—"}
        </span>
      ),
    },
    {
      id: "duration",
      header: "DURATION",
      accessorKey: "duration",
      width: "90px",
      align: "center",
      cell: (row) => (
        <span className="font-mono font-bold text-slate-800 dark:text-zinc-200">
          {row.duration ?? 0}
        </span>
      ),
    },
    {
      id: "visaNumber",
      header: "VISA #",
      accessorKey: "visaNumber",
      width: "130px",
      cell: (row) => (
        <span className="font-mono text-slate-800 dark:text-zinc-200 font-medium">
          {row.visaNumber || "—"}
        </span>
      ),
    },
    {
      id: "sponsorName",
      header: "SPONSOR NAME",
      accessorKey: "sponsorName",
      width: "160px",
      cell: (row) => (
        <span className="text-slate-900 dark:text-white uppercase font-semibold truncate block max-w-[150px]">
          {row.sponsorName || "—"}
        </span>
      ),
    },
    {
      id: "sponsorId",
      header: "SPONSOR ID",
      accessorKey: "sponsorId",
      width: "160px",
      cell: (row) => (
        <span className="font-mono text-slate-700 dark:text-zinc-300 text-xs truncate block max-w-[150px]">
          {row.sponsorId || "—"}
        </span>
      ),
    },
    {
      id: "telephone",
      header: "TELEPHONE",
      accessorKey: "telephone",
      width: "130px",
      cell: (row) => (
        <span className="font-mono text-slate-700 dark:text-zinc-300">
          {row.telephone || "—"}
        </span>
      ),
    },
    {
      id: "company",
      header: "COMPANY",
      accessorKey: "company",
      width: "150px",
      cell: (row) => (
        <span className="text-slate-800 dark:text-zinc-200 uppercase truncate block max-w-[140px]">
          {row.company || "—"}
        </span>
      ),
    },
    {
      id: "lmisStatus",
      header: "LMIS STATUS",
      accessorKey: "lmisStatus",
      width: "110px",
      align: "center",
      cell: (row) => {
        const st = row.lmisStatus || "Pending";
        return (
          <Badge
            className={
              st === "Issued" || st === "Approved" || st === "Completed"
                ? "bg-emerald-600 text-white font-semibold text-[10px]"
                : st === "Rejected"
                ? "bg-rose-600 text-white font-semibold text-[10px]"
                : "bg-amber-500 text-white font-semibold text-[10px]"
            }
          >
            {st}
          </Badge>
        );
      },
    },
    {
      id: "embassyStatus",
      header: "EMBASSY STATUS",
      accessorKey: "embassyStatus",
      width: "130px",
      align: "center",
      cell: (row) => {
        const isApproved =
          row.embassyStatus === "Approved" ||
          row.embassyStatus === "Stamped" ||
          row.stamp?.status === "Completed";
        return (
          <Badge
            className={
              isApproved
                ? "bg-emerald-600 text-white font-semibold text-[10px]"
                : "bg-amber-500 text-white font-semibold text-[10px]"
            }
          >
            {isApproved ? "Approved" : row.embassyStatus || "Pending"}
          </Badge>
        );
      },
    },
    {
      id: "ticket",
      header: "TICKET",
      width: "130px",
      align: "center",
      cell: (row) => {
        const isBooked =
          row.ticketStatus === "Booked" ||
          (row.ticketNumber && row.ticketNumber !== "—");
        return (
          <Badge
            className={
              isBooked
                ? "bg-emerald-600 text-white font-semibold text-[10px]"
                : "bg-amber-500 text-white font-semibold text-[10px]"
            }
          >
            {isBooked
              ? row.ticketNumber && row.ticketNumber !== "—"
                ? row.ticketNumber
                : "Booked"
              : "Pending"}
          </Badge>
        );
      },
    },
    {
      id: "jobRemark",
      header: "HOUSE / REMARK",
      width: "140px",
      cell: (row) => (
        <span className="text-slate-600 dark:text-zinc-400 truncate block max-w-[130px]">
          {row.jobApplied || row.remark || "Housemaid"}
        </span>
      ),
    },
    {
      id: "action",
      header: "ACTION",
      width: "80px",
      align: "center",
      sortable: false,
      cell: (row) => (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedRow(row);
          }}
          className="h-6 px-2 text-[11px] font-semibold border-emerald-600/30 text-emerald-800 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
        >
          Edit
        </Button>
      ),
    },
  ];

  return (
    <>
      <OperationalTable
        title="Flight Ticketing & Airport Departure"
        subtitle="Airline booking, PNR registration, pre-departure medical fitness, and Bole Airport dispatch."
        columns={columns}
        data={data}
        isLoading={isLoading}
        selectedRowId={selectedRow?.applicantId}
        onRowClick={(row) => setSelectedRow(row)}
        onRefresh={onRefresh}
        corridorFilter={corridorFilter}
        onCorridorChange={onCorridorChange}
      />

      {/* ------------------------------------------------------------- */}
      {/* Right-Side Operational Drawer                                 */}
      {/* ------------------------------------------------------------- */}
      <OperationalDrawer
        isOpen={!!selectedRow}
        onClose={() => setSelectedRow(null)}
        title="Ticketing & Departure Dispatch Details"
        applicantName={selectedRow?.fullName || ""}
        applicantId={selectedRow?.applicantId || ""}
        passportNumber={selectedRow?.passportNumber}
        statusBadge={
          <Badge
            className={
              departureStatus === "Departed"
                ? "bg-emerald-600 text-white font-bold text-[10px]"
                : ticketStatus === "Booked"
                ? "bg-blue-600 text-white font-bold text-[10px]"
                : "bg-amber-500 text-white font-bold text-[10px]"
            }
          >
            {departureStatus === "Departed"
              ? "Departed"
              : ticketStatus === "Booked"
              ? "Ticket Booked"
              : "Pending"}
          </Badge>
        }
        canEdit={canEdit}
        isSaving={mutation.isPending}
        onSave={() => mutation.mutate()}
      >
        {/* Section 1: Read-Only Travel Context */}
        <DrawerSection title="Candidate & Stamped Visa Context" icon={User}>
          <DrawerField label="Full Name" value={selectedRow?.fullName} isReadOnly />
          <DrawerField label="Passport Number" value={selectedRow?.passportNumber} isReadOnly />
          <DrawerField label="Destination" value={selectedRow?.destinationCountry} isReadOnly />
          <DrawerField label="Sponsor Name" value={selectedRow?.sponsorName || "—"} isReadOnly />
          <DrawerField label="Visa Stamp Number" value={selectedRow?.stamp?.stamp_number || selectedRow?.visaNumber || "—"} isReadOnly />
          <DrawerField label="Partner Agency" value={selectedRow?.lockedContractor || "—"} isReadOnly />
        </DrawerSection>

        {/* Section 2: Airline Ticket Registration (DSR Ticket) */}
        <DrawerSection title="Airline Ticket Registration (DSR Ticket)" icon={Ticket}>
          <DrawerField label="Ticket Status" isReadOnly={false}>
            <select
              value={ticketStatus}
              disabled={!canEdit || mutation.isPending}
              onChange={(e) => setTicketStatus(e.target.value as any)}
              className="h-9 w-full px-3 text-xs bg-white dark:bg-[#1a1a20] border border-slate-200 dark:border-[#2c2c36] rounded-md font-semibold text-slate-900 dark:text-white"
            >
              <option value="Pending">Pending (Awaiting Booking)</option>
              <option value="Booked">Booked (E-Ticket Issued)</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </DrawerField>

          <DrawerField label="Ticket Number / PNR" isReadOnly={false}>
            <Input
              type="text"
              placeholder="e.g. ET-9923847"
              value={ticketNumber}
              disabled={!canEdit || mutation.isPending}
              onChange={(e) => setTicketNumber(e.target.value)}
              className="h-9 text-xs font-mono font-semibold bg-white dark:bg-[#1a1a20] border-slate-200 dark:border-[#2c2c36]"
            />
          </DrawerField>

          <DrawerField label="Airline Carrier" isReadOnly={false}>
            <select
              value={airline}
              disabled={!canEdit || mutation.isPending}
              onChange={(e) => setAirline(e.target.value)}
              className="h-9 w-full px-3 text-xs bg-white dark:bg-[#1a1a20] border border-slate-200 dark:border-[#2c2c36] rounded-md text-slate-900 dark:text-white"
            >
              <option value="Ethiopian Airlines">Ethiopian Airlines (ET)</option>
              <option value="Saudia">Saudia (SV)</option>
              <option value="FlyDubai">FlyDubai (FZ)</option>
              <option value="Qatar Airways">Qatar Airways (QR)</option>
              <option value="Emirates">Emirates (EK)</option>
              <option value="Other">Other Airline</option>
            </select>
          </DrawerField>

          <DrawerField label="Flight Date" isReadOnly={false}>
            <Input
              type="date"
              value={flightDate}
              disabled={!canEdit || mutation.isPending}
              onChange={(e) => setFlightDate(e.target.value)}
              className="h-9 text-xs bg-white dark:bg-[#1a1a20] border-slate-200 dark:border-[#2c2c36]"
            />
          </DrawerField>

          <DrawerField label="Ticket Cost" isReadOnly={false}>
            <div className="flex gap-1.5">
              <Input
                type="number"
                placeholder="450"
                value={ticketCost}
                disabled={!canEdit || mutation.isPending}
                onChange={(e) => setTicketCost(e.target.value ? Number(e.target.value) : "")}
                className="h-9 text-xs bg-white dark:bg-[#1a1a20] border-slate-200 dark:border-[#2c2c36]"
              />
              <select
                value={ticketCurrency}
                disabled={!canEdit || mutation.isPending}
                onChange={(e) => setTicketCurrency(e.target.value)}
                className="h-9 w-20 px-2 text-xs bg-white dark:bg-[#1a1a20] border border-slate-200 dark:border-[#2c2c36] rounded-md font-semibold"
              >
                <option value="USD">USD</option>
                <option value="SAR">SAR</option>
                <option value="ETB">ETB</option>
              </select>
            </div>
          </DrawerField>

          <div className="sm:col-span-2">
            <DrawerField label="Flight Details / Route Itinerary" isReadOnly={false}>
              <Textarea
                placeholder="e.g. Flight ET 402 ADD -> JED Departure: 07:15, Arrival: 10:45"
                value={ticketDetails}
                disabled={!canEdit || mutation.isPending}
                onChange={(e) => setTicketDetails(e.target.value)}
                className="min-h-[60px] text-xs bg-white dark:bg-[#1a1a20] border-slate-200 dark:border-[#2c2c36]"
              />
            </DrawerField>
          </div>
        </DrawerSection>

        {/* Section 3: Pre-Departure Medical Check 2 */}
        <DrawerSection title="Pre-Departure Medical 2" icon={HeartPulse}>
          <DrawerField label="Medical 2 Result" isReadOnly={false}>
            <select
              value={medical2Result}
              disabled={!canEdit || mutation.isPending}
              onChange={(e) => setMedical2Result(e.target.value as any)}
              className="h-9 w-full px-3 text-xs bg-white dark:bg-[#1a1a20] border border-slate-200 dark:border-[#2c2c36] rounded-md font-semibold text-slate-900 dark:text-white"
            >
              <option value="">-- Select Result --</option>
              <option value="Pass">Pass (Fit for Travel)</option>
              <option value="Fail">Fail (Unfit)</option>
            </select>
          </DrawerField>

          <DrawerField label="Medical 2 Exam Date" isReadOnly={false}>
            <Input
              type="date"
              value={medical2Date}
              disabled={!canEdit || mutation.isPending}
              onChange={(e) => setMedical2Date(e.target.value)}
              className="h-9 text-xs bg-white dark:bg-[#1a1a20] border-slate-200 dark:border-[#2c2c36]"
            />
          </DrawerField>

          <div className="sm:col-span-2">
            <DrawerField label="Clinic Remarks" isReadOnly={false}>
              <Input
                type="text"
                placeholder="e.g. Cleared by Bole Clinic 24h prior to flight"
                value={medical2Remark}
                disabled={!canEdit || mutation.isPending}
                onChange={(e) => setMedical2Remark(e.target.value)}
                className="h-9 text-xs bg-white dark:bg-[#1a1a20] border-slate-200 dark:border-[#2c2c36]"
              />
            </DrawerField>
          </div>
        </DrawerSection>

        {/* Section 4: Airport Departure Operations (DSR Departure) */}
        <DrawerSection title="Bole Airport Dispatch (DSR Departure)" icon={Plane}>
          <DrawerField label="Departure Status" isReadOnly={false}>
            <select
              value={departureStatus}
              disabled={!canEdit || mutation.isPending}
              onChange={(e) => setDepartureStatus(e.target.value as any)}
              className="h-9 w-full px-3 text-xs bg-white dark:bg-[#1a1a20] border border-slate-200 dark:border-[#2c2c36] rounded-md font-semibold text-slate-900 dark:text-white"
            >
              <option value="Pending">Pending (Scheduled)</option>
              <option value="Departed">Departed (Flight Escorted & Flown)</option>
              <option value="Rescheduled">Rescheduled</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </DrawerField>

          <DrawerField label="Scheduled Departure Time" isReadOnly={false}>
            <Input
              type="text"
              placeholder="YYYY-MM-DD HH:MM:SS"
              value={departureTime}
              disabled={!canEdit || mutation.isPending}
              onChange={(e) => setDepartureTime(e.target.value)}
              className="h-9 text-xs bg-white dark:bg-[#1a1a20] border-slate-200 dark:border-[#2c2c36]"
            />
          </DrawerField>

          {departureStatus === "Rescheduled" && (
            <>
              <DrawerField label="Rescheduled Flight Date" isReadOnly={false}>
                <Input
                  type="date"
                  value={rescheduleDate}
                  disabled={!canEdit || mutation.isPending}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="h-9 text-xs bg-white dark:bg-[#1a1a20] border-slate-200 dark:border-[#2c2c36]"
                />
              </DrawerField>

              <DrawerField label="Reschedule Cause" isReadOnly={false}>
                <select
                  value={rescheduleCause}
                  disabled={!canEdit || mutation.isPending}
                  onChange={(e) => setRescheduleCause(e.target.value as any)}
                  className="h-9 w-full px-3 text-xs bg-white dark:bg-[#1a1a20] border border-slate-200 dark:border-[#2c2c36] rounded-md"
                >
                  <option value="Airport">Airport / Airline Delay</option>
                  <option value="Internal">Internal Agency Reschedule</option>
                </select>
              </DrawerField>
            </>
          )}

          {/* Assigned Officer Field: Visible ONLY to Admins/Managers */}
          {isAdmin && (
            <div className="sm:col-span-2">
              <DrawerField label="Assigned Ticketing Officer (Admin Only)" isReadOnly={false}>
                <select
                  value={employee}
                  disabled={!canEdit || mutation.isPending}
                  onChange={(e) => setEmployee(e.target.value)}
                  className="h-9 w-full px-3 text-xs bg-white dark:bg-[#1a1a20] border border-slate-200 dark:border-[#2c2c36] rounded-md text-slate-800 dark:text-zinc-200 font-medium"
                >
                  <option value="">-- Select Handler Employee --</option>
                  {employees.map((emp) => (
                    <option key={emp.name} value={emp.name}>
                      {emp.full_name ? `${emp.full_name} (${emp.name})` : emp.name}
                    </option>
                  ))}
                </select>
              </DrawerField>
            </div>
          )}
        </DrawerSection>
      </OperationalDrawer>
    </>
  );
}
