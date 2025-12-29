import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Badge } from '@/components/ui/badge';
import { Info, Check, X, Clock, Eye } from 'lucide-react';

const permissions = [
  { name: 'Upload assets', creative: 'pending', senior: 'direct', director: 'direct' },
  { name: 'View approved assets', creative: 'yes', senior: 'yes', director: 'yes' },
  { name: 'View pending assets', creative: 'own', senior: 'yes', director: 'yes' },
  { name: 'Edit assets', creative: 'no', senior: 'yes', director: 'yes' },
  { name: 'Delete assets', creative: 'no', senior: 'yes', director: 'yes' },
  { name: 'Download assets', creative: 'yes', senior: 'yes', director: 'yes' },
  { name: 'See approval queue', creative: 'no', senior: 'view', director: 'full' },
  { name: 'Approve/Deny', creative: 'no', senior: 'no', director: 'yes' },
  { name: 'Comment', creative: 'yes', senior: 'yes', director: 'yes' },
  { name: 'Annotate images', creative: 'no', senior: 'yes', director: 'yes' },
  { name: '@Mention', creative: 'yes', senior: 'yes', director: 'yes' },
];

function PermissionIcon({ value }: { value: string }) {
  switch (value) {
    case 'yes':
    case 'direct':
    case 'full':
      return <Check className="h-4 w-4 text-green-500" />;
    case 'no':
      return <X className="h-4 w-4 text-muted-foreground" />;
    case 'pending':
      return <Clock className="h-4 w-4 text-yellow-500" />;
    case 'own':
      return <span className="text-xs text-muted-foreground">Own only</span>;
    case 'view':
      return <Eye className="h-4 w-4 text-blue-500" />;
    default:
      return <span className="text-xs">{value}</span>;
  }
}

export function RolePermissionsMatrix() {
  return (
    <HoverCard openDelay={200}>
      <HoverCardTrigger asChild>
        <button className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
          <Info className="h-4 w-4" />
          <span className="text-xs">View permissions</span>
        </button>
      </HoverCardTrigger>
      <HoverCardContent className="w-[450px] p-0" align="start">
        <div className="p-4 border-b border-border">
          <h4 className="font-semibold">Creative Role Permissions</h4>
          <p className="text-xs text-muted-foreground mt-1">
            Permissions for Creative Studio access
          </p>
        </div>
        <div className="p-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-2 font-medium text-muted-foreground">Permission</th>
                <th className="text-center py-2 px-2 font-medium">
                  <Badge variant="outline" className="text-xs">Creative</Badge>
                </th>
                <th className="text-center py-2 px-2 font-medium">
                  <Badge variant="outline" className="text-xs">Sr. Creative</Badge>
                </th>
                <th className="text-center py-2 px-2 font-medium">
                  <Badge variant="outline" className="text-xs">Director</Badge>
                </th>
              </tr>
            </thead>
            <tbody>
              {permissions.map((perm) => (
                <tr key={perm.name} className="border-b border-border/50 last:border-0">
                  <td className="py-2 px-2 text-xs">{perm.name}</td>
                  <td className="py-2 px-2 text-center">
                    <div className="flex justify-center">
                      <PermissionIcon value={perm.creative} />
                    </div>
                  </td>
                  <td className="py-2 px-2 text-center">
                    <div className="flex justify-center">
                      <PermissionIcon value={perm.senior} />
                    </div>
                  </td>
                  <td className="py-2 px-2 text-center">
                    <div className="flex justify-center">
                      <PermissionIcon value={perm.director} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-3 bg-muted/30 border-t border-border">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Check className="h-3 w-3 text-green-500" /> Full access
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-yellow-500" /> Requires approval
            </div>
            <div className="flex items-center gap-1">
              <Eye className="h-3 w-3 text-blue-500" /> View only
            </div>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
