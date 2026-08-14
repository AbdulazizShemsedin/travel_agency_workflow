import Link from "next/link";
import {
  Users,
  Clock,
  CheckCircle2,
  Plane,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Operations Dashboard
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational alerts, task assignments, and pipeline overview.
          </p>
        </div>
        <Link href="/applicants/new">
          <Button className="bg-emerald-900 hover:bg-emerald-950 text-white font-medium text-xs">
            + Add Applicant
          </Button>
        </Link>
      </div>

      {/* Top Stat Cards matching Figma Page 3 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-slate-200/80 bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Applicants
            </CardDescription>
            <Users className="h-4 w-4 text-emerald-800" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">1,248</div>
            <p className="mt-1 flex items-center text-xs text-emerald-700">
              <TrendingUp className="mr-1 h-3.5 w-3.5" /> +97 this month
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              In Progress
            </CardDescription>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">842</div>
            <p className="mt-1 text-xs text-slate-500">Active pipelines</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Completed
            </CardDescription>
            <CheckCircle2 className="h-4 w-4 text-emerald-700" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">256</div>
            <p className="mt-1 text-xs text-slate-500">Ready & cleared</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Departed This Mo.
            </CardDescription>
            <Plane className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">34</div>
            <p className="mt-1 text-xs text-slate-500">Departed abroad</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Expiry Alerts & Pipeline Overview matching Figma Page 3 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Expiry Alerts & My Tasks */}
        <div className="space-y-6 lg:col-span-8">
          {/* Expiry Alerts Card */}
          <Card className="border-slate-200/80 bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-600" />
                <CardTitle className="text-base font-semibold text-slate-900">
                  Expiry Alerts
                </CardTitle>
              </div>
              <Button variant="ghost" size="sm" className="text-xs text-slate-600">
                View All
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/70 p-3 text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive" dotColor="bg-rose-600">
                      URGENT
                    </Badge>
                    <span className="font-semibold text-slate-900">
                      Passport expires in 2 days
                    </span>
                  </div>
                  <p className="text-slate-500">
                    Ahmed Muhammed • Applicant ID: APP-2024-1250
                  </p>
                </div>
                <Link href="/applicants/APP-2024-1250">
                  <Button variant="outline" size="sm" className="h-7 text-xs bg-white">
                    Resolve
                  </Button>
                </Link>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/70 p-3 text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive" dotColor="bg-rose-600">
                      URGENT
                    </Badge>
                    <span className="font-semibold text-slate-900">
                      Medical Results pending expiry
                    </span>
                  </div>
                  <p className="text-slate-500">
                    Ali Ahmed • Applicant ID: APP-2024-1249
                  </p>
                </div>
                <Link href="/applicants/APP-2024-1249">
                  <Button variant="outline" size="sm" className="h-7 text-xs bg-white">
                    Resolve
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Pipeline Overview */}
        <div className="space-y-6 lg:col-span-4">
          <Card className="border-slate-200/80 bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-slate-900">
                Pipeline Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">Data Input / Draft</span>
                <span className="font-semibold text-slate-900">210</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">CV Generated</span>
                <span className="font-semibold text-slate-900">145</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">Contract / Selected</span>
                <span className="font-semibold text-slate-900">312</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">Processing (LMS/Wakala)</span>
                <span className="font-semibold text-slate-900">430</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-600">Departed</span>
                <span className="font-semibold text-slate-900">34</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
