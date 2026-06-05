import type { GroupRow, MissingnessRow } from "../types";
import { formatCompact, formatInteger, formatPercent } from "../lib/format";

type DataTableProps =
  | {
      kind: "group";
      rows: GroupRow[];
      columns?: never;
    }
  | {
      kind: "missingness";
      rows: MissingnessRow[];
      columns?: never;
    };

export function DataTable(props: DataTableProps) {
  if (props.kind === "missingness") {
    return (
      <div className="table-frame">
        <table>
          <thead>
            <tr>
              <th>Colonne</th>
              <th>Manquants</th>
              <th>Taux</th>
            </tr>
          </thead>
          <tbody>
            {props.rows.map((row) => (
              <tr key={row.column}>
                <td>{row.column}</td>
                <td>{formatInteger(row.missing)}</td>
                <td>{formatPercent(row.missing_pct)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="table-frame">
      <table>
        <thead>
          <tr>
            <th>Segment</th>
            <th>Transactions</th>
            <th>Fraudes</th>
            <th>Taux</th>
          </tr>
        </thead>
        <tbody>
          {props.rows.map((row) => (
            <tr key={row.value}>
              <td>{row.value}</td>
              <td>{formatCompact(row.count)}</td>
              <td>{formatCompact(row.fraud_count)}</td>
              <td>{formatPercent(row.fraud_rate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
