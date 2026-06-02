export default function ImportPreviewTable({ preview }) {
  if (!preview) return null
  return (
    <div className="overflow-x-auto rounded-xl border dark:border-gray-700 mt-3">
      <p className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800">
        Showing first {preview.rows.length} of {preview.total_rows} rows
      </p>
      <table className="w-full text-xs">
        <thead className="bg-gray-100 dark:bg-gray-800">
          <tr>
            {preview.headers.map((h) => (
              <th key={h} className="px-3 py-2 text-start font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y dark:divide-gray-700">
          {preview.rows.map((row, i) => (
            <tr key={i} className="dark:text-gray-300">
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-1.5 whitespace-nowrap">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
