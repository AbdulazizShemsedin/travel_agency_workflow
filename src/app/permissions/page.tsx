"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ShieldCheck,
  Search,
  RefreshCw,
  Loader2,
  Lock,
  Layers,
  Info,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/providers/AuthProvider";
import { getPermissionTableV2, V2PermissionTableRow } from "@/lib/api/v2/finance";
import { formatCleanErrorMessage } from "@/lib/utils/error-formatter";
import { LoadError } from "@/components/ui/LoadError";

export default function PermissionsPage() {
  const { authUser, roles } = useAuth();

  const userRoles = Array.isArray(roles) ? roles.map((r) => String(r)) : [];
  const isAuthorized = userRoles.some((r) =>
    ["Admin", "Administrator", "System Manager", "Manager"].includes(r)
  ) || (authUser?.email || "").toLowerCase() === "administrator";

  const [searchTerm, setSearchTerm] = React.useState("");

  const {
    data: permissions = [],
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery<V2PermissionTableRow[]>({
    queryKey: ["permission_table"],
    queryFn: () => getPermissionTableV2(),
    enabled: isAuthorized,
    staleTime: 10 * 60 * 1000,
  });

  // Group permissions by area
  const groupedPermissions = React.useMemo(() => {
    const map = new Map<string, V2PermissionTableRow[]>();
    const query = searchTerm.toLowerCase().trim();

    for (const item of permissions) {
      const area = item.area || "General";
      const action = item.action || "";
      const rolesArray = Array.isArray(item.roles)
        ? item.roles
        : typeof item.roles === "string"
        ? item.roles.split(",").map((r) => r.trim())
        : [];

      const matchesQuery =
        !query ||
        area.toLowerCase().includes(query) ||
        action.toLowerCase().includes(query) ||
        rolesArray.some((r) => r.toLowerCase().includes(query));

      if (matchesQuery) {
        if (!map.has(area)) {
          map.set(area, []);
        }
        map.get(area)!.push(item);
      }
    }

    return map;
  }, [permissions, searchTerm]);

  const areasList = React.useMemo(() => {
    return Array.from(groupedPermissions.keys());
  }, [groupedPermissions]);

  const [activeArea, setActiveArea] = React.useState<string>("All");

  React.useEffect(() => {
    if (activeArea !== "All" && !groupedPermissions.has(activeArea)) {
      setActiveArea("All");
    }
  }, [groupedPermissions, activeArea]);

  const displayedEntries = React.useMemo(() => {
    if (activeArea === "All") {
      return Array.from(groupedPermissions.entries());
    }
    const items = groupedPermissions.get(activeArea);
    return items ? [[activeArea, items] as [string, V2PermissionTableRow[]]] : [];
  }, [groupedPermissions, activeArea]);

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-slate-200 dark:border-[#222228] bg-white dark:bg-[#121217] space-y-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-[#1c1c22] text-slate-400">
          <Lock className="h-6 w-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          Access Restricted
        </h3>
        <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm">
          The permissions and role capabilities matrix is accessible exclusively to System Administrators and Managers.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-[#222227] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 items-center justify-center">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Role Permissions & Capabilities
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            Authoritative, read-only matrix of role permissions across operational areas (Admin and Manager view).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading || isRefetching}
            className="h-8 px-3 text-xs border-slate-200 dark:border-[#26262f] hover:bg-slate-100 dark:hover:bg-[#1a1a20]"
          >
            <RefreshCw
              className={`mr-1.5 h-3.5 w-3.5 ${
                isLoading || isRefetching ? "animate-spin" : ""
              }`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Info Notice */}
      <div className="flex items-start gap-2.5 p-3 rounded-xl border border-blue-200 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20 text-xs text-blue-900 dark:text-blue-300">
        <Info className="h-4 w-4 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
        <p className="text-[11px] leading-relaxed">
          This table reflects the backend RBAC access control configuration. Changes to role capabilities require deployment updates by system engineering.
        </p>
      </div>

      {/* Search Input */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Input
            type="text"
            placeholder="Search by action, role name, or operational area..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-9 text-xs pl-8 border-slate-200 dark:border-[#26262f] bg-white dark:bg-[#121216]"
          />
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
        </div>
        {permissions.length > 0 && (
          <Badge variant="outline" className="text-xs text-slate-600 dark:text-zinc-300">
            {permissions.length} actions listed
          </Badge>
        )}
      </div>

      {/* Area Filter Navigation Tabs */}
      {areasList.length > 1 && (
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-[#15151a] border border-slate-200/80 dark:border-[#222227] w-fit overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveArea("All")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeArea === "All"
                ? "bg-white dark:bg-[#1e1e24] text-slate-900 dark:text-white shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white"
            }`}
          >
            All Areas
          </button>
          {areasList.map((area) => (
            <button
              key={area}
              type="button"
              onClick={() => setActiveArea(area)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                activeArea === area
                  ? "bg-white dark:bg-[#1e1e24] text-slate-900 dark:text-white shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white"
              }`}
            >
              {area}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 className="h-7 w-7 animate-spin text-emerald-600 mb-3" />
          <p className="text-xs">Loading role permissions matrix...</p>
        </div>
      ) : isError ? (
        <LoadError
          resourceName="Permissions Table"
          error={error}
          onRetry={() => refetch()}
        />
      ) : displayedEntries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 dark:border-[#222227] p-12 text-center bg-white/50 dark:bg-[#121216]/50">
          <Layers className="h-8 w-8 text-slate-400 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            No matching permissions found
          </h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            Try adjusting your search query.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {displayedEntries.map(([area, items]) => (
            <Card
              key={area}
              className="border-slate-200/80 dark:border-[#222228] bg-white dark:bg-[#121217] shadow-xs overflow-hidden"
            >
              <CardHeader className="py-3 px-4 bg-slate-50/75 dark:bg-[#16161c] border-b border-slate-200/80 dark:border-[#222228]">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-wider">
                    <Layers className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    {area}
                  </CardTitle>
                  <Badge variant="neutral" className="text-[10px]">
                    {items.length} {items.length === 1 ? "action" : "actions"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto lg:overflow-hidden">
                  <table className="w-full text-left text-xs lg:table-fixed">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-[#1d1d24] text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                        <th className="px-4 py-2.5 w-1/2 whitespace-normal break-words leading-snug">Action / Capability</th>
                        <th className="px-4 py-2.5 w-1/2 whitespace-normal break-words leading-snug">Permitted Roles</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-[#1a1a22]">
                      {items.map((row, idx) => {
                        const rolesList: string[] = Array.isArray(row.roles)
                          ? row.roles
                          : typeof row.roles === "string"
                          ? row.roles.split(",").map((r) => r.trim())
                          : [];

                        return (
                          <tr
                            key={idx}
                            className="hover:bg-slate-50/50 dark:hover:bg-[#16161c]/50 transition-colors"
                          >
                            <td className="px-4 py-3 font-medium text-slate-800 dark:text-zinc-200">
                              {row.action}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-1.5">
                                {rolesList.map((r, roleIdx) => (
                                  <Badge
                                    key={roleIdx}
                                    variant="outline"
                                    className="text-[10px] font-normal border-slate-200 dark:border-[#282834] bg-slate-50 dark:bg-[#15151c] text-slate-700 dark:text-zinc-300"
                                  >
                                    {r}
                                  </Badge>
                                ))}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
