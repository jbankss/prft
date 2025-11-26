import { Card } from '@/components/ui/card';
import { Clock, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
export function PendingApproval() {
  const {
    signOut
  } = useAuth();
  return <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8 glass shadow-apple-lg text-center">
        <Clock className="h-16 w-16 mx-auto text-muted-foreground mb-6 animate-pulse" />
        <h1 className="text-2xl font-semibold mb-3">Awaiting Approval</h1>
        <p className="text-muted-foreground mb-6">Your store access request is pending approval from our team. You will recieve an email notification when access has been granted.</p>
        <Button variant="outline" onClick={signOut} className="w-full">
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </Card>
    </div>;
}