import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Save, Sparkles, Globe } from 'lucide-react';
import { COUNTRIES, CountryCode, getCurrencySymbol } from '@/lib/countries';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CompanyProfile {
  company_website: string;
  company_name: string;
  what_you_do: string;
  target_candidates: string;
  value_proposition: string;
  key_benefits: string;
  communication_tone: string;
}

const emptyProfile: CompanyProfile = {
  company_website: '',
  company_name: '',
  what_you_do: '',
  target_candidates: '',
  value_proposition: '',
  key_benefits: '',
  communication_tone: '',
};

export function CompanyProfileTab() {
  
  const { user, session } = useAuth();
  const [profile, setProfile] = useState<CompanyProfile>(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [hasExistingRecord, setHasExistingRecord] = useState(false);

  // International fields
  const [baseCountry, setBaseCountry] = useState<string>('US');
  const [recruitCountries, setRecruitCountries] = useState<string[]>(['US']);
  const [internationalRecruiting, setInternationalRecruiting] = useState(false);
  const [dateFormat, setDateFormat] = useState('MM/DD/YYYY');
  const [internationalLoading, setInternationalLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchProfile();
      loadInternationalSettings();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('user_company_profiles' as any)
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        const d = data as any;
        setProfile({
          company_website: d.company_website || '',
          company_name: d.company_name || '',
          what_you_do: d.what_you_do || '',
          target_candidates: d.target_candidates || '',
          value_proposition: d.value_proposition || '',
          key_benefits: d.key_benefits || '',
          communication_tone: d.communication_tone || '',
        });
        setHasExistingRecord(true);
      }
    } catch (error) {
      console.error('Error fetching company profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadInternationalSettings = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('base_country, recruit_countries, international_recruiting, currency, date_format')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (data) {
        setBaseCountry((data as any).base_country || 'US');
        setRecruitCountries((data as any).recruit_countries || ['US']);
        setInternationalRecruiting((data as any).international_recruiting || false);
        setDateFormat((data as any).date_format || 'MM/DD/YYYY');
      }
    } catch (error) {
      console.error('Error loading international settings:', error);
    } finally {
      setInternationalLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile.company_name.trim() || !profile.what_you_do.trim() || !profile.target_candidates.trim() || !profile.value_proposition.trim()) {
      toast.error('Please fill in Company Name, What You Do, Target Candidates, and Value Proposition.');
      return;
    }

    setSaving(true);
    try {
      // Save company profile
      if (hasExistingRecord) {
        const { error } = await supabase
          .from('user_company_profiles' as any)
          .update({
            company_website: profile.company_website || null,
            company_name: profile.company_name,
            what_you_do: profile.what_you_do,
            target_candidates: profile.target_candidates,
            value_proposition: profile.value_proposition,
            key_benefits: profile.key_benefits || null,
            communication_tone: profile.communication_tone || null,
          } as any)
          .eq('user_id', user!.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_company_profiles' as any)
          .insert({
            user_id: user!.id,
            company_website: profile.company_website || null,
            company_name: profile.company_name,
            what_you_do: profile.what_you_do,
            target_candidates: profile.target_candidates,
            value_proposition: profile.value_proposition,
            key_benefits: profile.key_benefits || null,
            communication_tone: profile.communication_tone || null,
          } as any);
        if (error) throw error;
        setHasExistingRecord(true);
      }

      // Save international settings
      const country = COUNTRIES[baseCountry as CountryCode];
      const { error: intlError } = await supabase
        .from('profiles')
        .update({
          base_country: baseCountry,
          recruit_countries: recruitCountries,
          international_recruiting: internationalRecruiting,
          currency: country?.currency || 'USD',
          date_format: dateFormat,
        } as any)
        .eq('user_id', user!.id);
      if (intlError) throw intlError;

      toast.success('Your company profile and regional settings have been updated.');
    } catch (error) {
      console.error('Error saving company profile:', error);
      toast.error('Failed to save company profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleExtractFromWebsite = async () => {
    if (!profile.company_website.trim()) {
      toast.error('Please enter your company website URL first.');
      return;
    }

    setExtracting(true);
    try {
      const { data, error } = await supabase.functions.invoke('extract-company-identity', {
        body: { url: profile.company_website },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const extracted = data.data;
      setProfile(prev => ({
        ...prev,
        company_name: extracted.company_name || prev.company_name,
        what_you_do: extracted.what_you_do || prev.what_you_do,
        target_candidates: extracted.target_candidates || prev.target_candidates,
        value_proposition: extracted.value_proposition || prev.value_proposition,
        key_benefits: extracted.key_benefits || prev.key_benefits,
        communication_tone: extracted.communication_tone || prev.communication_tone,
      }));

      toast.success('Review the extracted information and edit as needed before saving.');
    } catch (error: any) {
      console.error('Extract error:', error);
      toast.error(error.message || 'Could not extract company information.');
    } finally {
      setExtracting(false);
    }
  };

  const updateField = (field: keyof CompanyProfile, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const toggleRecruitCountry = (code: string) => {
    setRecruitCountries(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  if (loading || internationalLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Regional Settings Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-primary" />
          <h3 className="text-base font-semibold text-foreground">Regional Settings</h3>
        </div>
        <p className="text-sm text-muted-foreground -mt-4">
          Configure your base country and recruitment regions
        </p>

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

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Salary Display Currency</Label>
            <p className="text-sm text-foreground">
              {getCurrencySymbol(baseCountry)} ({COUNTRIES[baseCountry as CountryCode]?.currency || 'USD'})
            </p>
            <p className="text-xs text-muted-foreground">
              Jobs in other countries show their local currency
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

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Company Identity Section */}
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground">
          Define your company identity so AI-generated outreach emails accurately represent your recruiting agency.
        </p>

        {/* Website URL + Extract */}
        <div className="space-y-2">
          <Label htmlFor="company_website">Your Company Website (Optional)</Label>
          <div className="flex gap-2">
            <Input
              id="company_website"
              value={profile.company_website}
              onChange={(e) => updateField('company_website', e.target.value)}
              placeholder="https://yourrecruitingagency.com"
              className="apple-input flex-1"
            />
            <Button
              variant="outline"
              onClick={handleExtractFromWebsite}
              disabled={extracting || !profile.company_website.trim()}
              className="gap-2 whitespace-nowrap"
            >
              {extracting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {extracting ? 'Extracting...' : 'Extract from Website'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Enter your website to auto-fill your company details</p>
        </div>

        {/* Company Name */}
        <div className="space-y-2">
          <Label htmlFor="company_name">
            Company Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="company_name"
            value={profile.company_name}
            onChange={(e) => updateField('company_name', e.target.value)}
            placeholder="e.g., Apex Healthcare Staffing"
            className="apple-input"
          />
        </div>

        {/* What You Do */}
        <div className="space-y-2">
          <Label htmlFor="what_you_do">
            What You Do <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="what_you_do"
            value={profile.what_you_do}
            onChange={(e) => updateField('what_you_do', e.target.value)}
            placeholder="e.g., We place ICU nurses in travel contracts across California"
            rows={4}
            className="apple-input resize-none"
          />
        </div>

        {/* Target Candidates */}
        <div className="space-y-2">
          <Label htmlFor="target_candidates">
            Target Candidates <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="target_candidates"
            value={profile.target_candidates}
            onChange={(e) => updateField('target_candidates', e.target.value)}
            placeholder="e.g., Experienced ICU nurses, travel nurses, critical care specialists"
            rows={3}
            className="apple-input resize-none"
          />
        </div>

        {/* Value Proposition */}
        <div className="space-y-2">
          <Label htmlFor="value_proposition">
            Your Value Proposition <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="value_proposition"
            value={profile.value_proposition}
            onChange={(e) => updateField('value_proposition', e.target.value)}
            placeholder="e.g., Higher pay, better locations, more support than other agencies"
            rows={3}
            className="apple-input resize-none"
          />
        </div>

        {/* Key Benefits */}
        <div className="space-y-2">
          <Label htmlFor="key_benefits">Key Benefits</Label>
          <Textarea
            id="key_benefits"
            value={profile.key_benefits}
            onChange={(e) => updateField('key_benefits', e.target.value)}
            placeholder={"e.g., • Weekly pay\n• Housing stipends\n• 24/7 recruiter support"}
            rows={6}
            className="apple-input resize-none"
          />
        </div>

        {/* Communication Tone */}
        <div className="space-y-2">
          <Label htmlFor="communication_tone">Communication Tone</Label>
          <Textarea
            id="communication_tone"
            value={profile.communication_tone}
            onChange={(e) => updateField('communication_tone', e.target.value)}
            placeholder="e.g., Professional, supportive, urgent but not pushy"
            rows={4}
            className="apple-input resize-none"
          />
        </div>
      </div>

      {/* Save Button */}
      <div className="pt-2">
        <Button onClick={handleSave} disabled={saving} className="apple-button gap-2">
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? 'Saving...' : 'Save Company Profile'}
        </Button>
      </div>
    </div>
  );
}
