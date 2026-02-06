import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Settings, Mail, CreditCard, Building2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PlatformSetting {
  id: string;
  key: string;
  value: string;
  category: string;
  label: string;
  description: string | null;
  is_secret: boolean;
}

export function PlatformSettings() {
  const [settings, setSettings] = useState<PlatformSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('*')
        .order('category', { ascending: true });

      if (error) throw error;
      setSettings(data || []);
      
      // Initialize edited values
      const initial: Record<string, string> = {};
      data?.forEach(s => { initial[s.key] = s.value; });
      setEditedValues(initial);
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (key: string) => {
    setSaving(key);
    try {
      const { error } = await supabase
        .from('platform_settings')
        .update({ value: editedValues[key] })
        .eq('key', key);

      if (error) throw error;

      // Update local state
      setSettings(prev => 
        prev.map(s => s.key === key ? { ...s, value: editedValues[key] } : s)
      );

      toast({
        title: 'Saved',
        description: 'Setting updated successfully',
      });
    } catch (error) {
      console.error('Error saving setting:', error);
      toast({
        title: 'Error',
        description: 'Failed to save setting',
        variant: 'destructive',
      });
    } finally {
      setSaving(null);
    }
  };

  const hasChanges = (key: string) => {
    const original = settings.find(s => s.key === key)?.value;
    return original !== editedValues[key];
  };

  const getSettingsByCategory = (category: string) => 
    settings.filter(s => s.category === category);

  const categoryConfig = {
    branding: {
      title: 'Branding',
      description: 'Customize your app name and identity',
      icon: Building2,
    },
    email: {
      title: 'Email Configuration',
      description: 'Configure email sending settings (requires verified Resend domain)',
      icon: Mail,
    },
    stripe: {
      title: 'Stripe Configuration',
      description: 'Connect your Stripe products for subscription billing',
      icon: CreditCard,
    },
    legal: {
      title: 'Legal & Contact',
      description: 'Legal page URLs and contact information',
      icon: Settings,
    },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Platform Settings</h2>
        <p className="text-muted-foreground mt-1">
          Configure your app for production. These settings make your app remix-ready.
        </p>
      </div>

      <Alert className="border-primary/20 bg-primary/5">
        <AlertCircle className="h-4 w-4 text-primary" />
        <AlertDescription className="text-sm">
          <strong>For remixers:</strong> Update these settings to customize the app for your brand. 
          Make sure to verify your email domain in Resend and create your own Stripe products.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="branding" className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="branding" className="gap-2">
            <Building2 className="w-4 h-4" />
            <span className="hidden sm:inline">Branding</span>
          </TabsTrigger>
          <TabsTrigger value="email" className="gap-2">
            <Mail className="w-4 h-4" />
            <span className="hidden sm:inline">Email</span>
          </TabsTrigger>
          <TabsTrigger value="stripe" className="gap-2">
            <CreditCard className="w-4 h-4" />
            <span className="hidden sm:inline">Stripe</span>
          </TabsTrigger>
          <TabsTrigger value="legal" className="gap-2">
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Legal</span>
          </TabsTrigger>
        </TabsList>

        {Object.entries(categoryConfig).map(([category, config]) => (
          <TabsContent key={category} value={category} className="space-y-4">
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <config.icon className="w-5 h-5 text-primary" />
                  {config.title}
                </CardTitle>
                <CardDescription>{config.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {getSettingsByCategory(category).map((setting) => (
                  <div key={setting.key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={setting.key} className="text-sm font-medium">
                        {setting.label}
                      </Label>
                      {hasChanges(setting.key) && (
                        <Button
                          size="sm"
                          onClick={() => handleSave(setting.key)}
                          disabled={saving === setting.key}
                          className="gap-1"
                        >
                          {saving === setting.key ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Save className="w-3 h-3" />
                          )}
                          Save
                        </Button>
                      )}
                    </div>
                    <Input
                      id={setting.key}
                      type={setting.is_secret ? 'password' : 'text'}
                      value={editedValues[setting.key] || ''}
                      onChange={(e) => setEditedValues(prev => ({
                        ...prev,
                        [setting.key]: e.target.value
                      }))}
                      className="font-mono text-sm"
                    />
                    {setting.description && (
                      <p className="text-xs text-muted-foreground">
                        {setting.description}
                      </p>
                    )}
                  </div>
                ))}

                {getSettingsByCategory(category).length === 0 && (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No settings in this category
                  </p>
                )}
              </CardContent>
            </Card>

            {category === 'email' && (
              <Alert className="border-amber-500/20 bg-amber-500/5">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <AlertDescription className="text-sm">
                  <strong>Important:</strong> The "From Address" must be a verified domain in your{' '}
                  <a 
                    href="https://resend.com/domains" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary underline"
                  >
                    Resend dashboard
                  </a>
                  . Using an unverified domain will cause emails to fail.
                </AlertDescription>
              </Alert>
            )}

            {category === 'stripe' && (
              <Alert className="border-amber-500/20 bg-amber-500/5">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <AlertDescription className="text-sm">
                  <strong>How to get Stripe IDs:</strong> Create products in your{' '}
                  <a 
                    href="https://dashboard.stripe.com/products" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary underline"
                  >
                    Stripe Dashboard
                  </a>
                  , then copy the Price ID (starts with <code className="text-xs bg-muted px-1 rounded">price_</code>) 
                  and Product ID (starts with <code className="text-xs bg-muted px-1 rounded">prod_</code>).
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
