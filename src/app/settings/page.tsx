import { Settings, Save, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          System Settings
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure agency portal parameters, default notifications, and ERP integration.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card className="border-slate-200/80 bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-slate-900">
              Agency Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <Label htmlFor="agency_name">Agency Name</Label>
              <Input id="agency_name" defaultValue="Travel Agency International" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="country">Headquarters Country</Label>
              <Input id="country" defaultValue="Ethiopia" />
            </div>
            <Button size="sm" className="bg-emerald-900 hover:bg-emerald-950 text-white text-xs">
              <Save className="h-3.5 w-3.5 mr-1" /> Save Settings
            </Button>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-slate-900">
              Medical & Expiry Alert Thresholds
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <Label htmlFor="urgent_days">Urgent Alert Threshold (Days)</Label>
              <Input id="urgent_days" type="number" defaultValue={10} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="warning_days">Warning Alert Threshold (Days)</Label>
              <Input id="warning_days" type="number" defaultValue={30} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
