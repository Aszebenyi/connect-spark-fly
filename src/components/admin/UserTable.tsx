import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface User {
  id: string;
  email: string;
  fullName: string | null;
  company: string | null;
  createdAt: string;
  plan: string;
  status: string;
  creditsUsed: number;
  creditsLimit: number;
  leadCount: number;
  campaignCount: number;
}

interface UserTableProps {
  users: User[];
}

const planBadgeStyles: Record<string, string> = {
  free: 'bg-muted text-muted-foreground',
  starter: 'bg-blue-500/20 text-blue-600',
  growth: 'bg-purple-500/20 text-purple-600',
  scale: 'bg-emerald-500/20 text-emerald-600',
};

export function UserTable({ users }: UserTableProps) {
  if (users.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-muted-foreground">
        No users yet
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Plan</TableHead>
            <TableHead>Credits</TableHead>
            <TableHead>Leads</TableHead>
            <TableHead>Campaigns</TableHead>
            <TableHead>Signed Up</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <div>
                  <p className="font-medium">{user.fullName || 'No name'}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  {user.company && (
                    <p className="text-xs text-muted-foreground">{user.company}</p>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge
                  className={cn(
                    'capitalize',
                    planBadgeStyles[user.plan] || planBadgeStyles.free
                  )}
                >
                  {user.plan}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{user.creditsUsed}</span>
                  <span className="text-muted-foreground">/</span>
                  <span className="text-muted-foreground">{user.creditsLimit}</span>
                </div>
                <div className="mt-1 h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{
                      width: `${Math.min((user.creditsUsed / user.creditsLimit) * 100, 100)}%`,
                    }}
                  />
                </div>
              </TableCell>
              <TableCell>
                <span className="font-medium">{user.leadCount}</span>
              </TableCell>
              <TableCell>
                <span className="font-medium">{user.campaignCount}</span>
              </TableCell>
              <TableCell>
                <span className="text-sm text-muted-foreground">
                  {format(new Date(user.createdAt), 'MMM d, yyyy')}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
