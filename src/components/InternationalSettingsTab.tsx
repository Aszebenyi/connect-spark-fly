import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { COUNTRIES, CountryCode, getCurrencySymbol } from '@/lib/countries';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Globe } from 'lucide-react';

export function InternationalSettingsTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [baseCountry, setBaseCountry] = useState<string>('US');
  const [recruitCountries, setRecruitCountries] = useState<string[]>(['US']);
  const [internationalRecruiting, setInternationalRecruiting] = useState(false);
  const [dateFormat, setDateFormat] = useState('MM/DD/YYYY');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('base_country, recruit_countries, international_recruiting, currency, date_format')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) {
        setBaseCountry((data as any).base_country || 'US');
        setRecruitCountries((data as any).recruit_countries || ['US']);
        setInternationalRecruiting((data as any).international_recruiting || false);
        setDateFormat((data as any).date_format || 'MM/DD/YYYY');
      }
      setIsLoading(false);
    };
    load();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const country = COUNTRIES[baseCountry as CountryCode];
      const { error } = await supabase
        .from('profiles')
        .update({
          base_country: baseCountry,
          recruit_countries: recruitCountries,
          international_recruiting: internationalRecruiting,
          currency: country?.currency || 'USD',
          date_format: dateFormat,
        } as any)
        .eq('user_id', user.id);
      if (error) throw error;
      toast({ title: 'Settings saved', description: 'International preferences updated.' });
    } catch {
      toast({ title: 'Error saving settings', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleRecruitCountry = (code: string) => {
    setRecruitCountries(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Regional Settings */}
      <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            Regional Settings
          </h3>
          <p className="text-sm text-muted-foreground mt-1">Configure your base country and recruitment regions</p>
        </div>

        <div className="space-y-6">
          {/* Base Country */}
          <div className="space-y-2">
            <Label>Base Country</Label>
            <Select value={baseCountry} onValueChange={setBaseCountry}>
              <SelectTrigger className="w-full rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(COUNTRIES).map(([code, country]) => (
                  <SelectItem key={code} value={code}>
                    {country.flag} {country.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Determines your default currency, date format, and terminology
            </p>
          </div>

          {/* Recruitment Countries */}
          <div className="space-y-2">
            <Label>I recruit for positions in:</Label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(COUNTRIES).map(([code, country]) => (
                <label
                  key={code}
                  className="flex items-center gap-3 p-3 border border-border rounded-xl cursor-pointer hover:bg-muted/30 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={recruitCountries.includes(code)}
                    onChange={() => toggleRecruitCountry(code)}
                    className="rounded"
                  />
                  <span className="text-sm">
                    {country.flag} {country.name}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* International Sourcing */}
          <div className="flex items-center justify-between p-4 rounded-xl border border-border">
            <div>
              <Label>International Candidate Sourcing</Label>
              <p className="text-xs text-muted-foreground mt-1">
                Show candidates from other countries (e.g., Filipino nurses, Indian doctors)
              </p>
            </div>
            <Switch
              checked={internationalRecruiting}
              onCheckedChange={setInternationalRecruiting}
            />
          </div>
        </div>
      </div>

      {/* Display Preferences */}
      <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-foreground">Display Preferences</h3>
          <p className="text-sm text-muted-foreground mt-1">Currency and date formatting</p>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Salary Display Currency</Label>
            <p className="text-sm text-foreground">
              Primary: {getCurrencySymbol(baseCountry)} ({COUNTRIES[baseCountry as CountryCode]?.currency || 'USD'})
            </p>
            <p className="text-xs text-muted-foreground">
              Job postings in other countries will show in their local currency
            </p>
          </div>

          <div className="space-y-2">
            <Label>Date Format</Label>
            <Select value={dateFormat} onValueChange={setDateFormat}>
              <SelectTrigger className="w-full rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MM/DD/YYYY">MM/DD/YYYY (US/Canada)</SelectItem>
                <SelectItem value="DD/MM/YYYY">DD/MM/YYYY (UK/AU/UAE)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Button onClick={handleSave} disabled={isSaving} className="apple-button">
        {isSaving ? 'Saving...' : 'Save International Settings'}
      </Button>
    </div>
  );
}
