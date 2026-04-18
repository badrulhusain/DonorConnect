import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { broadcastAPI } from '../services/api';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

const statusBadge = (status) => {
  const map = {
    sent: <span className="badge-sent">{status}</span>,
    failed: <span className="badge-failed">{status}</span>,
    pending: (
      <span className="badge-pending">
        <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />{status}
      </span>
    ),
  };
  return map[status] || <span className="badge-pending">{status}</span>;
};

const broadcastStatusBadge = (status) => {
  const map = {
    draft: <span className="badge-draft text-sm px-3 py-1">{status}</span>,
    sending: (
      <span className="badge-sending text-sm px-3 py-1">
        <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />{status}
      </span>
    ),
    completed: <span className="badge-completed text-sm px-3 py-1">{status}</span>,
    failed: <span className="badge-failed text-sm px-3 py-1">{status}</span>,
  };
  return map[status] || <span className="badge-draft text-sm px-3 py-1">{status}</span>;
};

export default function BroadcastLogsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [broadcast, setBroadcast] = useState(null);
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const intervalRef = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      const [bcRes, logsRes] = await Promise.all([
        broadcastAPI.getById(id),
        broadcastAPI.getLogs(id, { page, limit: 25, ...(statusFilter && { status: statusFilter }) }),
      ]);
      setBroadcast(bcRes.data.data);
      setLogs(logsRes.data.data);
      setPagination(logsRes.data.pagination);
    } catch {
      toast.error('Failed to load broadcast data');
    } finally {
      setLoading(false);
    }
  }, [id, page, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (broadcast?.status === 'sending') {
      intervalRef.current = setInterval(fetchData, 5000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [broadcast?.status, fetchData]);

  const total = broadcast?.totalRecipients || 1;
  const done = (broadcast?.stats.sent || 0) + (broadcast?.stats.failed || 0);
  const progressPct = Math.round((done / total) * 100);

  if (loading) {
    return (
      <div className="animate-pulse space-y-5">
        <div className="h-6 bg-gray-200 rounded w-32" />
        <div className="h-10 bg-gray-200 rounded w-64" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-gray-200 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!broadcast) return <p className="text-gray-500">Broadcast not found.</p>;

  return (
    <div className="space-y-5">
      <button onClick={() => navigate('/broadcasts')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">
        <ArrowLeftIcon className="w-4 h-4" />Broadcasts
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{broadcast.title}</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {broadcast.startedAt ? new Date(broadcast.startedAt).toLocaleString() : 'Not started'}
            {broadcast.completedAt ? ` → ${new Date(broadcast.completedAt).toLocaleString()}` : broadcast.status === 'sending' ? ' → In progress...' : ''}
          </p>
        </div>
        {broadcastStatusBadge(broadcast.status)}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-gray-800">{broadcast.totalRecipients}</p>
          <p className="text-xs text-gray-500 mt-1">Total</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{broadcast.stats.sent}</p>
          <p className="text-xs text-gray-500 mt-1">Sent</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-red-500">{broadcast.stats.failed}</p>
          <p className="text-xs text-gray-500 mt-1">Failed</p>
        </div>
        <div className="card p-4 text-center">
          <p className={`text-2xl font-bold ${broadcast.status === 'sending' ? 'text-yellow-600' : 'text-gray-400'}`}>
            {broadcast.stats.pending}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {broadcast.status === 'sending' ? (
              <span className="flex items-center justify-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />Pending
              </span>
            ) : 'Pending'}
          </p>
        </div>
      </div>

      {(broadcast.status === 'sending' || broadcast.status === 'completed') && (
        <div className="card p-4">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span>Progress</span>
            <span>{progressPct}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-green-500 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      <div className="card p-4 flex items-center gap-3">
        <select
          className="input-field w-auto"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
        >
          <option value="">All Statuses</option>
          <option value="sent">Sent</option>
          <option value="failed">Failed</option>
          <option value="pending">Pending</option>
        </select>
        <p className="text-sm text-gray-500">{pagination.total} log entries</p>
      </div>

      <div className="card overflow-hidden">
        {logs.length === 0 ? (
          <p className="text-center text-gray-400 py-12 text-sm">No log entries found</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Contact</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Phone</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Attempts</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Error</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Sent At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {logs.map((log) => (
                    <tr key={log._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">{log.contactName || log.contactId?.name || '—'}</td>
                      <td className="px-4 py-3 hidden sm:table-cell text-gray-500">{log.phone}</td>
                      <td className="px-4 py-3">{statusBadge(log.status)}</td>
                      <td className="px-4 py-3 hidden md:table-cell text-gray-500 text-center">{log.attempts}</td>
                      <td className="px-4 py-3 hidden lg:table-cell max-w-[200px]">
                        {log.errorMessage ? (
                          <span className="text-red-500 text-xs truncate block" title={log.errorMessage}>
                            {log.errorMessage}
                          </span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-gray-400 text-xs">
                        {log.sentAt ? new Date(log.sentAt).toLocaleString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination.pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-sm text-gray-500">Page {pagination.page} of {pagination.pages}</p>
                <div className="flex gap-2">
                  <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="btn-secondary py-1 px-3 text-xs disabled:opacity-40">Previous</button>
                  <button disabled={page >= pagination.pages} onClick={() => setPage(page + 1)} className="btn-secondary py-1 px-3 text-xs disabled:opacity-40">Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
