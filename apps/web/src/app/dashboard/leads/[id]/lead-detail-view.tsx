'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Phone,
  Mail,
  Calendar,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Plus,
  Send,
  UserCheck,
  Building,
  Tag,
  DollarSign,
  Compass,
  FileText,
  CheckSquare,
  History,
  Trash2,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { Lead, LeadStatus, LeadPriority, LEAD_STATUSES, CrmTaskStatus } from '@estatepilot/shared';
import {
  updateLeadStatusAction,
  createActivityNoteAction,
  createTaskAction,
  toggleTaskCompleteAction,
  assignLeadAction,
} from '../../../actions/crm';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../../../components/ui/card';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { Modal } from '../../../../components/ui/modal';
import { Input } from '../../../../components/ui/input';
import { Select } from '../../../../components/ui/select';

interface LeadDetailViewProps {
  lead: Lead;
}

export function LeadDetailView({ lead }: LeadDetailViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Active Tab
  const [activeTab, setActiveTab] = useState<'timeline' | 'tasks' | 'preferences' | 'details'>('timeline');

  // Stage change state
  const [currentStatus, setCurrentStatus] = useState<LeadStatus>(lead.status);

  // Note composer state
  const [noteContent, setNoteContent] = useState('');
  const [noteType, setNoteType] = useState<'note' | 'call_logged' | 'email_sent'>('note');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  // New Task Modal state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskType, setTaskType] = useState<'call' | 'follow_up' | 'visit' | 'email'>('follow_up');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);

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

  const handleStageSelect = async (newStatus: LeadStatus) => {
    setCurrentStatus(newStatus);
    startTransition(async () => {
      await updateLeadStatusAction(lead.id, newStatus, 'Status changed in Lead Detail view');
      router.refresh();
    });
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim()) return;

    setIsSubmittingNote(true);
    const title =
      noteType === 'call_logged'
        ? 'Inbound/Outbound Call Logged'
        : noteType === 'email_sent'
        ? 'Email Communication Sent'
        : 'Internal Team Note';

    const res = await createActivityNoteAction({
      leadId: lead.id,
      type: noteType,
      title,
      description: noteContent.trim(),
    });

    setIsSubmittingNote(false);
    if (res.success) {
      setNoteContent('');
      router.refresh();
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    setIsSubmittingTask(true);
    const res = await createTaskAction({
      leadId: lead.id,
      title: taskTitle.trim(),
      description: taskDescription.trim() || undefined,
      taskType,
      dueDate: taskDueDate || undefined,
      priority: lead.priority,
    });

    setIsSubmittingTask(false);
    if (res.success) {
      setIsTaskModalOpen(false);
      setTaskTitle('');
      setTaskDescription('');
      setTaskDueDate('');
      router.refresh();
    }
  };

  const handleToggleTask = async (taskId: string, currentTaskStatus: CrmTaskStatus) => {
    startTransition(async () => {
      await toggleTaskCompleteAction(taskId, currentTaskStatus);
      router.refresh();
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Back Navigation Bar */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link
          href="/dashboard/leads"
          className="hover:text-slate-900 flex items-center gap-1 font-medium transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Leads</span>
        </Link>
        <span>/</span>
        <span className="text-slate-900 font-semibold truncate">
          {lead.firstName} {lead.lastName}
        </span>
      </div>

      {/* Main Header Card */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-600 to-navy-900 flex items-center justify-center text-white text-base font-bold shadow-sm shrink-0">
            {lead.firstName[0]}
            {lead.lastName[0]}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                {lead.firstName} {lead.lastName}
              </h1>
              <Badge variant={stageBadgeVariant[currentStatus] || 'default'} size="md">
                {currentStatus.replace('_', ' ').toUpperCase()}
              </Badge>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                AI Score: {lead.qualificationScore}/100
              </span>
            </div>

            <p className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-3">
              {lead.email && (
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <a href={`mailto:${lead.email}`} className="hover:underline">
                    {lead.email}
                  </a>
                </span>
              )}
              {lead.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <a href={`tel:${lead.phone}`} className="hover:underline">
                    {lead.phone}
                  </a>
                </span>
              )}
              <span className="text-slate-400">
                Ingested {new Date(lead.createdAt).toLocaleDateString()}
              </span>
            </p>
          </div>
        </div>

        {/* Quick Stage Transition & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
            <span className="text-[11px] font-medium text-slate-500">Stage:</span>
            <select
              value={currentStatus}
              onChange={(e) => handleStageSelect(e.target.value as LeadStatus)}
              className="text-xs font-semibold bg-transparent text-slate-900 focus:outline-none cursor-pointer"
            >
              {LEAD_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st.replace('_', ' ').toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <Button
            size="sm"
            variant="primary"
            onClick={() => setIsTaskModalOpen(true)}
            className="gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Schedule Follow-up</span>
          </Button>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Tabs & Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tab Navigation */}
          <div className="flex items-center border-b border-slate-200 gap-6 text-xs font-medium">
            <button
              onClick={() => setActiveTab('timeline')}
              className={`pb-3 flex items-center gap-1.5 transition-colors relative ${
                activeTab === 'timeline'
                  ? 'text-brand-600 font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Activity & Notes</span>
              {activeTab === 'timeline' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-600 rounded-full" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('tasks')}
              className={`pb-3 flex items-center gap-1.5 transition-colors relative ${
                activeTab === 'tasks'
                  ? 'text-brand-600 font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <CheckSquare className="w-4 h-4" />
              <span>Tasks & Follow-ups</span>
              {lead.tasks && lead.tasks.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-700 font-bold">
                  {lead.tasks.filter((t) => t.status === 'pending').length}
                </span>
              )}
              {activeTab === 'tasks' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-600 rounded-full" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('preferences')}
              className={`pb-3 flex items-center gap-1.5 transition-colors relative ${
                activeTab === 'preferences'
                  ? 'text-brand-600 font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>Property Match Criteria</span>
              {activeTab === 'preferences' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-600 rounded-full" />
              )}
            </button>
          </div>

          {/* TAB CONTENT: TIMELINE */}
          {activeTab === 'timeline' && (
            <div className="space-y-6">
              {/* Note / Call / Email Composer Card */}
              <Card>
                <form onSubmit={handleAddNote} className="p-4 space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <button
                      type="button"
                      onClick={() => setNoteType('note')}
                      className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                        noteType === 'note'
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Team Note
                    </button>
                    <button
                      type="button"
                      onClick={() => setNoteType('call_logged')}
                      className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                        noteType === 'call_logged'
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Log Call
                    </button>
                    <button
                      type="button"
                      onClick={() => setNoteType('email_sent')}
                      className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                        noteType === 'email_sent'
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Log Email
                    </button>
                  </div>

                  <textarea
                    rows={3}
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder={
                      noteType === 'call_logged'
                        ? 'Summarize phone conversation with client...'
                        : noteType === 'email_sent'
                        ? 'Log client email communication...'
                        : 'Write an internal note or update about this lead...'
                    }
                    className="w-full text-xs p-3 rounded-lg border border-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-400">
                      Visible to authorized team members with leads:read access
                    </span>
                    <Button
                      type="submit"
                      size="sm"
                      variant="primary"
                      isLoading={isSubmittingNote}
                      disabled={!noteContent.trim()}
                      className="gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Post Update</span>
                    </Button>
                  </div>
                </form>
              </Card>

              {/* Activity Timeline List */}
              <div className="space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Chronological Timeline
                </h3>

                {!lead.recentActivities || lead.recentActivities.length === 0 ? (
                  <div className="p-8 text-center bg-white rounded-xl border border-slate-200/80 text-xs text-slate-400">
                    No activities recorded yet. Post a note above to record the first event.
                  </div>
                ) : (
                  <div className="space-y-3 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-200">
                    {lead.recentActivities.map((act) => (
                      <div
                        key={act.id}
                        className="relative flex items-start gap-3.5 bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-subtle ml-2"
                      >
                        <div className="w-6 h-6 rounded-full bg-brand-50 border border-brand-200 flex items-center justify-center shrink-0 text-brand-600 -ml-5 z-10">
                          {act.type === 'call_logged' ? (
                            <Phone className="w-3 h-3" />
                          ) : act.type === 'email_sent' ? (
                            <Mail className="w-3 h-3" />
                          ) : act.type === 'stage_moved' ? (
                            <Sparkles className="w-3 h-3" />
                          ) : (
                            <FileText className="w-3 h-3" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-slate-900">
                              {act.title}
                            </span>
                            <span className="text-[10px] text-slate-400 shrink-0">
                              {new Date(act.createdAt).toLocaleString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          {act.description && (
                            <p className="text-xs text-slate-600 mt-1 whitespace-pre-wrap">
                              {act.description}
                            </p>
                          )}
                          {act.createdBy && (
                            <p className="text-[10px] text-slate-400 mt-1.5">
                              by {act.createdBy.firstName} {act.createdBy.lastName}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB CONTENT: TASKS */}
          {activeTab === 'tasks' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Follow-ups & Action Items
                </h3>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsTaskModalOpen(true)}
                  className="gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Task</span>
                </Button>
              </div>

              {!lead.tasks || lead.tasks.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-xl border border-slate-200/80 text-xs text-slate-400">
                  No pending follow-ups or tasks for this prospect.
                </div>
              ) : (
                <div className="space-y-2">
                  {lead.tasks.map((task) => {
                    const isDone = task.status === 'completed';
                    return (
                      <div
                        key={task.id}
                        className={`flex items-start justify-between p-3.5 rounded-xl border transition-all ${
                          isDone
                            ? 'bg-slate-50/70 border-slate-200 opacity-60'
                            : 'bg-white border-slate-200 shadow-subtle hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <button
                            onClick={() => handleToggleTask(task.id, task.status)}
                            className={`w-4 h-4 mt-0.5 rounded border flex items-center justify-center transition-colors ${
                              isDone
                                ? 'bg-emerald-600 border-emerald-600 text-white'
                                : 'border-slate-300 hover:border-slate-400 bg-white'
                            }`}
                          >
                            {isDone && <CheckCircle2 className="w-3 h-3" />}
                          </button>

                          <div>
                            <p
                              className={`text-xs font-semibold text-slate-900 ${
                                isDone ? 'line-through text-slate-400' : ''
                              }`}
                            >
                              {task.title}
                            </p>
                            {task.description && (
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                {task.description}
                              </p>
                            )}
                            <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-400">
                              <span className="capitalize">{task.taskType.replace('_', ' ')}</span>
                              {task.dueDate && (
                                <span className="flex items-center gap-1 font-medium text-slate-600">
                                  <Clock className="w-3 h-3 text-slate-400" />
                                  Due {new Date(task.dueDate).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <Badge
                          variant={task.priority === 'urgent' ? 'danger' : 'default'}
                          size="sm"
                        >
                          {task.priority}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB CONTENT: PROPERTY PREFERENCES */}
          {activeTab === 'preferences' && (
            <Card className="p-5 space-y-4">
              <div>
                <CardTitle>Buyer Requirements Profile</CardTitle>
                <CardDescription>
                  Parsed search parameters used by Property Matching Agent
                </CardDescription>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs pt-2">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-[11px] font-medium text-slate-400 block">
                    Budget Bracket
                  </span>
                  <span className="text-sm font-bold text-slate-900 mt-1 block">
                    {lead.estimatedBudgetMin ? `$${lead.estimatedBudgetMin.toLocaleString()}` : '$0'} -{' '}
                    {lead.estimatedBudgetMax ? `$${lead.estimatedBudgetMax.toLocaleString()}` : 'No cap'}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-[11px] font-medium text-slate-400 block">
                    Target Currency
                  </span>
                  <span className="text-sm font-bold text-slate-900 mt-1 block">
                    {lead.currency}
                  </span>
                </div>
              </div>

              {lead.intentSummary && (
                <div className="p-3.5 rounded-lg bg-brand-50/50 border border-brand-100">
                  <span className="text-[11px] font-semibold text-brand-900 block">
                    AI Intent Summary
                  </span>
                  <p className="text-xs text-brand-800 mt-1 leading-relaxed">
                    {lead.intentSummary}
                  </p>
                </div>
              )}
            </Card>
          )}
        </div>

        {/* Right Sidebar (1 Col): AI Score, Contact Card, Assignment */}
        <div className="space-y-6">
          {/* AI Qualification Intelligence Card */}
          <Card className="border-brand-200/80 bg-gradient-to-b from-brand-50/30 to-white">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-600" />
                <CardTitle>Lead Intelligence</CardTitle>
              </div>
              <CardDescription>Automated qualification & urgency analysis</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-600">Qualification Score</span>
                <span className="text-base font-bold text-slate-900">
                  {lead.qualificationScore}/100
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-brand-600 h-2 rounded-full transition-all"
                  style={{ width: `${lead.qualificationScore}%` }}
                />
              </div>

              <div className="pt-2 text-[11px] text-slate-500 space-y-1">
                <div className="flex justify-between">
                  <span>Buying Intent:</span>
                  <span className="font-semibold text-slate-700">
                    {lead.qualificationScore >= 80
                      ? 'High Urgency'
                      : lead.qualificationScore >= 50
                      ? 'Medium Intent'
                      : 'Nurture'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Channel Attribution:</span>
                  <span className="font-semibold text-slate-700 capitalize">
                    {lead.source.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Details Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Prospect Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div>
                <span className="text-[11px] text-slate-400 block">Full Name</span>
                <span className="font-semibold text-slate-900">
                  {lead.firstName} {lead.lastName}
                </span>
              </div>

              {lead.email && (
                <div>
                  <span className="text-[11px] text-slate-400 block">Email Address</span>
                  <a href={`mailto:${lead.email}`} className="text-brand-600 hover:underline">
                    {lead.email}
                  </a>
                </div>
              )}

              {lead.phone && (
                <div>
                  <span className="text-[11px] text-slate-400 block">Phone</span>
                  <span className="text-slate-700 font-medium">{lead.phone}</span>
                </div>
              )}

              {lead.contact?.company && (
                <div>
                  <span className="text-[11px] text-slate-400 block">Company / Organization</span>
                  <span className="text-slate-700 font-medium">{lead.contact.company}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Metadata Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>System Record</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-[11px] text-slate-500">
              <div className="flex justify-between">
                <span>Record ID:</span>
                <span className="font-mono text-slate-700">{lead.id.slice(0, 8)}...</span>
              </div>
              <div className="flex justify-between">
                <span>Created:</span>
                <span className="text-slate-700">
                  {new Date(lead.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Last Updated:</span>
                <span className="text-slate-700">
                  {new Date(lead.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* SCHEDULE TASK MODAL */}
      <Modal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        title="Schedule Follow-up Task"
        description={`Set an action item for ${lead.firstName} ${lead.lastName}.`}
        maxWidth="md"
      >
        <form onSubmit={handleCreateTask} className="space-y-4">
          <Input
            label="Task Title"
            required
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
            placeholder="e.g. Call to discuss downtown penthouse availability"
          />

          <div className="grid grid-cols-2 gap-3.5">
            <Select
              label="Action Type"
              value={taskType}
              onChange={(e) => setTaskType(e.target.value as any)}
            >
              <option value="follow_up">Follow-up</option>
              <option value="call">Phone Call</option>
              <option value="visit">Site Viewing</option>
              <option value="email">Email</option>
            </Select>

            <Input
              label="Due Date"
              type="date"
              value={taskDueDate}
              onChange={(e) => setTaskDueDate(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-700">Instructions / Notes</label>
            <textarea
              rows={3}
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              placeholder="Provide context or instructions for this follow-up..."
              className="w-full text-xs p-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsTaskModalOpen(false)}
              disabled={isSubmittingTask}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmittingTask}>
              Save Task
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
