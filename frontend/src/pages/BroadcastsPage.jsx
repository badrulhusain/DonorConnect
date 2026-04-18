import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { broadcastAPI } from '../services/api';
import {
  PlusIcon,
  PlayIcon,
  EyeIcon,
  TrashIcon,
  MegaphoneIcon,
} from '@heroicons/react/24/outline';

const statusBadge = (status) => {
  const map = {
    draft: <span className="badge-draft">{status}</span>,
    sending: (
      <span className="badge-sending">
        <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
        {status}
      </span>
    ),
    completed: <span className="badge-completed">{status}</span>,
    failed: <span className="badge-failed">{status}</span>,
  };
  return map[status] || <span className="badge-draft">{status}</span>;
};

export default function BroadcastsPage() {
  const navigate = useNavigate();
  const [broadcasts, setBroadcasts] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const intervalRef = useRef(null);

  const fetchBroadcasts = useCallback(async () => {
    try {
      const params = { page, limit: 20 };
      if (statusFilter) params.status = statusFilter;
      const res = await broadcastAPI.getAll(params);
      setBroadcasts(res.data.data);
      setPagination(res.data.pagination);
    } catch {
      toast.error('Failed to load broadcasts');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchBroadcasts();
  }, [fetchBroadcasts]);

  useEffect(() => {
    const hasSending = broadcasts.some((b) => b.status === 'sending');
    if (hasSending) {
      intervalRef.current = setInterval(fetchBroadcasts, 5000);
    }
    return () => clearInterval(intervalRef.current);
  }, [broadcasts, fetchBroadcasts]);

  const handleSend = async (broadcast) => {
    if (!window.confirm(`Send to ${broadcast.totalRecipients} recipients?`)) return;
    try {
      await broadcastAPI.send(broadcast._id);
      toast.success('Broadcast started!');
      fetchBroadcasts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start broadcast');
    }
  };

  const handleDelete = async (broadcast) => {
    if (!window.confirm(`Delete "${broadcast.title}"?`)) return;
    try {
      await broadcastAPI.remove(broadcast._id);
      toast.success('Broadcast deleted');
      fetchBroadcasts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Broadcasts</h1>
          <p className="text-gray-500 text-sm mt-0.5">{pagination.total} broadcasts</p>
        </div>
        <button onClick={() => navigate('/broadcasts/new')} className="btn-primary">
          <PlusIcon className="w-4 h-4" />New Broadcast
        </button>
      </div>

      <div className="card p-4">
        <select
          className="input-field w-auto"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="sending">Sending</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        {!loading && broadcasts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <MegaphoneIcon className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-base font-medium">No broadcasts yet</p>
            <button onClick={() => navigate('/broadcasts/new')} className="btn-primary mt-4">
              <PlusIcon className="w-4 h-4" />Create your first broadcast
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Title</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Template</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Recipients</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Sent / Failed</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Created</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    [...Array(4)].map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        {[...Array(7)].map((__, j) => (
                          <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-200 rounded" /></td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    broadcasts.map((b) => (
                      <tr key={b._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900 max-w-[180px] truncate">{b.title}</p>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="text-gray-500 font-mono text-xs">{b.templateName}</span>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell text-gray-600">{b.totalRecipients}</td>
                        <td className="px-4 py-3">{statusBadge(b.status)}</td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <span className="text-green-600 font-medium">{b.stats.sent}</span>
                          <span className="text-gray-400"> / </span>
                          <span className="text-red-500">{b.stats.failed}</span>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell text-gray-400 text-xs">
                          {new Date(b.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {b.status === 'draft' && (
                              <button
                                onClick={() => handleSend(b)}
                                title="Send broadcast"
                                className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              >
                                <PlayIcon className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => navigate(`/broadcasts/${b._id}/logs`)}
                              title="View logs"
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <EyeIcon className="w-4 h-4" />
                            </button>
                            {b.status === 'draft' && (
                              <button
                                onClick={() => handleDelete(b)}
                                title="Delete broadcast"
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
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
