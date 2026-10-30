'use client';

import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Mail,
  Shield,
  Building,
  Clock,
  Trash2,
  CheckCircle,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { Sidebar } from '../../../components/layout/sidebar';
import { Topbar } from '../../../components/layout/topbar';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { inviteMemberAction } from '../../actions/auth';

export default function MembersSettingsPage() {
  const [email, setEmail] = useState('');
  const [roleCode, setRoleCode] = useState('agent');
  const [branchId, setBranchId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Sample pending invitations state
  const [invitations, setInvitations] = useState([
    {
      id: 'inv_1',
      email: 'claire.vance@brokerage.com',
      role: 'Senior Agent',
      branch: 'Downtown Manhattan Flagship',
      status: 'pending',
      expiresIn: '6 days remaining',
    },
    {
      id: 'inv_2',
      email: 'marcus.ross@brokerage.com',
      role: 'Agent',
      branch: 'Brooklyn Heights Office',
      status: 'pending',
      expiresIn: '5 days remaining',
    },
  ]);

  // Sample active members state
  const members = [
    {
      id: 'mem_1',
      name: 'Alex Morgan',
      email: 'alex@apexrealty.com',
      role: 'Organization Owner',
      branch: 'Headquarters',
      status: 'active',
      joinedAt: 'Aug 2026',
    },
    {
      id: 'mem_2',
      name: 'Victoria Sterling',
      email: 'victoria@apexrealty.com',
      role: 'Branch Manager',
      branch: 'Downtown Manhattan Flagship',
      status: 'active',
      joinedAt: 'Sep 2026',
    },
    {
      id: 'mem_3',
      name: 'Julian Ross',
      email: 'julian@apexrealty.com',
      role: 'Team Lead',
      branch: 'Brooklyn Heights Office',
      status: 'active',
      joinedAt: 'Sep 2026',
    },
  ];

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setFeedback(null);

    const formData = new FormData();
    formData.append('email', email);
    formData.append('roleCode', roleCode);
    if (branchId) formData.append('branchId', branchId);

    try {
      const res = await inviteMemberAction(formData);
      if (!res.success) {
        setFeedback({ type: 'error', message: res.error || 'Failed to dispatch invitation.' });
        setIsLoading(false);
        return;
      }

      setFeedback({
        type: 'success',
        message: `Cryptographic invitation dispatched to ${email}. Token hash logged in database.`,
      });

      setInvitations([
        {
          id: `inv_${Date.now()}`,
          email,
          role: roleCode.replace('_', ' '),
          branch: branchId ? 'Selected Branch' : 'All Branches',
          status: 'pending',
          expiresIn: '7 days remaining',
        },
        ...invitations,
      ]);

      setEmail('');
      setIsLoading(false);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'An error occurred.',
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />

      <div className="flex-1 pl-64 flex flex-col min-w-0">
        <Topbar />
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Team & Organization Memberships
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage your agency team, invite licensed agents, and assign branch access.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="purple" size="sm">
                15 Seats Available
              </Badge>
            </div>
          </div>

          {feedback && (
            <div
              className={`p-3.5 rounded-lg border text-xs flex items-center gap-2.5 ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Active Members & Pending Invites */}
            <div className="lg:col-span-2 space-y-6">
              {/* Active Members Table */}
              <Card>
                <CardHeader className="py-4 flex items-center justify-between">
                  <div>
                    <CardTitle>Active Organization Members</CardTitle>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Members verified through PostgreSQL Row-Level Security
                    </p>
                  </div>
                  <Badge variant="success" size="sm">
                    {members.length} Active
                  </Badge>
                </CardHeader>
                <CardContent className="p-0">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-500">
                        <th className="py-2.5 px-4 font-semibold">User</th>
                        <th className="py-2.5 px-4 font-semibold">Role</th>
                        <th className="py-2.5 px-4 font-semibold">Branch</th>
                        <th className="py-2.5 px-4 font-semibold">Status</th>
                        <th className="py-2.5 px-4 font-semibold text-right">Joined</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {members.map((m) => (
                        <tr key={m.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4">
                            <p className="font-semibold text-slate-900">{m.name}</p>
                            <p className="text-slate-400 text-[11px]">{m.email}</p>
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-700">
                            {m.role}
                          </td>
                          <td className="py-3 px-4 text-slate-500">{m.branch}</td>
                          <td className="py-3 px-4">
                            <Badge variant="success" size="sm">
                              {m.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right text-slate-400 text-[11px]">
                            {m.joinedAt}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>

              {/* Pending Invitations */}
              <Card>
                <CardHeader className="py-4 flex items-center justify-between">
                  <div>
                    <CardTitle>Pending Invitations</CardTitle>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Cryptographically hashed tokens awaiting user acceptance
                    </p>
                  </div>
                  <Badge variant="default" size="sm">
                    {invitations.length} Pending
                  </Badge>
                </CardHeader>
                <CardContent className="p-0 divide-y divide-slate-100 text-xs">
                  {invitations.length === 0 ? (
                    <div className="p-6 text-center text-slate-400">
                      No pending invitations. Use the form on the right to invite new team members.
                    </div>
                  ) : (
                    invitations.map((inv) => (
                      <div
                        key={inv.id}
                        className="p-4 flex items-center justify-between hover:bg-slate-50/60 transition-colors"
                      >
                        <div className="space-y-0.5">
                          <p className="font-semibold text-slate-900">{inv.email}</p>
                          <p className="text-slate-500 text-[11px]">
                            Role: <span className="font-medium text-slate-700">{inv.role}</span> · {inv.branch}
                          </p>
                          <p className="text-[10px] text-amber-600 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {inv.expiresIn}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                          onClick={() => {
                            setInvitations(invitations.filter((i) => i.id !== inv.id));
                          }}
                        >
                          Revoke
                        </Button>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right 1 Col: Invite Team Member Form */}
            <div>
              <Card>
                <CardHeader className="py-4">
                  <div className="flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-brand-600" />
                    <CardTitle>Invite New Member</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <form className="space-y-4 text-xs" onSubmit={handleInvite}>
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">
                        Member Email Address
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="agent@brokerage.com"
                        className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                      />
                    </div>

                    <div>
                      <label className="block font-medium text-slate-700 mb-1">
                        Assigned Role
                      </label>
                      <select
                        value={roleCode}
                        onChange={(e) => setRoleCode(e.target.value)}
                        className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none"
                      >
                        <option value="org_admin">Organization Administrator</option>
                        <option value="branch_manager">Branch Manager</option>
                        <option value="team_lead">Team Lead</option>
                        <option value="senior_agent">Senior Real Estate Agent</option>
                        <option value="agent">Real Estate Agent</option>
                        <option value="support_staff">Support Staff / Assistant</option>
                      </select>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Determines RBAC capabilities and AI tool access.
                      </p>
                    </div>

                    <div>
                      <label className="block font-medium text-slate-700 mb-1">
                        Branch Office (Optional)
                      </label>
                      <select
                        value={branchId}
                        onChange={(e) => setBranchId(e.target.value)}
                        className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none"
                      >
                        <option value="">All Branches / Headquarters</option>
                        <option value="branch_1">Downtown Manhattan Flagship</option>
                        <option value="branch_2">Brooklyn Heights Office</option>
                      </select>
                    </div>

                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      className="w-full text-xs py-2 bg-brand-600 hover:bg-brand-500"
                      isLoading={isLoading}
                    >
                      Dispatch Cryptographic Invite
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
