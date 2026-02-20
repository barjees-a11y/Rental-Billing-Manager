import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/hooks/useAuth';
import { useContracts } from '@/hooks/useContracts';
import {
  User,
  Shield,
  Database,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { PeriodSettingsCard } from '@/components/settings/PeriodSettingsCard';


export default function Settings() {
  const { user } = useAuth();
  const { contracts, clearAllContracts } = useContracts();
  const { toast } = useToast();

  const [companyName, setCompanyName] = useState('Rental Billing Co.');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [isClearing, setIsClearing] = useState(false);

  const handleClearAllData = async () => {
    setIsClearing(true);
    const success = await clearAllContracts();
    setIsClearing(false);
    if (success) {
      window.location.reload();
    }
  };

  const handleSaveSettings = () => {
    toast({
      title: 'Settings saved',
      description: 'Your preferences have been updated.',
    });
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold gradient-text">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your application settings
        </p>
      </div>

      {/* Profile */}
      <Card className="glass-panel animate-slide-up [animation-delay:100ms]">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary/50 via-primary to-primary/50" />
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Profile</CardTitle>
              <CardDescription>Your account information</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={user?.name || 'Guest'} disabled />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user?.email || ''} disabled />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Company Settings */}
      <Card className="glass-panel animate-slide-up [animation-delay:200ms]">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary/50 via-primary to-primary/50" />
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Company Settings</CardTitle>
              <CardDescription>Configure your business details</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Company Name</Label>
            <Input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Your company name"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Email Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive email alerts for contract due dates
              </p>
            </div>
            <Switch
              checked={emailNotifications}
              onCheckedChange={setEmailNotifications}
            />
          </div>

          <Button onClick={handleSaveSettings}>Save Settings</Button>
        </CardContent>
      </Card>

      {/* Period Settings */}
      <PeriodSettingsCard />

      {/* Data Management */}
      <Card className="glass-panel animate-slide-up [animation-delay:300ms]">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-destructive/50 via-destructive to-destructive/50" />
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Database className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Data Management</CardTitle>
              <CardDescription>Manage your stored data</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-muted/30">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Contracts</span>
              <span className="text-sm text-muted-foreground">{contracts.length} records</span>
            </div>
          </div>

          <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-destructive">Danger Zone</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Clearing all data will permanently delete all contracts. This action cannot be undone.
                </p>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="mt-3">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear All Data
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete all {contracts.length} contracts.
                        This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={isClearing}>Cancel</AlertDialogCancel>
                      <AlertDialogAction disabled={isClearing} onClick={handleClearAllData} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        {isClearing ? 'Clearing...' : 'Yes, delete everything'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* About */}
      <Card className="glass-card animate-slide-up [animation-delay:400ms]">
        <CardContent className="py-4">
          <div className="text-center text-sm text-muted-foreground">
            <p className="font-medium">SAHARA Contract Manager</p>
            <p>Version 1.0.0</p>
            <p className="mt-2">
              Data is stored locally in your browser. For cloud storage, consider connecting a database.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}