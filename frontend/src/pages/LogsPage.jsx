import React, { useEffect, useState, useCallback } from 'react';
import { paymentAPI } from '../services/api';
import { CheckCircleIcon, XCircleIcon, ClockIcon } from '@heroicons/react/24/solid';
import { FunnelIcon } from '@heroicons/react/24/outline';

const StatusBadge = ({ status }) => {
  const map = {
    sent: { cls: 'badge-sent', icon: <CheckCircleIcon className="w-3 h-3" />, label: 'Sent' },
    failed: { cls: 'badge-failed', icon: <XCircleIcon className="w-3 h-3" />, label: 'Failed' },
    pending: { cls: 'badge-pending', icon: <ClockIcon className="w-3 h-3" />, label: 'Pending' },
  };
  const cfg = map[status] || map.pending;
  return <span className={cfg.cls}>{cfg.icon}{cfg.label}</span>;
};

const formatCurrency = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const formatDateTime = (d) =>
  new Date(d).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

export default function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async (page = 1, status = statusFilter) => {
    setLoading(true);
    try {
      const params = { page, limit: 25 };
      if (status) params.status = status;
      const { data } = await paymentAPI.getLogs(params);
      setLogs(data.data);
      setPagination(data.pagination);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchLogs(1, statusFilter); }, [statusFilter]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Message Logs</h1>
          <p className="text-gray-500 text-sm mt-0.5">{pagination.total} total messages</p>
        </div>
        <div className="flex items-center gap-2">
          <FunnelIcon className="w-4 h-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field py-1.5 text-sm w-36"
          >
            <option value="">All Status</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-4 py-3 text-left font-medium text-gray-500">Donor</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 hidden sm:table-cell">Phone</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Amount</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500 hidden md:table-cell">Attempts</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 hidden lg:table-cell">Error</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {!loading && logs.map((log) => (
                <tr key={log._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3.5 font-medium text-gray-800">
                    {log.donorId?.name || 'Unknown'}
                  </td>
                  <td className="px-4 py-3.5 text-gray-500 hidden sm:table-cell">
                    {log.donorId?.phone || '—'}
                  </td>
                  <td className="px-4 py-3.5 text-right font-semibold text-green-700">
                    {formatCurrency(log.amount)}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <StatusBadge status={log.status} />
                  </td>
                  <td className="px-4 py-3.5 text-center text-gray-500 hidden md:table-cell">
                    {log.attempts}
                  </td>
                  <td className="px-4 py-3.5 hidden lg:table-cell">
                    {log.errorMessage ? (
                      <span
                        className="text-xs text-red-500 max-w-xs block truncate"
                        title={log.errorMessage}
                      >
                        {log.errorMessage}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right text-xs text-gray-400 whitespace-nowrap">
                    {formatDateTime(log.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {loading && (
            <div className="p-8 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse h-10 bg-gray-100 rounded" />
              ))}
            </div>
          )}

          {!loading && logs.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <ClockIcon className="w-12 h-12 mx-auto text-gray-200" />
              <p className="mt-3 text-sm">No message logs found</p>
            </div>
          )}
        </div>

        {pagination.pages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">Page {pagination.page} of {pagination.pages}</p>
            <div className="flex gap-2">
              <button
                onClick={() => fetchLogs(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="btn-secondary py-1.5 px-3 text-xs"
              >
                Previous
              </button>
              <button
                onClick={() => fetchLogs(pagination.page + 1)}
                disabled={pagination.page === pagination.pages}
                className="btn-secondary py-1.5 px-3 text-xs"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
