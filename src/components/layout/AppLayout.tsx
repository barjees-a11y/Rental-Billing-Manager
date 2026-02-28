import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import saharaLogo from '@/assets/sahara-logo.png';
import {
  LayoutDashboard,
  FileText,
  Upload,
  Settings,
  LogOut,
  FileSpreadsheet,
  Moon,
  Sun,
  Eye,
  Menu,
  ChevronLeft,
  Archive,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useAuth } from '@/hooks/useAuth';
import { useState, useEffect } from 'react';

interface AppLayoutProps {
  children: ReactNode;
}

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/contracts', label: 'Contracts', icon: FileText },
  { path: '/archived', label: 'Archived', icon: Archive },
  { path: '/custom-view', label: 'Custom View', icon: Eye },
  { path: '/import', label: 'Import Excel', icon: Upload },
  { path: '/reports', label: 'Reports', icon: FileSpreadsheet },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [isDark, setIsDark] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Default to dark mode
    document.documentElement.classList.add('dark');
  }, []);

  // Auto-collapse sidebar on /contracts and /custom-view routes
  useEffect(() => {
    if (location.pathname === '/contracts' || location.pathname === '/custom-view') {
      setSidebarCollapsed(true);
    } else {
      setSidebarCollapsed(false);
    }
  }, [location.pathname]);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-transparent relative">
      {/* Subtle background gradient mesh */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-accent/5 rounded-full blur-3xl" />
      </div>

      {/* Mobile Top Header (Hidden on md+) */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 z-50 bg-background/80 backdrop-blur-md border-b border-border/20 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 -ml-2">
                <Menu className="h-5 w-5 text-foreground" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] p-0 border-r border-border/20 bg-background flex flex-col pt-0 pb-0">
              <SheetHeader className="sr-only">
                <SheetTitle>Navigation Menu</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col h-full bg-sidebar">
                <div className="h-0.5 bg-gradient-to-r from-primary via-accent to-primary/50 shrink-0" />
                <div className="p-4 border-b border-border/20 flex items-center shrink-0">
                  <img src={saharaLogo} alt="SAHARA" className="h-10 w-auto" />
                </div>
                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                  {navItems.map(({ path, label, icon: Icon }) => {
                    const isActive = location.pathname === path;
                    return (
                      <Link
                        key={path}
                        to={path}
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          'flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-300',
                          isActive
                            ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-[0_0_20px_hsl(var(--primary)/0.4)] border border-primary/20'
                            : 'text-sidebar-foreground hover:text-primary hover:bg-sidebar-accent/50'
                        )}
                      >
                        <Icon className="h-5 w-5" />
                        <span>{label}</span>
                      </Link>
                    );
                  })}
                </nav>
                <div className="p-4 border-t border-border/20 pb-safe shrink-0">
                  <Button variant="outline" className="w-full justify-start gap-2" onClick={logout}>
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
          <img src={saharaLogo} alt="SAHARA Office Equipments" className="h-7 w-auto" />
        </div>
        <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-8 w-8">
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>

      {/* Toggle button when sidebar is collapsed (Desktop Only) */}
      {sidebarCollapsed && (
        <div className="hidden md:flex fixed left-3 top-3 z-50 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSidebarCollapsed(false)}
            className="bg-background/90 backdrop-blur-sm border-border shadow-lg gap-2"
          >
            <Menu className="h-4 w-4" />
            Menu
          </Button>
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="bg-background/90 backdrop-blur-sm border border-border shadow-lg gap-2"
          >
            <Link to="/">
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Link>
          </Button>
        </div>
      )}

      {/* Sidebar (Hidden on Mobile) */}
      <aside className={cn(
        "glass-sidebar hidden md:flex flex-col transition-all duration-300 relative z-10",
        sidebarCollapsed ? "w-0 overflow-hidden" : "w-64"
      )}>
        {/* Top accent bar */}
        <div className="h-0.5 bg-gradient-to-r from-primary via-accent to-primary/50" />
        {/* Logo + Close button on contracts/custom-view */}
        <div className="p-4 border-b border-border/20 flex items-center justify-between">
          <img
            src={saharaLogo}
            alt="SAHARA Office Equipments"
            className="h-12 w-auto"
          />
          {(location.pathname === '/contracts' || location.pathname === '/custom-view') && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarCollapsed(true)}
              className="h-8 w-8"
              title="Hide sidebar"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ path, label, icon: Icon }) => {
            const isActive = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className={cn(
                  'flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-300',
                  'hover:bg-sidebar-accent/50 hover:translate-x-1 hover:shadow-[0_0_15px_hsl(var(--primary)/0.3)]',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-[0_0_20px_hsl(var(--primary)/0.4)] border border-primary/20'
                    : 'text-sidebar-foreground hover:text-primary'
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-border/20">
          <div className="flex items-center justify-between mb-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name || 'Guest'}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email || ''}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="shrink-0"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={logout}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className={cn(
        "flex-1 overflow-auto transition-all duration-300 pt-14 md:pt-0",
        sidebarCollapsed ? "md:pt-16" : ""
      )}>
        <div className="p-2 lg:p-3">
          {children}
        </div>
      </main>
    </div>
  );
}
