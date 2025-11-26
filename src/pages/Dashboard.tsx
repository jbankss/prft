import { Card } from '@/components/ui/card';
import { Building2, DollarSign, FileText, Users } from 'lucide-react';

const stats = [
  { label: 'Total Brands', value: '0', icon: Building2, color: 'text-blue-500' },
  { label: 'Active Accounts', value: '0', icon: Users, color: 'text-green-500' },
  { label: 'Pending Invoices', value: '0', icon: FileText, color: 'text-orange-500' },
  { label: 'Total Revenue', value: '$0', icon: DollarSign, color: 'text-purple-500' },
];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to your retail management system</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card
            key={stat.label}
            className="p-6 glass shadow-apple-md hover:shadow-apple-lg transition-all duration-200 hover:scale-[1.02]"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                <p className="text-2xl font-semibold">{stat.value}</p>
              </div>
              <stat.icon className={`h-8 w-8 ${stat.color}`} />
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-6 glass shadow-apple-md">
        <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
        <p className="text-muted-foreground">No recent activity</p>
      </Card>
    </div>
  );
}