import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { notificationAPI } from '../../services/api';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

const STATUS_BADGE = {
  sent: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  pending: 'bg-yellow-100 text-yellow-700',
};

const TYPE_BADGE = {
  payment: 'bg-blue-100 text-blue-700',
  event: 'bg-purple-100 text-purple-700',
  programme: 'bg-orange-100 text-orange-700',
};

const fmt = (iso) =>
  iso
    ? new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
    : '—';

export default function NotificationHistory() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(null);
  const [filters, setFilters] = useState({ type: '', status: '', from: '', to: '' });
  const [page, setPage] = useState(1);
  const LIMIT = 20;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (filters.type) params.type = filters.type;
      if (filters.status) params.status = filters.status;
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;
      const res = await notificationAPI.getLogs(params);
      setLogs(res.data.logs);
      setTotal(res.data.total);
    } catch (err) {
      toast.error(err.displayMessage || 'Failed to load logs');
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleFilterChange = (e) => {
    setFilters((f) => ({ ...f, [e.target.name]: e.target.value }));
    setPage(1);
  };

  const handleResend = async (id) => {
    setResending(id);
    try {
      await notificationAPI.resend(id);
      toast.success('Resent successfully');
      fetchLogs();
    } catch (err) {
      toast.error(err.displayMessage || 'Resend failed');
    } finally {
      setResending(null);
    }
  };

  const pages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Type</label>
          <select
            name="type"
            value={filters.type}
            onChange={handleFilterChange}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">All Types</option>
            <option value="payment">Payment</option>
            <option value="event">Event</option>
            <option value="programme">Programme</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Status</label>
          <select
            name="status"
            value={filters.status}
            onChange={handleFilterChange}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">All Statuses</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
            <option value="pending">Pending</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">From</label>
          <input
            type="date"
            name="from"
            value={filters.from}
            onChange={handleFilterChange}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">To</label>
          <input
            type="date"
            name="to"
            value={filters.to}
            onChange={handleFilterChange}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <button
          onClick={fetchLogs}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
        >
          <ArrowPathIcon className="w-4 h-4" />
          Refresh
        </button>
      </div>

      <p className="text-sm text-gray-500">{total} notification{total !== 1 ? 's' : ''} found</p>

      {loading ? (
        <div className="flex justify-center py-12">
          <span className="animate-spin h-8 w-8 border-4 border-green-600 border-t-transparent rounded-full" />
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">No notifications found</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Recipient</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Template</th>
                <th className="px-4 py-3 font-medium">Lang</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Sent At</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map((log) => (
                <tr key={log._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{log.recipientName}</p>
                    <p className="text-gray-400 text-xs">{log.recipient}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_BADGE[log.type] || 'bg-gray-100 text-gray-600'}`}>
                      {log.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs font-mono">{log.templateName}</td>
                  <td className="px-4 py-3 uppercase text-gray-500 text-xs">{log.language}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[log.status] || 'bg-gray-100 text-gray-600'}`}>
                      {log.status}
                    </span>
                    {log.errorMessage && (
                      <p className="text-xs text-red-500 mt-0.5 max-w-xs truncate" title={log.errorMessage}>
                        {log.errorMessage}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{fmt(log.sentAt || log.createdAt)}</td>
                  <td className="px-4 py-3">
                    {log.status === 'failed' && (
                      <button
                        onClick={() => handleResend(log._id)}
                        disabled={resending === log._id}
                        className="text-xs text-green-700 underline hover:text-green-900 disabled:opacity-50"
                      >
                        {resending === log._id ? 'Resending...' : 'Resend'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center gap-2 justify-end text-sm">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
          >
            Prev
          </button>
          <span className="text-gray-500">
            Page {page} of {pages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={page === pages}
            className="px-3 py-1.5 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
