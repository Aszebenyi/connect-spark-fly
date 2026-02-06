import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface LeadStatusChartProps {
  statusCounts: {
    new: number;
    contacted: number;
    replied: number;
    qualified: number;
    converted: number;
  };
}

const STATUS_COLORS = {
  new: 'hsl(217, 91%, 60%)',
  contacted: 'hsl(280, 87%, 65%)',
  replied: 'hsl(45, 93%, 47%)',
  qualified: 'hsl(142, 71%, 45%)',
  converted: 'hsl(142, 76%, 36%)',
};

const STATUS_LABELS = {
  new: 'New',
  contacted: 'Contacted',
  replied: 'Replied',
  qualified: 'Qualified',
  converted: 'Converted',
};

export function LeadStatusChart({ statusCounts }: LeadStatusChartProps) {
  const data = Object.entries(statusCounts).map(([status, count]) => ({
    name: STATUS_LABELS[status as keyof typeof STATUS_LABELS],
    value: count,
    color: STATUS_COLORS[status as keyof typeof STATUS_COLORS],
  }));

  const totalLeads = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);

  if (totalLeads === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-muted-foreground">
        No lead data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          tickLine={false}
          axisLine={{ stroke: 'hsl(var(--border))' }}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          tickLine={false}
          axisLine={{ stroke: 'hsl(var(--border))' }}
          width={80}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            fontSize: '12px',
          }}
        />
        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
