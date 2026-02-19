import { useContracts } from '@/hooks/useContracts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  TrendingUp,
  Upload,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Users,
  Download,
} from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { BILLING_PERIOD_LABELS } from '@/types/contracts';
import { getContractsDueThisMonth } from '@/lib/invoiceDateLogic';
import { exportAllContractsToExcel } from '@/lib/fullExcelExport';
import { useToast } from '@/hooks/use-toast';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const COLORS = ['hsl(217, 91%, 60%)', 'hsl(142, 76%, 42%)', 'hsl(38, 92%, 50%)', 'hsl(0, 62%, 50%)'];

export default function Dashboard() {
  const { contracts, stats: contractStats } = useContracts();
  const { toast } = useToast();

  const handleDownloadAll = () => {
    if (contracts.length === 0) {
      toast({
        title: 'No contracts',
        description: 'No contracts available to download.',
        variant: 'destructive',
      });
      return;
    }
    const { count } = exportAllContractsToExcel(contracts);
    toast({
      title: 'Download Complete',
      description: `Downloaded all ${count} contracts (sorted by joining date).`,
    });
  };

  // Prepare chart data
  const periodData = Object.entries(contractStats.byPeriod).map(([period, count]) => ({
    name: period,
    fullName: BILLING_PERIOD_LABELS[period as keyof typeof BILLING_PERIOD_LABELS],
    count,
  }));

  const statusData = [
    { name: 'Active', value: contractStats.byStatus?.active || 0, color: COLORS[1] },
    { name: 'Pending', value: contractStats.byStatus?.pending || 0, color: COLORS[2] },
    { name: 'Expired', value: contractStats.byStatus?.expired || 0, color: COLORS[3] },
    { name: 'Pulled Out', value: contractStats.byStatus?.pulled_out || 0, color: COLORS[0] },
  ].filter(d => d.value > 0);

  // Contracts due this month grouped by day
  const dueThisMonth = getContractsDueThisMonth(contracts);
  const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

  const recentContracts = contracts
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 10);

  // Get unique customers count
  const uniqueCustomers = new Set(contracts.map(c => c.customer)).size;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back! Here's your rental billing overview.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleDownloadAll}>
            <Download className="h-4 w-4 mr-2" />
            Download All
          </Button>
          <Button asChild variant="outline">
            <Link to="/import">
              <Upload className="h-4 w-4 mr-2" />
              Import Excel
            </Link>
          </Button>
          <Button asChild>
            <Link to="/contracts">
              <FileText className="h-4 w-4 mr-2" />
              View Contracts
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="glass-panel group hover:scale-[1.02] transition-all duration-300 hover:shadow-[0_0_20px_hsl(var(--primary)/0.2)] overflow-hidden relative animate-slide-up [animation-delay:100ms] opacity-0">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-primary/50" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Contracts
            </CardTitle>
            <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
              <FileText className="h-4 w-4 text-primary shadow-[0_0_10px_hsl(var(--primary)/0.5)]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold gradient-text">{contractStats.active}</div>
            <p className="text-xs text-muted-foreground">
              of {contractStats.total} total contracts
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card group hover:scale-[1.02] transition-all duration-300 hover:shadow-[0_0_20px_hsl(var(--success)/0.2)] overflow-hidden relative animate-slide-up [animation-delay:200ms] opacity-0">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-success to-success/50" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Customers
            </CardTitle>
            <div className="p-2 rounded-lg bg-success/10 group-hover:bg-success/20 transition-colors">
              <Users className="h-4 w-4 text-success shadow-[0_0_10px_hsl(var(--success)/0.5)]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold gradient-text">{uniqueCustomers}</div>
            <p className="text-xs text-muted-foreground">
              unique customers
            </p>
          </CardContent>
        </Card>

        <Card className="glass-panel group hover:scale-[1.02] transition-all duration-300 hover:shadow-[0_0_20px_hsl(var(--warning)/0.2)] overflow-hidden relative animate-slide-up [animation-delay:300ms] opacity-0">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-warning to-warning/50" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Due This Month
            </CardTitle>
            <div className="p-2 rounded-lg bg-warning/10 group-hover:bg-warning/20 transition-colors">
              <Calendar className="h-4 w-4 text-warning shadow-[0_0_10px_hsl(var(--warning)/0.5)]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold gradient-text">{dueThisMonth.all.length}</div>
            <p className="text-xs text-muted-foreground">
              invoices to generate
            </p>
          </CardContent>
        </Card>

        <Card className="glass-panel group hover:scale-[1.02] transition-all duration-300 hover:shadow-[0_0_20px_hsl(var(--destructive)/0.2)] overflow-hidden relative animate-slide-up [animation-delay:400ms] opacity-0">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-destructive to-destructive/50" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Suspended Contracts
            </CardTitle>
            <div className="p-2 rounded-lg bg-muted group-hover:bg-muted/80 transition-colors">
              <TrendingUp className="h-4 w-4 text-destructive shadow-[0_0_10px_hsl(var(--destructive)/0.5)]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold gradient-text">{contractStats.byStatus?.pulled_out || 0}</div>
            <p className="text-xs text-muted-foreground">
              terminated contracts
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Invoice Schedule for This Month */}
      <Card className="glass-panel overflow-hidden relative animate-slide-up [animation-delay:500ms] opacity-0">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-warning via-primary to-warning/50" />
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-warning/10">
              <AlertCircle className="h-5 w-5 text-warning" />
            </div>
            Invoice Schedule - {currentMonth}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-muted/30 text-center border border-border/30 hover:border-primary/30 transition-colors">
              <div className="text-3xl font-bold gradient-text">{dueThisMonth.day5.length}</div>
              <div className="text-sm font-medium mt-1">Generate on 5th</div>
              <div className="text-xs text-muted-foreground">contracts due</div>
            </div>
            <div className="p-4 rounded-xl bg-muted/30 text-center border border-border/30 hover:border-primary/30 transition-colors">
              <div className="text-3xl font-bold gradient-text">{dueThisMonth.day15.length}</div>
              <div className="text-sm font-medium mt-1">Generate on 15th</div>
              <div className="text-xs text-muted-foreground">contracts due</div>
            </div>
            <div className="p-4 rounded-xl bg-muted/30 text-center border border-border/30 hover:border-primary/30 transition-colors">
              <div className="text-3xl font-bold gradient-text">{dueThisMonth.day25.length}</div>
              <div className="text-sm font-medium mt-1">Generate on 25th</div>
              <div className="text-xs text-muted-foreground">contracts due</div>
            </div>
          </div>
          <div className="mt-4 flex justify-center">
            <Button asChild variant="outline" className="hover:bg-primary/10">
              <Link to="/contracts?tab=monthly">
                View Due Contracts
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Contracts by Billing Period */}
        <Card className="glass-panel animate-slide-up [animation-delay:600ms] opacity-0">
          <CardHeader>
            <CardTitle className="text-lg">Contracts by Billing Period</CardTitle>
          </CardHeader>
          <CardContent>
            {periodData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={periodData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" className="text-xs fill-muted-foreground" />
                  <YAxis className="text-xs fill-muted-foreground" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    labelFormatter={(value) => periodData.find(d => d.name === value)?.fullName || value}
                  />
                  <Bar dataKey="count" fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No contracts yet</p>
                  <Button asChild variant="link" className="mt-2">
                    <Link to="/import">Import your Excel data</Link>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contract Status Distribution */}
        <Card className="glass-panel animate-slide-up [animation-delay:700ms] opacity-0">
          <CardHeader>
            <CardTitle className="text-lg">Contract Status</CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={200}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {statusData.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm">{item.name}: {item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No contracts yet</p>
                  <Button asChild variant="link" className="mt-2">
                    <Link to="/contracts">Add your first contract</Link>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="glass-panel animate-slide-up [animation-delay:800ms] opacity-0">
        <CardHeader>
          <CardTitle className="text-lg">Recent Updates</CardTitle>
        </CardHeader>
        <CardContent>
          {recentContracts.length > 0 ? (
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {recentContracts.map((contract) => (
                <div
                  key={contract.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${contract.status === 'active' ? 'bg-success/10' : 'bg-muted'
                      }`}>
                      {contract.status === 'active' ? (
                        <CheckCircle2 className="h-4 w-4 text-success" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{contract.customer}</p>
                      <p className="text-sm text-muted-foreground">
                        {contract.contractNumber} • {contract.machineSite}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={contract.status === 'active' ? 'default' : 'secondary'}>
                      {contract.billingPeriod}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(contract.updatedAt), 'dd/MM/yyyy')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No contracts yet. Import your Excel file to get started!</p>
              <Button asChild variant="outline" className="mt-4">
                <Link to="/import">
                  <Upload className="h-4 w-4 mr-2" />
                  Import Excel
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div >
  );
}
