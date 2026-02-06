import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface PlanDistributionChartProps {
  planCounts: {
    free: number;
    starter: number;
    growth: number;
    scale: number;
  };
}

const PLAN_COLORS = {
  free: 'hsl(var(--muted-foreground))',
  starter: 'hsl(217, 91%, 60%)',
  growth: 'hsl(262, 83%, 58%)',
  scale: 'hsl(142, 71%, 45%)',
};

const PLAN_LABELS = {
  free: 'Free',
  starter: 'Starter ($35/mo)',
  growth: 'Growth ($99/mo)',
  scale: 'Scale ($199/mo)',
};

export function PlanDistributionChart({ planCounts }: PlanDistributionChartProps) {
  const data = Object.entries(planCounts)
    .filter(([, count]) => count > 0)
    .map(([plan, count]) => ({
      name: PLAN_LABELS[plan as keyof typeof PLAN_LABELS],
      value: count,
      color: PLAN_COLORS[plan as keyof typeof PLAN_COLORS],
    }));

  if (data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-muted-foreground">
        No subscription data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
          dataKey="value"
          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
          labelLine={false}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
