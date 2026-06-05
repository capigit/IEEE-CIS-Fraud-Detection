type MetricCardProps = {
  label: string;
  value: string;
  detail?: string;
  tone?: "teal" | "coral" | "amber" | "blue" | "green";
};

export function MetricCard({ label, value, detail, tone = "teal" }: MetricCardProps) {
  return (
    <article className={`metric-card metric-card--${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {detail ? <small>{detail}</small> : null}
    </article>
  );
}
