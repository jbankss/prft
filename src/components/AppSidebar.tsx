import { Home, Building2, Image, CheckCircle, Settings } from 'lucide-react';
import { useBrandContext } from '@/hooks/useBrandContext';
import { BrandSwitcher } from './BrandSwitcher';
import { NavLink } from '@/components/NavLink';
import { useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from '@/components/ui/sidebar';

export function AppSidebar() {
  const { isMJAdmin } = useBrandContext();
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const collapsed = state === 'collapsed';
  
  const items = [
    { title: 'Dashboard', url: '/', icon: Home },
    { title: 'Account Management', url: '/accounts', icon: Building2 },
    { title: 'Photography & Creative', url: '/creative', icon: Image },
    ...(isMJAdmin ? [{ title: 'Approvals', url: '/approvals', icon: CheckCircle }] : []),
    { title: 'Settings', url: '/settings', icon: Settings },
  ];

  return (
    <Sidebar className={collapsed ? 'w-14' : 'w-60'}>
      <SidebarContent className="glass">
        <SidebarHeader className="space-y-4">
          <h2 className="text-lg font-semibold px-4 py-2">MJ Fashion Platform</h2>
          <div className="px-4">
            <BrandSwitcher />
          </div>
        </SidebarHeader>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider">
            Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === '/'}
                      className="hover:bg-muted/50 transition-all duration-200"
                      activeClassName="bg-muted text-primary font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
