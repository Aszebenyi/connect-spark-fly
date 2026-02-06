import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Zap, Clock } from 'lucide-react';

interface EmailTemplate {
  id: string;
  name: string;
  category: string;
}

interface EmailSequence {
  id: string;
  name: string;
  description: string | null;
  trigger_event: string;
  delay_minutes: number;
  template_id: string | null;
  is_active: boolean;
  created_at: string;
  email_templates?: EmailTemplate;
}

const TRIGGER_EVENTS = [
  { value: 'user_signup', label: 'User Signs Up', icon: '👋' },
  { value: 'leads_found', label: 'Leads Found', icon: '🎯' },
  { value: 'low_credits', label: 'Low Credits', icon: '⚠️' },
  { value: 'subscription_activated', label: 'Subscription Activated', icon: '🎊' },
  { value: 'weekly_summary', label: 'Weekly Summary', icon: '📊' },
];

export function EmailSequenceManager() {
  const [sequences, setSequences] = useState<EmailSequence[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSequence, setEditingSequence] = useState<EmailSequence | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    trigger_event: 'user_signup',
    delay_minutes: 0,
    template_id: '',
    is_active: true,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch sequences with templates
    const { data: seqData, error: seqError } = await supabase
      .from('email_sequences')
      .select('*, email_templates(id, name, category)')
      .order('created_at', { ascending: false });

    if (seqError) {
      console.error('Error fetching sequences:', seqError);
      toast.error('Failed to load sequences');
    } else {
      setSequences(seqData || []);
    }

    // Fetch all templates for dropdown
    const { data: tplData, error: tplError } = await supabase
      .from('email_templates')
      .select('id, name, category')
      .eq('is_active', true)
      .order('name');

    if (!tplError && tplData) {
      setTemplates(tplData);
    }

    setLoading(false);
  };

  const handleEdit = (sequence: EmailSequence) => {
    setEditingSequence(sequence);
    setFormData({
      name: sequence.name,
      description: sequence.description || '',
      trigger_event: sequence.trigger_event,
      delay_minutes: sequence.delay_minutes,
      template_id: sequence.template_id || '',
      is_active: sequence.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingSequence(null);
    setFormData({
      name: '',
      description: '',
      trigger_event: 'user_signup',
      delay_minutes: 0,
      template_id: '',
      is_active: true,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.trigger_event || !formData.template_id) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (editingSequence) {
      const { error } = await supabase
        .from('email_sequences')
        .update({
          name: formData.name,
          description: formData.description || null,
          trigger_event: formData.trigger_event,
          delay_minutes: formData.delay_minutes,
          template_id: formData.template_id,
          is_active: formData.is_active,
        })
        .eq('id', editingSequence.id);

      if (error) {
        toast.error('Failed to update sequence');
        console.error(error);
      } else {
        toast.success('Sequence updated successfully');
        setIsDialogOpen(false);
        fetchData();
      }
    } else {
      const { error } = await supabase
        .from('email_sequences')
        .insert({
          name: formData.name,
          description: formData.description || null,
          trigger_event: formData.trigger_event,
          delay_minutes: formData.delay_minutes,
          template_id: formData.template_id,
          is_active: formData.is_active,
        });

      if (error) {
        toast.error('Failed to create sequence');
        console.error(error);
      } else {
        toast.success('Sequence created successfully');
        setIsDialogOpen(false);
        fetchData();
      }
    }
  };

  const handleDelete = async (sequenceId: string) => {
    if (!confirm('Are you sure you want to delete this sequence?')) return;

    const { error } = await supabase
      .from('email_sequences')
      .delete()
      .eq('id', sequenceId);

    if (error) {
      toast.error('Failed to delete sequence');
      console.error(error);
    } else {
      toast.success('Sequence deleted');
      fetchData();
    }
  };

  const toggleActive = async (sequence: EmailSequence) => {
    const { error } = await supabase
      .from('email_sequences')
      .update({ is_active: !sequence.is_active })
      .eq('id', sequence.id);

    if (error) {
      toast.error('Failed to update sequence');
    } else {
      fetchData();
    }
  };

  const getTriggerInfo = (triggerEvent: string) => {
    return TRIGGER_EVENTS.find(t => t.value === triggerEvent) || { 
      value: triggerEvent, 
      label: triggerEvent, 
      icon: '📧' 
    };
  };

  const formatDelay = (minutes: number) => {
    if (minutes === 0) return 'Immediately';
    if (minutes < 60) return `${minutes} min`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)} hours`;
    return `${Math.floor(minutes / 1440)} days`;
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
        <h3 className="text-lg font-semibold">Email Sequences</h3>
        <Button onClick={handleCreate} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          New Sequence
        </Button>
      </div>

      <div className="grid gap-4">
        {sequences.map(sequence => {
          const trigger = getTriggerInfo(sequence.trigger_event);
          return (
            <Card key={sequence.id} className="hover:bg-muted/50 transition-colors">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{trigger.icon}</span>
                      <div>
                        <h4 className="font-medium">{sequence.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {sequence.description || 'No description'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-3 ml-9">
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Zap className="h-3 w-3" />
                        {trigger.label}
                      </Badge>
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDelay(sequence.delay_minutes)}
                      </Badge>
                      {sequence.email_templates && (
                        <Badge variant="secondary">
                          Template: {sequence.email_templates.name}
                        </Badge>
                      )}
                      {!sequence.is_active && (
                        <Badge variant="outline" className="text-muted-foreground">
                          Inactive
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={sequence.is_active}
                      onCheckedChange={() => toggleActive(sequence)}
                    />
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(sequence)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDelete(sequence.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {sequences.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No email sequences yet. Create your first automation to get started.
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit/Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingSequence ? 'Edit Sequence' : 'Create New Sequence'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Sequence Name *</Label>
              <Input
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Welcome Sequence"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="What does this sequence do?"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Trigger Event *</Label>
              <Select
                value={formData.trigger_event}
                onValueChange={value => setFormData(prev => ({ ...prev, trigger_event: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRIGGER_EVENTS.map(trigger => (
                    <SelectItem key={trigger.value} value={trigger.value}>
                      <span className="flex items-center gap-2">
                        <span>{trigger.icon}</span>
                        {trigger.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Email Template *</Label>
              <Select
                value={formData.template_id}
                onValueChange={value => setFormData(prev => ({ ...prev, template_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map(template => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name} ({template.category})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Delay (minutes)</Label>
              <Input
                type="number"
                min={0}
                value={formData.delay_minutes}
                onChange={e => setFormData(prev => ({ ...prev, delay_minutes: parseInt(e.target.value) || 0 }))}
                placeholder="0 = send immediately"
              />
              <p className="text-xs text-muted-foreground">
                0 = immediate, 60 = 1 hour, 1440 = 1 day
              </p>
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
                {editingSequence ? 'Update Sequence' : 'Create Sequence'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
