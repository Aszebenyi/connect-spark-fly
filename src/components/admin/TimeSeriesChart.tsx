import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { format, parseISO } from 'date-fns';

interface TimeSeriesChartProps {
  data: Array<{ date: string; count: number }>;
  color?: string;
  title?: string;
  gradientId?: string;
}

export function TimeSeriesChart({
  data,
  color = 'hsl(217, 91%, 60%)',
  title,
  gradientId = 'colorValue',
}: TimeSeriesChartProps) {
  const formattedData = data.map((item) => ({
    ...item,
    formattedDate: format(parseISO(item.date), 'MMM d'),
  }));

  const maxValue = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="h-[250px] w-full">
      {title && (
        <h3 className="mb-2 text-sm font-medium text-muted-foreground">{title}</h3>
      )}
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={formattedData}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="formattedDate"
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={{ stroke: 'hsl(var(--border))' }}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={{ stroke: 'hsl(var(--border))' }}
            domain={[0, maxValue + Math.ceil(maxValue * 0.1)]}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            labelStyle={{ color: 'hsl(var(--foreground))' }}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke={color}
            strokeWidth={2}
            fillOpacity={1}
            fill={`url(#${gradientId})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
