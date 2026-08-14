import { Download, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const mockTransactions = [
  {
    date: "Oct 24, 2026",
    id: "TRX-8829",
    description: "Applicant Registration fee",
    amount: -45.0,
  },
  {
    date: "Oct 23, 2026",
    id: "TRX-8828",
    description: "CV selection request fee",
    amount: 1250.0,
  },
  {
    date: "Oct 22, 2026",
    id: "TRX-8827",
    description: "Applicant Registration fee",
    amount: -320.5,
  },
  {
    date: "Oct 20, 2026",
    id: "TRX-8826",
    description: "CV selection request fee",
    amount: 150.0,
  },
];

export default function ExpensesIncomePage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Financial Ledger
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational cashflow, registration deposits, and expense logs.
          </p>
        </div>
        <Button variant="outline" size="sm" className="text-xs text-slate-700 bg-white">
          <Download className="mr-1.5 h-3.5 w-3.5" /> Export CSV
        </Button>
      </div>

      {/* Top 3 Cards matching Figma Page 16 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-slate-200/80 bg-white">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Inflow (30d)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">$24,500</div>
            <p className="mt-1 flex items-center text-xs text-emerald-700">
              <TrendingUp className="mr-1 h-3.5 w-3.5" /> +12% vs last month
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Outflow (30d)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">$8,240</div>
            <p className="mt-1 flex items-center text-xs text-rose-700">
              <TrendingDown className="mr-1 h-3.5 w-3.5" /> -3% vs last month
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Net Balance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-900">$16,260</div>
            <p className="mt-1 text-xs text-slate-500">Operational Surplus</p>
          </CardContent>
        </Card>
      </div>

      {/* Table matching Figma Page 16 */}
      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-100 bg-slate-50/70 text-slate-500 uppercase tracking-wider font-semibold">
            <tr>
              <th className="px-4 py-3.5">Date</th>
              <th className="px-4 py-3.5">Transaction ID</th>
              <th className="px-4 py-3.5">Description</th>
              <th className="px-4 py-3.5 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {mockTransactions.map((tx) => (
              <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="px-4 py-3 text-slate-600">{tx.date}</td>
                <td className="px-4 py-3 font-mono font-semibold text-slate-800">
                  {tx.id}
                </td>
                <td className="px-4 py-3">{tx.description}</td>
                <td
                  className={`px-4 py-3 font-mono font-semibold text-right ${
                    tx.amount >= 0 ? "text-emerald-700" : "text-rose-700"
                  }`}
                >
                  {tx.amount >= 0 ? `+$${tx.amount.toFixed(2)}` : `-$${Math.abs(tx.amount).toFixed(2)}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
