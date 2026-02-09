import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Globe, Sparkles, Package } from 'lucide-react';

interface ProductIdentityTabProps {
  settings: Array<{ key: string; value: string; label: string; description: string | null }>;
  editedValues: Record<string, string>;
  setEditedValues: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onSave: (key: string) => Promise<void>;
  saving: string | null;
  hasChanges: (key: string) => boolean;
}

const FIELD_CONFIG: Record<string, { rows?: number; placeholder: string; type: 'input' | 'textarea' }> = {
  company_website_url: {
    type: 'input',
    placeholder: 'https://yourcompany.com',
  },
  product_name: {
    type: 'input',
    placeholder: 'e.g., Acme Healthcare Staffing',
  },
  target_audience: {
    type: 'textarea',
    rows: 3,
    placeholder: 'e.g., Small to mid-size healthcare facilities looking for qualified nursing staff quickly and affordably.',
  },
  what_we_do: {
    type: 'textarea',
    rows: 4,
    placeholder: 'e.g., We connect healthcare facilities with pre-vetted, qualified nurses using AI-powered candidate matching and credential verification.',
  },
  core_value_proposition: {
    type: 'textarea',
    rows: 3,
    placeholder: 'e.g., Fill nursing roles 3x faster with AI-verified candidates. No recruiter fees, no wasted time on unqualified applicants.',
  },
  key_features: {
    type: 'textarea',
    rows: 6,
    placeholder: '• AI-powered candidate matching\n• Credential verification\n• Direct contact information\n• Real-time availability data\n• Bulk outreach tools\n• Campaign analytics',
  },
  tone_voice_guidelines: {
    type: 'textarea',
    rows: 6,
    placeholder: '• Professional but approachable\n• Confident, not aggressive\n• Data-driven claims only\n• Empathetic to hiring challenges\n• Action-oriented language\n• Avoid jargon and buzzwords',
  },
};

const FIELD_ORDER = [
  'company_website_url',
  'product_name',
  'target_audience',
  'what_we_do',
  'core_value_proposition',
  'key_features',
  'tone_voice_guidelines',
];

export function ProductIdentityTab({
  settings,
  editedValues,
  setEditedValues,
  onSave,
  saving,
  hasChanges,
}: ProductIdentityTabProps) {
  const [extracting, setExtracting] = useState(false);
  const { toast } = useToast();

  const websiteUrl = editedValues['company_website_url'] || '';

  const handleExtract = async () => {
    if (!websiteUrl.trim()) return;

    setExtracting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke('extract-product-identity', {
        body: { url: websiteUrl.trim() },
      });

      if (response.error) {
        const errorBody = typeof response.error === 'object' && 'context' in response.error
          ? JSON.parse((response.error as any).context?.body || '{}')
          : {};
        throw new Error(errorBody.error || 'Extraction failed');
      }

      const extracted = response.data?.data;
      if (!extracted) throw new Error('No data returned');

      setEditedValues(prev => ({
        ...prev,
        product_name: extracted.product_name || prev.product_name || '',
        target_audience: extracted.target_audience || prev.target_audience || '',
        what_we_do: extracted.what_we_do || prev.what_we_do || '',
        core_value_proposition: extracted.core_value_proposition || prev.core_value_proposition || '',
        key_features: extracted.key_features || prev.key_features || '',
        tone_voice_guidelines: extracted.tone_voice_guidelines || prev.tone_voice_guidelines || '',
      }));

      toast({
        title: 'Fields populated',
        description: 'Review and edit as needed, then save each field.',
      });
    } catch (error: any) {
      console.error('Extract error:', error);
      toast({
        title: 'Extraction failed',
        description: error.message || 'Could not analyze website',
        variant: 'destructive',
      });
    } finally {
      setExtracting(false);
    }
  };

  const handleSaveAll = async () => {
    const keysToSave = FIELD_ORDER.filter(key => hasChanges(key));
    for (const key of keysToSave) {
      await onSave(key);
    }
    if (keysToSave.length > 0) {
      toast({ title: 'All changes saved' });
    }
  };

  const anyChanges = FIELD_ORDER.some(key => hasChanges(key));

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5 text-primary" />
          Product Identity
        </CardTitle>
        <CardDescription>
          Define your product/service so AI-generated outreach represents your brand correctly.
          Optionally enter your website URL to auto-extract this information.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Website URL with Extract button */}
        <div className="space-y-2">
          <Label htmlFor="company_website_url" className="text-sm font-medium">
            Company Website (Optional)
          </Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="company_website_url"
                type="url"
                value={editedValues['company_website_url'] || ''}
                onChange={(e) =>
                  setEditedValues(prev => ({ ...prev, company_website_url: e.target.value }))
                }
                placeholder="https://yourcompany.com"
                className="pl-9 font-mono text-sm"
              />
            </div>
            {websiteUrl.trim() && (
              <Button
                onClick={handleExtract}
                disabled={extracting}
                variant="outline"
                className="gap-2 shrink-0"
              >
                {extracting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Extract from Website
                  </>
                )}
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Optional: Enter your website URL to auto-extract product information
          </p>
          {hasChanges('company_website_url') && (
            <Button size="sm" onClick={() => onSave('company_website_url')} disabled={saving === 'company_website_url'} className="gap-1">
              {saving === 'company_website_url' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              Save
            </Button>
          )}
        </div>

        {/* Remaining fields */}
        {FIELD_ORDER.filter(k => k !== 'company_website_url').map(key => {
          const config = FIELD_CONFIG[key];
          const setting = settings.find(s => s.key === key);
          const label = setting?.label || key;
          const description = setting?.description || '';

          return (
            <div key={key} className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor={key} className="text-sm font-medium">
                  {label} <span className="text-destructive">*</span>
                </Label>
                {hasChanges(key) && (
                  <Button size="sm" onClick={() => onSave(key)} disabled={saving === key} className="gap-1">
                    {saving === key ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                    Save
                  </Button>
                )}
              </div>
              {config.type === 'textarea' ? (
                <Textarea
                  id={key}
                  rows={config.rows}
                  value={editedValues[key] || ''}
                  onChange={(e) =>
                    setEditedValues(prev => ({ ...prev, [key]: e.target.value }))
                  }
                  placeholder={config.placeholder}
                  className="font-mono text-sm"
                />
              ) : (
                <Input
                  id={key}
                  value={editedValues[key] || ''}
                  onChange={(e) =>
                    setEditedValues(prev => ({ ...prev, [key]: e.target.value }))
                  }
                  placeholder={config.placeholder}
                  className="font-mono text-sm"
                />
              )}
              {description && (
                <p className="text-xs text-muted-foreground">{description}</p>
              )}
            </div>
          );
        })}

        {/* Save All button */}
        {anyChanges && (
          <div className="pt-4 border-t border-border/50">
            <Button onClick={handleSaveAll} disabled={!!saving} className="gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save All Changes
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
