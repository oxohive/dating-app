export interface TableColumn<T> {
  header: string;
  render: (row: T) => React.ReactNode;
  key: string;
}

export interface TableProps<T> {
  columns: Array<TableColumn<T>>;
  rows: T[];
  getRowKey: (row: T) => string;
  emptyMessage?: string;
}

/**
 * Shared primitive table used by user search results and the report queue.
 */
export function Table<T>({
  columns,
  rows,
  getRowKey,
  emptyMessage = "No data to display.",
}: TableProps<T>) {
  if (rows.length === 0) {
    return <p>{emptyMessage}</p>;
  }

  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr>
          {columns.map((column) => (
            <th
              key={column.key}
              style={{ textAlign: "left", borderBottom: "1px solid #d1d5db", padding: 8 }}
            >
              {column.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={getRowKey(row)}>
            {columns.map((column) => (
              <td key={column.key} style={{ borderBottom: "1px solid #f3f4f6", padding: 8 }}>
                {column.render(row)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
