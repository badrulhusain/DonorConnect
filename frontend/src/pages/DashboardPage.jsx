import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { donorAPI } from '../services/api';
import {
  UsersIcon,
  CurrencyRupeeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline';

const StatCard = ({ label, value, icon: Icon, color }) => (
  <div className="card p-6 flex items-center gap-4">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
      <Icon className="w-6 h-6" />
    </div>
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  </div>
);

const formatCurrency = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    donorAPI.analytics()
      .then(({ data }) => setStats(data.data))
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">Overview of donor contributions</p>
        </div>
        <Link to="/donors" className="btn-primary">
          <UsersIcon className="w-4 h-4" />
          Manage Donors
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Donors"
          value={stats?.totalDonors ?? 0}
          icon={UsersIcon}
          color="bg-blue-50 text-blue-600"
        />
        <StatCard
          label="Total Contributions"
          value={formatCurrency(stats?.totalContributions)}
          icon={CurrencyRupeeIcon}
          color="bg-green-50 text-green-600"
        />
        <StatCard
          label="Messages Sent"
          value={stats?.messagesSent ?? 0}
          icon={CheckCircleIcon}
          color="bg-teal-50 text-teal-600"
        />
        <StatCard
          label="Messages Failed"
          value={stats?.messagesFailed ?? 0}
          icon={XCircleIcon}
          color="bg-red-50 text-red-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <ArrowTrendingUpIcon className="w-5 h-5 text-green-600" />
            <h2 className="text-base font-semibold text-gray-800">Recent Payments</h2>
          </div>
          {stats?.recentPayments?.length > 0 ? (
            <div className="divide-y divide-gray-50">
              {stats.recentPayments.map((p, i) => (
                <div key={i} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-green-700 font-semibold text-xs">
                        {p.name?.[0]?.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{p.name}</p>
                      <p className="text-xs text-gray-400">
                        {p.lastPaidAt ? new Date(p.lastPaidAt).toLocaleDateString('en-IN') : '—'}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-green-700">
                    {formatCurrency(p.lastPayment)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center py-8">No payments yet</p>
          )}
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <ChartBarIcon className="w-5 h-5 text-green-600" />
            <h2 className="text-base font-semibold text-gray-800">Summary</h2>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Average Contribution</span>
              <span className="text-sm font-bold text-gray-900">{formatCurrency(stats?.avgContribution)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Delivery Rate</span>
              <span className="text-sm font-bold text-gray-900">
                {stats?.messagesSent + stats?.messagesFailed > 0
                  ? `${Math.round((stats.messagesSent / (stats.messagesSent + stats.messagesFailed)) * 100)}%`
                  : '—'}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <span className="text-sm text-green-700 font-medium">Total Collected</span>
              <span className="text-sm font-bold text-green-800">{formatCurrency(stats?.totalContributions)}</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <Link to="/logs" className="text-sm text-green-600 hover:text-green-700 font-medium">
              View message logs →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
