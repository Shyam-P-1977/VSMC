import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  Inbox, Mail, Phone, Calendar, Clock,
  Search, MessageSquare, ExternalLink, RefreshCw
} from 'lucide-react';
import { DashboardLayout } from '../../app/layouts/DashboardLayout';
import {
  Card, Button, Badge, Skeleton
} from '../../shared/ui';
import { adminApi } from '../../api';

export function AdminMessages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedMsg, setSelectedMsg] = useState(null);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getContactMessages();
      setMessages(res.messages || []);
      if (res.messages?.length > 0 && !selectedMsg) {
        setSelectedMsg(res.messages[0]);
      }
    } catch {
      toast.error('Failed to load contact messages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const filteredMessages = messages.filter(m => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      m.Name?.toLowerCase().includes(q) ||
      m.Email?.toLowerCase().includes(q) ||
      m.Phone?.includes(q) ||
      m.Message?.toLowerCase().includes(q)
    );
  });

  return (
    <DashboardLayout
      title="Customer Inquiries & Messages"
      subtitle="Public landing page leads, feedback submissions, and roadside assistance queries"
    >
      <div className="space-y-6">
        {/* Top Search & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search messages by name, email, keyword..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-700"
            />
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="teal" className="text-sm px-3 py-1">
              {messages.length} Inquiries Received
            </Badge>
            <Button variant="ghost" size="sm" onClick={fetchMessages}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Two column Inbox layout */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
            </div>
            <div className="md:col-span-2">
              <Skeleton className="h-64 rounded-3xl" />
            </div>
          </div>
        ) : filteredMessages.length === 0 ? (
          <Card className="text-center py-12">
            <Inbox className="w-12 h-12 text-neutral-300 dark:text-neutral-700 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-neutral-800 dark:text-white">Inbox Clean</h3>
            <p className="text-sm text-neutral-500 mt-1">No customer contact submissions matching your search.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {/* Left Messages List */}
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {filteredMessages.map(msg => {
                const isSelected = selectedMsg?.ID === msg.ID;

                return (
                  <div
                    key={msg.ID}
                    onClick={() => setSelectedMsg(msg)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-teal-700 bg-teal-50/70 dark:bg-teal-950/40 shadow-sm'
                        : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-neutral-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm text-neutral-900 dark:text-white truncate">
                        {msg.Name}
                      </span>
                      <span className="text-[10px] text-neutral-400 font-mono">
                        {msg.Created_At?.split('T')[0] || msg.Created_At?.slice(0, 10)}
                      </span>
                    </div>
                    <div className="text-xs text-neutral-500 truncate mb-2">{msg.Email}</div>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-2">
                      {msg.Message}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Right Message Reader View */}
            <div className="md:col-span-2">
              {selectedMsg ? (
                <Card className="p-6 space-y-6">
                  {/* Sender Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-100 dark:border-neutral-800">
                    <div>
                      <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
                        {selectedMsg.Name}
                      </h2>
                      <div className="flex flex-wrap items-center gap-4 mt-1 text-xs text-neutral-500">
                        <span className="flex items-center gap-1 text-teal-700 dark:text-teal-400">
                          <Mail className="w-3.5 h-3.5" /> {selectedMsg.Email}
                        </span>
                        <span className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5" /> {selectedMsg.Phone}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> {selectedMsg.Created_At}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={`mailto:${selectedMsg.Email}?subject=Re: VSCMS Service Inquiry`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-900 text-white dark:bg-signal-yellow dark:text-neutral-900 text-xs font-bold hover:opacity-95"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        Reply Email
                      </a>
                      <a
                        href={`tel:${selectedMsg.Phone}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-bold hover:bg-neutral-200"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        Call
                      </a>
                    </div>
                  </div>

                  {/* Body Text */}
                  <div className="space-y-3">
                    <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                      Message Inquiry
                    </div>
                    <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-700 text-sm text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap leading-relaxed">
                      {selectedMsg.Message}
                    </div>
                  </div>
                </Card>
              ) : (
                <Card className="text-center py-16 text-neutral-400">
                  Select a message from the left to read full details.
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
