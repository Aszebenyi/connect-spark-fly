import { useState, useEffect } from 'react';
import DOMPurify from 'dompurify';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Search, Eye, RefreshCw, Mail, MailOpen, MousePointerClick, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface EmailLogEntry {
  id: string;
  user_id: string | null;
  template_id: string | null;
  recipient_email: string;
  recipient_name: string | null;
  subject: string;
  body_sent: string;
  status: string;
  sent_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  error_message: string | null;
  created_at: string;
  email_templates?: { name: string } | null;
}

interface EmailStats {
  total: number;
  sent: number;
  opened: number;
  clicked: number;
  failed: number;
}

export function EmailHistoryTable() {
  const [logs, setLogs] = useState<EmailLogEntry[]>([]);
  const [stats, setStats] = useState<EmailStats>({ total: 0, sent: 0, opened: 0, clicked: 0, failed: 0 });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedEmail, setSelectedEmail] = useState<EmailLogEntry | null>(null);

  useEffect(() => {
    fetchLogs();
  }, [statusFilter]);

  const fetchLogs = async () => {
    setLoading(true);
    
    let query = supabase
      .from('email_log')
      .select('*, email_templates(name)')
      .order('created_at', { ascending: false })
      .limit(100);

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching email logs:', error);
      toast.error('Failed to load email history');
    } else {
      setLogs(data || []);
      
      // Calculate stats
      const allLogs = data || [];
      setStats({
        total: allLogs.length,
        sent: allLogs.filter(l => l.status === 'sent').length,
        opened: allLogs.filter(l => l.opened_at).length,
        clicked: allLogs.filter(l => l.clicked_at).length,
        failed: allLogs.filter(l => l.status === 'failed').length,
      });
    }
    
    setLoading(false);
  };

  const filteredLogs = logs.filter(log => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      log.recipient_email.toLowerCase().includes(query) ||
      log.recipient_name?.toLowerCase().includes(query) ||
      log.subject.toLowerCase().includes(query)
    );
  });

  const getStatusBadge = (log: EmailLogEntry) => {
    if (log.clicked_at) {
      return <Badge className="bg-green-500">Clicked</Badge>;
    }
    if (log.opened_at) {
      return <Badge className="bg-blue-500">Opened</Badge>;
    }
    if (log.status === 'sent') {
      return <Badge variant="default">Sent</Badge>;
    }
    if (log.status === 'failed') {
      return <Badge variant="destructive">Failed</Badge>;
    }
    if (log.status === 'queued') {
      return <Badge variant="secondary">Queued</Badge>;
    }
    return <Badge variant="outline">{log.status}</Badge>;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
    } catch {
      return dateStr;
    }
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
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Sent</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <MailOpen className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{stats.opened}</p>
                <p className="text-xs text-muted-foreground">Opened</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <MousePointerClick className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{stats.clicked}</p>
                <p className="text-xs text-muted-foreground">Clicked</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <div className="text-lg">📈</div>
              <div>
                <p className="text-2xl font-bold">
                  {stats.sent > 0 ? Math.round((stats.opened / stats.sent) * 100) : 0}%
                </p>
                <p className="text-xs text-muted-foreground">Open Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <div>
                <p className="text-2xl font-bold">{stats.failed}</p>
                <p className="text-xs text-muted-foreground">Failed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by email or subject..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="queued">Queued</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={fetchLogs}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recipient</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map(log => (
                <TableRow key={log.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{log.recipient_name || 'Unknown'}</p>
                      <p className="text-sm text-muted-foreground">{log.recipient_email}</p>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {log.subject}
                  </TableCell>
                  <TableCell>
                    {log.email_templates?.name || '-'}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(log)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(log.sent_at || log.created_at)}
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => setSelectedEmail(log)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredLogs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No emails found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Email Detail Dialog */}
      <Dialog open={!!selectedEmail} onOpenChange={() => setSelectedEmail(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Email Details</DialogTitle>
          </DialogHeader>
          
          {selectedEmail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Recipient</p>
                  <p className="font-medium">{selectedEmail.recipient_name || 'Unknown'}</p>
                  <p className="text-muted-foreground">{selectedEmail.recipient_email}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <div className="mt-1">{getStatusBadge(selectedEmail)}</div>
                </div>
                <div>
                  <p className="text-muted-foreground">Sent At</p>
                  <p>{selectedEmail.sent_at ? new Date(selectedEmail.sent_at).toLocaleString() : 'Not sent'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Opened At</p>
                  <p>{selectedEmail.opened_at ? new Date(selectedEmail.opened_at).toLocaleString() : 'Not opened'}</p>
                </div>
                {selectedEmail.clicked_at && (
                  <div>
                    <p className="text-muted-foreground">Clicked At</p>
                    <p>{new Date(selectedEmail.clicked_at).toLocaleString()}</p>
                  </div>
                )}
                {selectedEmail.error_message && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Error</p>
                    <p className="text-destructive">{selectedEmail.error_message}</p>
                  </div>
                )}
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground mb-2">Subject</p>
                <p className="font-medium">{selectedEmail.subject}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Email Content</p>
                <div 
                  className="border rounded-lg p-4 bg-white max-h-[400px] overflow-y-auto"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(selectedEmail.body_sent) }}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
