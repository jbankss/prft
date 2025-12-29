import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBrandContext } from '@/hooks/useBrandContext';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, UserPlus, Mail, Phone, AlertTriangle, Activity, Shield, Clock, Palette } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { RolePermissionsMatrix } from '@/components/personnel/RolePermissionsMatrix';

interface TeamMember {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  status: string;
  role: string;
  creative_role: string | null;
  phone_number: string | null;
  title: string | null;
  created_at: string;
}
interface UserActivity {
  id: string;
  action: string;
  entity_type: string | null;
  created_at: string;
  metadata: any;
}
interface UserFlag {
  id: string;
  flag_type: string;
  severity: string;
  description: string | null;
  auto_flagged: boolean;
  reviewed: boolean;
  created_at: string;
}
export default function Personnel() {
  const {
    currentBrand
  } = useBrandContext();
  const {
    user
  } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [memberActivities, setMemberActivities] = useState<UserActivity[]>([]);
  const [memberFlags, setMemberFlags] = useState<UserFlag[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteRole, setInviteRole] = useState('user');
  const [inviteCreativeRole, setInviteCreativeRole] = useState<string>('none');
  useEffect(() => {
    if (currentBrand) {
      fetchMembers();
    }
  }, [currentBrand]);
  const fetchMembers = async () => {
    try {
      // First fetch roles for this brand
      const {
        data: roles,
        error: rolesError
      } = await supabase.from('user_roles').select('user_id, role, creative_role, approved, brand_id').eq('brand_id', currentBrand.id).eq('approved', true);
      if (rolesError) throw rolesError;
      const userIds = roles?.map(r => r.user_id) || [];

      // Fetch corresponding profiles in a separate query since there is no FK relationship
      let profiles: any[] = [];
      if (userIds.length > 0) {
        const {
          data: profilesData,
          error: profilesError
        } = await supabase.from('profiles').select('id, email, full_name, avatar_url, status, phone_number, title, created_at').in('id', userIds);
        if (profilesError) throw profilesError;
        profiles = profilesData || [];
      }
      const teamMembers: TeamMember[] = (roles || []).map((r: any) => {
        const profile = profiles.find(p => p.id === r.user_id);
        if (!profile) return null;
        return {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          status: profile.status || 'online',
          role: r.role,
          creative_role: r.creative_role,
          phone_number: profile.phone_number,
          title: profile.title,
          created_at: profile.created_at
        } as TeamMember;
      }).filter(Boolean) as TeamMember[];

      // Include current user if not already in the list
      if (user && !teamMembers.find(m => m.id === user.id)) {
        const {
          data: currentUserProfile,
          error: currentUserError
        } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (currentUserError) {
          console.error('Error fetching current user profile:', currentUserError);
        }
        if (currentUserProfile) {
          teamMembers.unshift({
            id: currentUserProfile.id,
            email: currentUserProfile.email,
            full_name: currentUserProfile.full_name,
            avatar_url: currentUserProfile.avatar_url,
            status: currentUserProfile.status || 'online',
            role: 'admin',
            creative_role: 'creative_director',
            phone_number: currentUserProfile.phone_number,
            title: currentUserProfile.title,
            created_at: currentUserProfile.created_at
          });
        }
      }
      setMembers(teamMembers);
    } catch (error: any) {
      console.error('Error fetching members:', error);
      toast.error('Failed to fetch team members');
    } finally {
      setLoading(false);
    }
  };
  const fetchMemberActivity = async (memberId: string) => {
    try {
      const {
        data,
        error
      } = await supabase.from('user_activity_logs').select('*').eq('user_id', memberId).eq('brand_id', currentBrand.id).order('created_at', {
        ascending: false
      }).limit(50);
      if (error) throw error;
      setMemberActivities(data || []);
    } catch (error) {
      console.error('Failed to fetch member activity:', error);
    }
  };
  const fetchMemberFlags = async (memberId: string) => {
    try {
      const {
        data,
        error
      } = await supabase.from('user_flags').select('*').eq('user_id', memberId).eq('brand_id', currentBrand.id).order('created_at', {
        ascending: false
      });
      if (error) throw error;
      setMemberFlags(data || []);
    } catch (error) {
      console.error('Failed to fetch member flags:', error);
    }
  };
  const handleMemberClick = async (member: TeamMember) => {
    setSelectedMember(member);
    await fetchMemberActivity(member.id);
    await fetchMemberFlags(member.id);
  };
  const handleRoleChange = async (memberId: string, newRole: string) => {
    try {
      const {
        error
      } = await supabase.from('user_roles').update({
        role: newRole
      }).eq('user_id', memberId).eq('brand_id', currentBrand.id);
      if (error) throw error;
      toast.success('Role updated successfully');
      fetchMembers();
      if (selectedMember?.id === memberId) {
        setSelectedMember({ ...selectedMember, role: newRole });
      }
    } catch (error: any) {
      toast.error('Failed to update role');
    }
  };

  const handleCreativeRoleChange = async (memberId: string, newCreativeRole: string) => {
    try {
      const {
        error
      } = await supabase.from('user_roles').update({
        creative_role: newCreativeRole === 'none' ? null : newCreativeRole
      }).eq('user_id', memberId).eq('brand_id', currentBrand.id);
      if (error) throw error;
      toast.success('Creative role updated successfully');
      fetchMembers();
      if (selectedMember?.id === memberId) {
        setSelectedMember({ ...selectedMember, creative_role: newCreativeRole === 'none' ? null : newCreativeRole });
      }
    } catch (error: any) {
      toast.error('Failed to update creative role');
    }
  };
  const handleRemoveMember = async (memberId: string) => {
    try {
      const {
        error
      } = await supabase.from('user_roles').delete().eq('user_id', memberId).eq('brand_id', currentBrand.id);
      if (error) throw error;
      toast.success('Member removed successfully');
      setSelectedMember(null);
      fetchMembers();
    } catch (error: any) {
      toast.error('Failed to remove member');
    }
  };
  const handleInvite = async () => {
    if (!inviteEmail && !invitePhone) {
      toast.error('Please provide an email or phone number');
      return;
    }
    try {
      const invitationCode = Math.random().toString(36).substring(2, 15);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      const {
        error
      } = await supabase.from('user_invitations').insert({
        brand_id: currentBrand.id,
        invited_by: user!.id,
        email: inviteEmail || null,
        phone_number: invitePhone || null,
        role: inviteRole,
        invitation_code: invitationCode,
        expires_at: expiresAt.toISOString()
      });
      if (error) throw error;
      toast.success('Invitation sent successfully');
      setInviteOpen(false);
      setInviteEmail('');
      setInvitePhone('');
      setInviteRole('user');
    } catch (error: any) {
      toast.error('Failed to send invitation');
    }
  };
  const filteredMembers = members.filter(member => member.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || member.email.toLowerCase().includes(searchQuery.toLowerCase()) || member.title?.toLowerCase().includes(searchQuery.toLowerCase()));
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'away':
        return 'bg-yellow-500';
      case 'remote':
        return 'bg-blue-500';
      case 'vacation':
        return 'bg-purple-500';
      default:
        return 'bg-muted';
    }
  };
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'high':
        return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'low':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };
  if (loading) {
    return <div className="flex items-center justify-center h-screen">
        <div className="animate-pulse text-muted-foreground">Loading personnel...</div>
      </div>;
  }
  return <div className="container mx-auto p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          
          
        </div>
        
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="gap-2">
              <UserPlus className="h-5 w-5" />
              Invite Member
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl font-display">Invite Team Member</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" placeholder="colleague@company.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Phone Number (optional)</Label>
                <Input type="tel" placeholder="+1 (555) 000-0000" value={invitePhone} onChange={e => setInvitePhone(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Creative Role</Label>
                  <RolePermissionsMatrix />
                </div>
                <Select value={inviteCreativeRole} onValueChange={setInviteCreativeRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="creative">Creative</SelectItem>
                    <SelectItem value="senior_creative">Senior Creative</SelectItem>
                    <SelectItem value="creative_director">Creative Director</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleInvite} className="w-full" size="lg">
                Send Invitation
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-6">
        {/* Team Roster */}
        <Card className="flex-1 p-8">
          <div className="mb-6 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input placeholder="Search team members..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
          </div>

          <div className="space-y-3">
            {filteredMembers.map(member => <div key={member.id} onClick={() => handleMemberClick(member)} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-muted/50 transition-colors cursor-pointer">
                <div className="relative">
                  <Avatar className="h-14 w-14">
                    <AvatarImage src={member.avatar_url || undefined} />
                    <AvatarFallback className="text-lg font-semibold">
                      {member.full_name?.charAt(0) || member.email.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-card ${getStatusColor(member.status)}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-lg truncate">{member.full_name || member.email}</p>
                    <Badge variant="outline" className="capitalize">{member.role}</Badge>
                    {member.creative_role && (
                      <Badge variant="secondary" className="capitalize text-xs">
                        <Palette className="h-3 w-3 mr-1" />
                        {member.creative_role.replace('_', ' ')}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{member.title || member.email}</p>
                </div>

                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Joined</p>
                  <p className="text-sm font-medium">{format(new Date(member.created_at), 'MMM yyyy')}</p>
                </div>
              </div>)}

            {filteredMembers.length === 0 && <div className="text-center py-12 text-muted-foreground">
                No team members found
              </div>}
          </div>
        </Card>

        {/* Member Details */}
        {selectedMember && <Card className="w-96 p-8">
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
                <TabsTrigger value="flags">Flags</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-6">
                <div className="flex flex-col items-center gap-4">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={selectedMember.avatar_url || undefined} />
                    <AvatarFallback className="text-3xl">
                      {selectedMember.full_name?.charAt(0) || selectedMember.email.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-center">
                    <h3 className="font-display font-semibold text-2xl">{selectedMember.full_name}</h3>
                    <p className="text-muted-foreground">{selectedMember.title}</p>
                  </div>
                  <Badge variant="outline" className={`capitalize ${getStatusColor(selectedMember.status)} text-white`}>
                    {selectedMember.status}
                  </Badge>
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{selectedMember.email}</span>
                  </div>
                  {selectedMember.phone_number && <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{selectedMember.phone_number}</span>
                    </div>}
                  <div className="flex items-center gap-3">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <Select value={selectedMember.role} onValueChange={value => handleRoleChange(selectedMember.id, value)}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-3">
                    <Palette className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <Select value={selectedMember.creative_role || 'none'} onValueChange={value => handleCreativeRoleChange(selectedMember.id, value)}>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="No creative role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Creative Role</SelectItem>
                          <SelectItem value="creative">Creative</SelectItem>
                          <SelectItem value="senior_creative">Senior Creative</SelectItem>
                          <SelectItem value="creative_director">Creative Director</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <RolePermissionsMatrix />
                  </div>
                </div>

                <Button variant="destructive" className="w-full" onClick={() => {
              if (confirm('Are you sure you want to remove this team member?')) {
                handleRemoveMember(selectedMember.id);
              }
            }}>
                  Remove from Team
                </Button>
              </TabsContent>

              <TabsContent value="activity" className="space-y-3">
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {memberActivities.map(activity => <div key={activity.id} className="p-3 bg-muted rounded-lg">
                      <div className="flex items-start gap-2">
                        <Activity className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{activity.action}</p>
                          {activity.entity_type && <p className="text-xs text-muted-foreground">{activity.entity_type}</p>}
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(activity.created_at), 'MMM d, h:mm a')}
                          </p>
                        </div>
                      </div>
                    </div>)}
                  {memberActivities.length === 0 && <div className="text-center py-8 text-muted-foreground text-sm">
                      No activity logs
                    </div>}
                </div>
              </TabsContent>

              <TabsContent value="flags" className="space-y-3">
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {memberFlags.map(flag => <div key={flag.id} className={`p-3 rounded-lg border ${getSeverityColor(flag.severity)}`}>
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 mt-0.5" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-medium capitalize">{flag.flag_type.replace('_', ' ')}</p>
                            {flag.auto_flagged && <Badge variant="outline" className="text-xs">Auto</Badge>}
                          </div>
                          {flag.description && <p className="text-xs mb-2">{flag.description}</p>}
                          <p className="text-xs opacity-70">
                            {format(new Date(flag.created_at), 'MMM d, h:mm a')}
                          </p>
                        </div>
                      </div>
                    </div>)}
                  {memberFlags.length === 0 && <div className="text-center py-8 text-muted-foreground text-sm">
                      No flags
                    </div>}
                </div>
              </TabsContent>
            </Tabs>
          </Card>}
      </div>
    </div>;
}