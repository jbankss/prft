import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBrandContext } from '@/hooks/useBrandContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, XCircle, Clock, Search } from 'lucide-react';
import { toast } from 'sonner';

export default function Approvals() {
  const { isMJAdmin } = useBrandContext();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('pending');

  const fetchRequests = async () => {
    try {
      let query = supabase
        .from('user_roles')
        .select('*, profiles(full_name, email), brands(name)')
        .order('requested_at', { ascending: false });

      if (statusFilter === 'pending') {
        query = query.eq('approved', false);
      } else if (statusFilter === 'approved') {
        query = query.eq('approved', true);
      }

      const { data, error } = await query;

      if (error) throw error;
      setRequests(data || []);
    } catch (error: any) {
      toast.error('Failed to fetch requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isMJAdmin) {
      fetchRequests();
    }
  }, [isMJAdmin, statusFilter]);

  const handleApprove = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({
          approved: true,
          approved_at: new Date().toISOString(),
          approved_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', requestId);

      if (error) throw error;

      toast.success('Request approved');
      fetchRequests();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleReject = async (requestId: string) => {
    if (!confirm('Are you sure you want to reject this request?')) return;

    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', requestId);

      if (error) throw error;

      toast.success('Request rejected');
      fetchRequests();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleRoleChange = async (requestId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('id', requestId);

      if (error) throw error;

      toast.success('Role updated');
      fetchRequests();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const filteredRequests = requests.filter(request => {
    if (!searchQuery) return true;
    return (
      request.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.profiles?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.brands?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  if (!isMJAdmin) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">You don't have permission to view this page.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold mb-2">Access Approvals</h1>
        <p className="text-muted-foreground">Review and manage store access requests</p>
      </div>

      <Card className="p-6 glass">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filteredRequests.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {statusFilter === 'pending' ? 'No pending requests' : 'No requests found'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Store</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">
                      {request.profiles?.full_name || 'N/A'}
                    </TableCell>
                    <TableCell>{request.profiles?.email}</TableCell>
                    <TableCell>{request.brands?.name}</TableCell>
                    <TableCell>
                      {request.approved ? (
                        <Select
                          value={request.role}
                          onValueChange={(value) => handleRoleChange(request.id, value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="capitalize">{request.role}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {request.approved ? (
                        <Badge className="bg-green-500">Approved</Badge>
                      ) : (
                        <Badge variant="outline">Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(request.requested_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {!request.approved && (
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleApprove(request.id)}
                            className="bg-green-500 hover:bg-green-600"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleReject(request.id)}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
