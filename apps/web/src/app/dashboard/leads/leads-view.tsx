'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  Filter,
  Plus,
  ArrowUpDown,
  Kanban,
  Table as TableIcon,
  ChevronRight,
  MoreVertical,
  CheckCircle2,
  Trash2,
  Phone,
  Mail,
  UserCheck,
  Building,
  Sparkles,
  ArrowUpRight,
  Tag,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { Lead, LeadStatus, LeadPriority, LEAD_STATUSES } from '@estatepilot/shared';
import {
  createLeadAction,
  updateLeadStatusAction,
  deleteLeadAction,
  assignLeadAction,
} from '../../actions/crm';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Modal } from '../../../components/ui/modal';
import { Input } from '../../../components/ui/input';
import { Select } from '../../../components/ui/select';
import { EmptyState } from '../../../components/ui/empty-state';

interface LeadsViewProps {
  initialLeads: Lead[];
  totalLeads: number;
  initialPage: number;
  totalPages: number;
}

export function LeadsView({
  initialLeads,
  totalLeads,
  initialPage,
  totalPages,
}: LeadsViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // View mode
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'created_at' | 'score' | 'budget'>('created_at');

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete modal state
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // New Lead Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    status: 'new' as LeadStatus,
    priority: 'medium' as LeadPriority,
    source: 'website',
    qualificationScore: 60,
    estimatedBudgetMin: '',
    estimatedBudgetMax: '',
    intentSummary: '',
    notes: '',
  });

  // Client-side filtering for fast responsive UI
  const filteredLeads = initialLeads.filter((lead) => {
    if (statusFilter !== 'all' && lead.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && lead.priority !== priorityFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = `${lead.firstName} ${lead.lastName}`.toLowerCase().includes(q);
      const matchEmail = (lead.email || '').toLowerCase().includes(q);
      const matchPhone = (lead.phone || '').includes(q);
      if (!matchName && !matchEmail && !matchPhone) return false;
    }
    return true;
  });

  // Sort
  const sortedLeads = [...filteredLeads].sort((a, b) => {
    if (sortBy === 'score') return b.qualificationScore - a.qualificationScore;
    if (sortBy === 'budget') return (b.estimatedBudgetMax || 0) - (a.estimatedBudgetMax || 0);
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const stageBadgeVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple'> = {
    new: 'info',
    contacted: 'default',
    qualified: 'purple',
    proposal: 'warning',
    negotiation: 'warning',
    closed_won: 'success',
    closed_lost: 'danger',
    unqualified: 'default',
  };

  const priorityBadgeVariant: Record<string, 'default' | 'success' | 'warning' | 'danger'> = {
    low: 'default',
    medium: 'default',
    high: 'warning',
    urgent: 'danger',
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setCreateError(null);

    const payload = {
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      email: formData.email.trim() || undefined,
      phone: formData.phone.trim() || undefined,
      status: formData.status,
      priority: formData.priority,
      source: formData.source,
      qualificationScore: Number(formData.qualificationScore) || 50,
      estimatedBudgetMin: formData.estimatedBudgetMin ? Number(formData.estimatedBudgetMin) : undefined,
      estimatedBudgetMax: formData.estimatedBudgetMax ? Number(formData.estimatedBudgetMax) : undefined,
      intentSummary: formData.intentSummary.trim() || undefined,
      notes: formData.notes.trim() || undefined,
    };

    const res = await createLeadAction(payload);
    setIsSubmitting(false);

    if (!res.success) {
      setCreateError(res.error || 'Failed to create lead');
      return;
    }

    setIsCreateOpen(false);
    // Reset form
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      status: 'new',
      priority: 'medium',
      source: 'website',
      qualificationScore: 60,
      estimatedBudgetMin: '',
      estimatedBudgetMax: '',
      intentSummary: '',
      notes: '',
    });
    router.refresh();
  };

  const handleStatusChange = async (leadId: string, newStatus: LeadStatus) => {
    startTransition(async () => {
      await updateLeadStatusAction(leadId, newStatus, 'Status changed from Pipeline view');
      router.refresh();
    });
  };

  const handleDeleteConfirm = async () => {
    if (!leadToDelete) return;
    setIsDeleting(true);
    const res = await deleteLeadAction(leadToDelete.id);
    setIsDeleting(false);

    if (res.success) {
      setLeadToDelete(null);
      router.refresh();
    }
  };

  return (
    <div className="space-y-6">
      {/* Control Bar: Search, Filters, View Modes, Create Button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5 bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-subtle">
        {/* Search & Filter inputs */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search leads by name, email, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:bg-white transition-all"
            />
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-2.5 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="all">All Stages</option>
            {LEAD_STATUSES.map((st) => (
              <option key={st} value={st}>
                {st.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </option>
            ))}
          </select>

          {/* Priority filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="text-xs px-2.5 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="text-xs px-2.5 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="created_at">Sort: Newest First</option>
            <option value="score">Sort: Highest Score</option>
            <option value="budget">Sort: Highest Budget</option>
          </select>
        </div>

        {/* View Switcher & Action Button */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          {/* Table / Kanban view toggles */}
          <div className="flex items-center p-0.5 rounded-lg bg-slate-100 border border-slate-200">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === 'table'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Table view"
            >
              <TableIcon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === 'kanban'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Pipeline board"
            >
              <Kanban className="w-3.5 h-3.5" />
            </button>
          </div>

          <Button size="sm" variant="primary" onClick={() => setIsCreateOpen(true)} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            <span>New Lead</span>
          </Button>
        </div>
      </div>

      {/* Main Content Area: Table View vs Kanban Board View */}
      {sortedLeads.length === 0 ? (
        <EmptyState
          icon={<Search className="w-6 h-6 text-slate-400" />}
          title="No leads match criteria"
          description={
            initialLeads.length === 0
              ? 'Your workspace directory is empty. Ingest or create your first lead.'
              : 'Try clearing your filters or search keywords to see matching leads.'
          }
          actionLabel={initialLeads.length === 0 ? 'Create First Lead' : 'Clear Filters'}
          onAction={
            initialLeads.length === 0
              ? () => setIsCreateOpen(true)
              : () => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setPriorityFilter('all');
                }
          }
        />
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Prospect</th>
                  <th className="py-3 px-3">Stage / Status</th>
                  <th className="py-3 px-3">Score</th>
                  <th className="py-3 px-3">Priority</th>
                  <th className="py-3 px-3">Budget Range</th>
                  <th className="py-3 px-3">Channel</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {sortedLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                  >
                    <td className="py-3.5 px-4">
                      <Link href={`/dashboard/leads/${lead.id}`} className="block">
                        <div className="font-semibold text-slate-900 hover:text-brand-600 transition-colors">
                          {lead.firstName} {lead.lastName}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          {lead.email && <span className="truncate">{lead.email}</span>}
                          {lead.phone && <span>{lead.phone}</span>}
                        </div>
                      </Link>
                    </td>

                    {/* Quick Stage Progression dropdown */}
                    <td className="py-3.5 px-3">
                      <select
                        value={lead.status}
                        onChange={(e) => handleStatusChange(lead.id, e.target.value as LeadStatus)}
                        className="text-[11px] font-medium py-1 px-2 rounded-full border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {LEAD_STATUSES.map((st) => (
                          <option key={st} value={st}>
                            {st.replace('_', ' ').toUpperCase()}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`font-semibold text-xs ${
                            lead.qualificationScore >= 80
                              ? 'text-emerald-600'
                              : lead.qualificationScore >= 50
                              ? 'text-brand-600'
                              : 'text-slate-500'
                          }`}
                        >
                          {lead.qualificationScore}
                        </span>
                        <div className="w-12 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-1.5 rounded-full ${
                              lead.qualificationScore >= 80
                                ? 'bg-emerald-500'
                                : lead.qualificationScore >= 50
                                ? 'bg-brand-500'
                                : 'bg-slate-400'
                            }`}
                            style={{ width: `${lead.qualificationScore}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-3">
                      <Badge variant={priorityBadgeVariant[lead.priority] || 'default'} size="sm">
                        {lead.priority}
                      </Badge>
                    </td>

                    <td className="py-3.5 px-3 text-slate-600 font-medium">
                      {lead.estimatedBudgetMax
                        ? `$${lead.estimatedBudgetMax.toLocaleString()}`
                        : 'Flexible'}
                    </td>

                    <td className="py-3.5 px-3 text-slate-500 capitalize">
                      {lead.source.replace('_', ' ')}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/dashboard/leads/${lead.id}`}
                          className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                          title="View Details"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => setLeadToDelete(lead)}
                          className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete Lead"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        /* KANBAN PIPELINE BOARD VIEW */
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-3.5 overflow-x-auto pb-4">
          {[
            { stage: 'new', label: 'New Inquiries', color: 'border-blue-400' },
            { stage: 'contacted', label: 'Contacted', color: 'border-slate-400' },
            { stage: 'qualified', label: 'Qualified', color: 'border-purple-400' },
            { stage: 'proposal', label: 'Proposal Sent', color: 'border-amber-400' },
            { stage: 'negotiation', label: 'Negotiation', color: 'border-amber-500' },
            { stage: 'closed_won', label: 'Closed Won', color: 'border-emerald-500' },
          ].map(({ stage, label, color }) => {
            const stageLeads = sortedLeads.filter((l) => l.status === stage);
            return (
              <div
                key={stage}
                className="flex flex-col bg-slate-100/70 rounded-xl border border-slate-200/80 p-3 min-w-[240px]"
              >
                {/* Column Header */}
                <div className={`flex items-center justify-between pb-2 mb-2 border-b-2 ${color}`}>
                  <span className="text-xs font-semibold text-slate-800">{label}</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-700">
                    {stageLeads.length}
                  </span>
                </div>

                {/* Cards in Column */}
                <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[600px] pr-1">
                  {stageLeads.length === 0 ? (
                    <div className="py-6 text-center text-[11px] text-slate-400">
                      Empty stage
                    </div>
                  ) : (
                    stageLeads.map((lead) => (
                      <Link
                        key={lead.id}
                        href={`/dashboard/leads/${lead.id}`}
                        className="block p-3 rounded-lg bg-white border border-slate-200/90 shadow-subtle hover:border-brand-400 hover:shadow-enterprise transition-all duration-150"
                      >
                        <div className="flex items-start justify-between gap-1">
                          <span className="text-xs font-semibold text-slate-900 leading-tight">
                            {lead.firstName} {lead.lastName}
                          </span>
                          <span className="text-[10px] font-bold text-brand-600 bg-brand-50 px-1 py-0.5 rounded">
                            {lead.qualificationScore}
                          </span>
                        </div>

                        {lead.intentSummary && (
                          <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                            {lead.intentSummary}
                          </p>
                        )}

                        <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-100">
                          <span className="font-semibold text-slate-700">
                            {lead.estimatedBudgetMax
                              ? `$${lead.estimatedBudgetMax.toLocaleString()}`
                              : 'Flexible'}
                          </span>
                          <Badge variant={priorityBadgeVariant[lead.priority] || 'default'} size="sm">
                            {lead.priority}
                          </Badge>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE LEAD MODAL */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Ingest New Prospect"
        description="Add a qualified buyer, seller, or tenant inquiry to the workspace."
        maxWidth="lg"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {createError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{createError}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3.5">
            <Input
              label="First Name"
              required
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              placeholder="e.g. Jordan"
            />
            <Input
              label="Last Name"
              required
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              placeholder="e.g. Sterling"
            />
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <Input
              label="Email Address"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="client@example.com"
            />
            <Input
              label="Phone Number"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+1 (555) 000-0000"
            />
          </div>

          <div className="grid grid-cols-3 gap-3.5">
            <Select
              label="Stage"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as LeadStatus })}
            >
              {LEAD_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st.replace('_', ' ').toUpperCase()}
                </option>
              ))}
            </Select>

            <Select
              label="Priority"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value as LeadPriority })}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </Select>

            <Select
              label="Inquiry Source"
              value={formData.source}
              onChange={(e) => setFormData({ ...formData, source: e.target.value })}
            >
              <option value="website">Direct Website</option>
              <option value="portal">Property Portal</option>
              <option value="referral">Referral</option>
              <option value="walk_in">Walk-in</option>
              <option value="phone">Inbound Phone</option>
              <option value="social">Social Media</option>
              <option value="ad">Digital Ad</option>
              <option value="other">Other</option>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <Input
              label="Estimated Budget ($ Max)"
              type="number"
              value={formData.estimatedBudgetMax}
              onChange={(e) => setFormData({ ...formData, estimatedBudgetMax: e.target.value })}
              placeholder="1200000"
            />
            <Input
              label="Qualification Score (0-100)"
              type="number"
              min="0"
              max="100"
              value={formData.qualificationScore}
              onChange={(e) => setFormData({ ...formData, qualificationScore: Number(e.target.value) })}
              placeholder="60"
            />
          </div>

          <Input
            label="Intent Summary"
            value={formData.intentSummary}
            onChange={(e) => setFormData({ ...formData, intentSummary: e.target.value })}
            placeholder="e.g. Seeking 3BHK penthouse with water view within $1.2M"
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-700">Initial Notes</label>
            <textarea
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Add relevant prospect requirements or notes..."
              className="w-full text-xs p-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCreateOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
              Ingest Lead
            </Button>
          </div>
        </form>
      </Modal>

      {/* CONFIRM DELETE MODAL */}
      <Modal
        isOpen={!!leadToDelete}
        onClose={() => setLeadToDelete(null)}
        title="Confirm Lead Removal"
        description="Are you sure you want to remove this lead record? This action will archive the contact timeline."
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Lead: <strong className="text-slate-900">{leadToDelete?.firstName} {leadToDelete?.lastName}</strong>
          </p>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setLeadToDelete(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={handleDeleteConfirm}
              isLoading={isDeleting}
            >
              Archive Record
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
