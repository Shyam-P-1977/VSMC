import React, { useState, useMemo } from 'react';
import { ArrowUpDown, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Input } from './Input';

export function DataTable({
  columns = [],
  data = [],
  keyField = 'id',
  searchable = true,
  searchPlaceholder = 'Search records...',
  pageSize = 10,
  emptyMessage = 'No records found',
  className = ''
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState(null);
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' | 'desc'
  const [currentPage, setCurrentPage] = useState(1);

  // Search filtering
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    const term = searchTerm.toLowerCase();
    return data.filter(item => {
      return columns.some(col => {
        const val = col.accessor ? (typeof col.accessor === 'function' ? col.accessor(item) : item[col.accessor]) : '';
        return String(val || '').toLowerCase().includes(term);
      });
    });
  }, [data, columns, searchTerm]);

  // Sorting
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    return [...filteredData].sort((a, b) => {
      const col = columns.find(c => c.accessor === sortKey || c.id === sortKey);
      let valA = col?.accessor ? (typeof col.accessor === 'function' ? col.accessor(a) : a[col.accessor]) : '';
      let valB = col?.accessor ? (typeof col.accessor === 'function' ? col.accessor(b) : b[col.accessor]) : '';

      if (valA === null || valA === undefined) valA = '';
      if (valB === null || valB === undefined) valB = '';

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }
      return sortOrder === 'asc'
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
  }, [filteredData, sortKey, sortOrder, columns]);

  // Pagination
  const totalPages = Math.ceil(sortedData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {searchable && (
        <div className="flex items-center justify-between gap-4">
          <div className="max-w-sm w-full">
            <Input
              icon={Search}
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Showing {filteredData.length} total entries
          </div>
        </div>
      )}

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-soft">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/80 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={col.id || col.accessor || idx}
                  className={`p-4 ${col.sortable ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/60 transition' : ''}`}
                  onClick={() => col.sortable && handleSort(col.accessor || col.id)}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{col.header}</span>
                    {col.sortable && (
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-10 text-slate-400">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((row, rowIdx) => (
                <tr
                  key={row[keyField] || rowIdx}
                  className="hover:bg-teal-50/50 dark:hover:bg-teal-950/20 transition-colors"
                >
                  {columns.map((col, colIdx) => (
                    <td key={col.id || colIdx} className="p-4 align-middle">
                      {col.cell ? col.cell(row) : (typeof col.accessor === 'function' ? col.accessor(row) : row[col.accessor])}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card Mode */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {paginatedData.length === 0 ? (
          <div className="text-center py-8 text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            {emptyMessage}
          </div>
        ) : (
          paginatedData.map((row, rowIdx) => (
            <div
              key={row[keyField] || rowIdx}
              className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-2.5"
            >
              {columns.map((col, colIdx) => (
                <div key={col.id || colIdx} className="flex items-start justify-between text-xs">
                  <span className="font-semibold text-slate-500 uppercase">
                    {col.header}
                  </span>
                  <div className="text-right">
                    {col.cell ? col.cell(row) : (typeof col.accessor === 'function' ? col.accessor(row) : row[col.accessor])}
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-slate-500 mt-2">
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
