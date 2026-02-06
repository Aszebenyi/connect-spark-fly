import { useState, useEffect } from 'react';
import DOMPurify from 'dompurify';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Edit, Eye, Trash2, Code } from 'lucide-react';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body_html: string;
  category: string;
  variables: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const VARIABLE_OPTIONS = [
  { name: 'user_name', description: 'User\'s name or email' },
  { name: 'credits_remaining', description: 'Remaining credits' },
  { name: 'credits_limit', description: 'Total credit limit' },
  { name: 'plan_name', description: 'Subscription plan name' },
  { name: 'dashboard_url', description: 'Link to dashboard' },
  { name: 'lead_count', description: 'Number of leads found' },
  { name: 'campaign_name', description: 'Campaign name' },
  { name: 'leads_this_week', description: 'Weekly lead count' },
  { name: 'emails_sent', description: 'Emails sent count' },
];

const CATEGORIES = [
  'welcome',
  'leads_found',
  'low_credits',
  'subscription_activated',
  'weekly_summary',
  'custom',
];

export function EmailTemplateEditor() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    body_html: '',
    category: 'custom',
    is_active: true,
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to load templates');
    } else {
      // Cast the data to ensure proper typing
      const typedTemplates = (data || []).map(t => ({
        ...t,
        variables: Array.isArray(t.variables) ? t.variables : []
      })) as EmailTemplate[];
      setTemplates(typedTemplates);
    }
    setLoading(false);
  };

  const handleEdit = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      subject: template.subject,
      body_html: template.body_html,
      category: template.category,
      is_active: template.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingTemplate(null);
    setFormData({
      name: '',
      subject: '',
      body_html: '',
      category: 'custom',
      is_active: true,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.subject || !formData.body_html) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Extract variables from the template
    const variableMatches = formData.body_html.match(/{{(\w+)}}/g) || [];
    const subjectMatches = formData.subject.match(/{{(\w+)}}/g) || [];
    const allMatches = [...variableMatches, ...subjectMatches];
    const variables = [...new Set(allMatches.map(m => m.replace(/{{|}}/g, '')))];

    if (editingTemplate) {
      // Update existing
      const { error } = await supabase
        .from('email_templates')
        .update({
          name: formData.name,
          subject: formData.subject,
          body_html: formData.body_html,
          category: formData.category,
          is_active: formData.is_active,
          variables,
        })
        .eq('id', editingTemplate.id);

      if (error) {
        toast.error('Failed to update template');
        console.error(error);
      } else {
        toast.success('Template updated successfully');
        setIsDialogOpen(false);
        fetchTemplates();
      }
    } else {
      // Create new
      const { error } = await supabase
        .from('email_templates')
        .insert({
          name: formData.name,
          subject: formData.subject,
          body_html: formData.body_html,
          category: formData.category,
          is_active: formData.is_active,
          variables,
        });

      if (error) {
        toast.error('Failed to create template');
        console.error(error);
      } else {
        toast.success('Template created successfully');
        setIsDialogOpen(false);
        fetchTemplates();
      }
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    const { error } = await supabase
      .from('email_templates')
      .delete()
      .eq('id', templateId);

    if (error) {
      toast.error('Failed to delete template');
      console.error(error);
    } else {
      toast.success('Template deleted');
      fetchTemplates();
    }
  };

  const toggleActive = async (template: EmailTemplate) => {
    const { error } = await supabase
      .from('email_templates')
      .update({ is_active: !template.is_active })
      .eq('id', template.id);

    if (error) {
      toast.error('Failed to update template');
    } else {
      fetchTemplates();
    }
  };

  const insertVariable = (variable: string) => {
    setFormData(prev => ({
      ...prev,
      body_html: prev.body_html + `{{${variable}}}`,
    }));
  };

  const previewTemplate = (template: EmailTemplate) => {
    // Replace variables with sample data
    let html = template.body_html;
    const sampleData: Record<string, string> = {
      user_name: 'John Doe',
      credits_remaining: '150',
      credits_limit: '250',
      plan_name: 'Starter',
      dashboard_url: 'https://example.com/dashboard',
      lead_count: '25',
      campaign_name: 'Tech Startups Q1',
      leads_this_week: '45',
      emails_sent: '12',
    };

    for (const [key, value] of Object.entries(sampleData)) {
      html = html.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }

    setPreviewHtml(html);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Email Templates</h3>
        <Button onClick={handleCreate} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

      <div className="grid gap-4">
        {templates.map(template => (
          <Card key={template.id} className="hover:bg-muted/50 transition-colors">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h4 className="font-medium">{template.name}</h4>
                    <Badge variant={template.is_active ? 'default' : 'secondary'}>
                      {template.category}
                    </Badge>
                    {!template.is_active && (
                      <Badge variant="outline" className="text-muted-foreground">
                        Inactive
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Subject: {template.subject.substring(0, 60)}...
                  </p>
                  <div className="flex gap-1 mt-2">
                    {template.variables.slice(0, 4).map(v => (
                      <Badge key={v} variant="outline" className="text-xs">
                        {`{{${v}}}`}
                      </Badge>
                    ))}
                    {template.variables.length > 4 && (
                      <Badge variant="outline" className="text-xs">
                        +{template.variables.length - 4} more
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={template.is_active}
                    onCheckedChange={() => toggleActive(template)}
                  />
                  <Button variant="ghost" size="icon" onClick={() => previewTemplate(template)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(template)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleDelete(template.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {templates.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No email templates yet. Create your first template to get started.
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit/Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Edit Template' : 'Create New Template'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Template Name</Label>
                <Input
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Welcome Email"
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={value => setFormData(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>
                        {cat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Subject Line</Label>
              <Input
                value={formData.subject}
                onChange={e => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="e.g., Welcome to LeadPulse, {{user_name}}!"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Email Body (HTML)</Label>
                <div className="flex gap-1">
                  {VARIABLE_OPTIONS.slice(0, 5).map(v => (
                    <Button
                      key={v.name}
                      variant="outline"
                      size="sm"
                      onClick={() => insertVariable(v.name)}
                      className="text-xs h-7"
                      title={v.description}
                    >
                      <Code className="h-3 w-3 mr-1" />
                      {v.name}
                    </Button>
                  ))}
                </div>
              </div>
              <Textarea
                value={formData.body_html}
                onChange={e => setFormData(prev => ({ ...prev, body_html: e.target.value }))}
                placeholder="<div>Your email HTML here...</div>"
                className="min-h-[300px] font-mono text-sm"
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={checked => setFormData(prev => ({ ...prev, is_active: checked }))}
              />
              <Label>Active</Label>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                {editingTemplate ? 'Update Template' : 'Create Template'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewHtml} onOpenChange={() => setPreviewHtml(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Email Preview</DialogTitle>
          </DialogHeader>
          <div 
            className="border rounded-lg p-4 bg-white"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(previewHtml || '') }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
