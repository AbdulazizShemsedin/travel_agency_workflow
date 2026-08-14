import Link from "next/link";
import { Bell, AlertTriangle, FileText, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NotificationsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Notifications Center
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Review and manage operational alerts and updates.
          </p>
        </div>
        <Button variant="outline" size="sm" className="text-xs text-slate-700 bg-white">
          Mark All Read
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="border-l-4 border-l-amber-500 bg-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Badge variant="warning">Action Needed</Badge>
              <span className="text-[11px] text-slate-400">1h ago</span>
            </div>
            <CardTitle className="text-base font-semibold text-slate-900 mt-2">
              CV Generation for Registered Applicant
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-slate-600">
              Candidate profile is complete and passed all medical checks. Ready for standardized CV creation.
            </p>
            <Link href="/applicants">
              <Button size="sm" className="bg-emerald-900 hover:bg-emerald-950 text-white text-xs">
                View Details
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-rose-500 bg-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Badge variant="destructive">Urgent • Status Change</Badge>
              <span className="text-[11px] text-slate-400">10m ago</span>
            </div>
            <CardTitle className="text-base font-semibold text-slate-900 mt-2">
              Applicant Medical Result Required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-slate-600">
              Candidate medical results are pending expiration or re-test verification.
            </p>
            <Link href="/applicants">
              <Button size="sm" variant="outline" className="text-xs">
                See Detail
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
