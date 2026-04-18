import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { broadcastAPI, contactAPI } from '../services/api';
import {
  UserGroupIcon,
  MegaphoneIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';

const StatCard = ({ label, value, icon: Icon, color }) => (
  <div className="card p-6 flex items-center gap-4">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
      <Icon className="w-6 h-6" />
    </div>
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value ?? 0}</p>
    </div>
  </div>
);

const statusColors = {
  draft: 'badge-draft',
  sending: 'badge-sending',
  completed: 'badge-completed',
  failed: 'badge-failed',
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentBroadcasts, setRecentBroadcasts] = useState([]);
  const [totalContacts, setTotalContacts] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      broadcastAPI.getStats(),
      broadcastAPI.getAll({ limit: 5 }),
      contactAPI.getAll({ limit: 1 }),
    ])
      .then(([statsRes, broadcastsRes, contactsRes]) => {
        setStats(statsRes.data.data);
        setRecentBroadcasts(broadcastsRes.data.data);
        setTotalContacts(contactsRes.data.pagination?.total || 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-gray-200 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-0.5">WhatsApp bulk messaging overview</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Contacts"
          value={totalContacts}
          icon={UserGroupIcon}
          color="bg-blue-50 text-blue-600"
        />
        <StatCard
          label="Total Broadcasts"
          value={stats?.totalBroadcasts}
          icon={MegaphoneIcon}
          color="bg-purple-50 text-purple-600"
        />
        <StatCard
          label="Messages Sent"
          value={stats?.totalMessagesSent}
          icon={CheckCircleIcon}
          color="bg-green-50 text-green-600"
        />
        <StatCard
          label="Messages Failed"
          value={stats?.totalMessagesFailed}
          icon={XCircleIcon}
          color="bg-red-50 text-red-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-800">Recent Broadcasts</h2>
            <Link to="/broadcasts" className="text-sm text-green-600 hover:text-green-700 font-medium">
              View all →
            </Link>
          </div>
          {recentBroadcasts.length > 0 ? (
            <div className="divide-y divide-gray-50">
              {recentBroadcasts.map((b) => (
                <div key={b._id} className="flex items-center justify-between py-3">
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="text-sm font-medium text-gray-800 truncate">{b.title}</p>
                    <p className="text-xs text-gray-400">
                      {b.totalRecipients} recipients · {new Date(b.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={statusColors[b.status] || 'badge-draft'}>{b.status}</span>
                    <span className="text-xs text-gray-500">{b.stats.sent}/{b.stats.failed}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center py-8">No broadcasts yet</p>
          )}
        </div>

        <div className="card p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <button
              onClick={() => navigate('/contacts')}
              className="btn-secondary w-full justify-start"
            >
              <UserGroupIcon className="w-4 h-4" />
              Add Contacts
            </button>
            <button
              onClick={() => navigate('/broadcasts/new')}
              className="btn-primary w-full justify-start"
            >
              <PlusIcon className="w-4 h-4" />
              New Broadcast
            </button>
            <button
              onClick={() => navigate('/broadcasts')}
              className="btn-secondary w-full justify-start"
            >
              <MegaphoneIcon className="w-4 h-4" />
              View All Broadcasts
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
