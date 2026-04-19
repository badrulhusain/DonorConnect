import React, { useState } from 'react';
import EventForm from '../components/notifications/EventForm';
import ProgrammeForm from '../components/notifications/ProgrammeForm';
import NotificationHistory from '../components/notifications/NotificationHistory';

const TABS = [
  { id: 'event', label: 'Send Event Invitation' },
  { id: 'programme', label: 'Send Programme Invitation' },
  { id: 'history', label: 'Notification History' },
];

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState('event');

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
        <p className="text-sm text-gray-500 mt-1">Send WhatsApp notifications via Gupshup</p>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex gap-1 -mb-px">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-green-600 text-green-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        {activeTab === 'event' && <EventForm />}
        {activeTab === 'programme' && <ProgrammeForm />}
        {activeTab === 'history' && <NotificationHistory />}
      </div>
    </div>
  );
}
