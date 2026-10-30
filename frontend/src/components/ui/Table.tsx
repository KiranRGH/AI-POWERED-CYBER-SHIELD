import React from 'react';

interface TableColumn<T> {
  header: string;
  accessor: keyof T | ((item: T) => React.ReactNode);
  className?: string;
}

interface TableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  keyExtractor: (item: T) => string | number;
  isLoading?: boolean;
  emptyMessage?: string;
}

export function Table<T>({ data, columns, keyExtractor, isLoading, emptyMessage = "No data available" }: TableProps<T>) {
  return (
    <div className="w-full overflow-auto rounded-md border border-gray-700 bg-gray-800">
      <table className="w-full text-sm text-left">
        <thead className="text-xs text-gray-400 uppercase bg-gray-900/50 border-b border-gray-700">
          <tr>
            {columns.map((col, i) => (
              <th key={i} className={`px-6 py-4 font-medium tracking-wider ${col.className || ''}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700">
          {isLoading ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-12 text-center text-gray-400">
                <div className="flex items-center justify-center space-x-2">
                  <span className="animate-spin h-5 w-5 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full"></span>
                  <span>Loading data...</span>
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-12 text-center text-gray-500">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((item) => (
              <tr key={keyExtractor(item)} className="hover:bg-gray-700/50 transition-colors">
                {columns.map((col, i) => (
                  <td key={i} className={`px-6 py-4 text-gray-300 ${col.className || ''}`}>
                    {typeof col.accessor === 'function' ? col.accessor(item) : (item[col.accessor] as React.ReactNode)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
