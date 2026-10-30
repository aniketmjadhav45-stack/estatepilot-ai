'use client';

import React, { useState } from 'react';
import { User, Lock, Shield, CheckCircle, AlertCircle, Save } from 'lucide-react';
import { Sidebar } from '../../../components/layout/sidebar';
import { Topbar } from '../../../components/layout/topbar';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { resetPasswordAction } from '../../actions/auth';

export default function AccountSettingsPage() {
  const [firstName, setFirstName] = useState('Alex');
  const [lastName, setLastName] = useState('Morgan');
  const [email] = useState('alex@apexrealty.com');
  const [phone, setPhone] = useState('+1 (555) 234-5678');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingPassword(true);
    setFeedback(null);

    const formData = new FormData();
    formData.append('newPassword', newPassword);

    try {
      const res = await resetPasswordAction(formData);
      if (!res.success) {
        setFeedback({ type: 'error', message: res.error || 'Failed to update password.' });
        setIsUpdatingPassword(false);
        return;
      }

      setFeedback({ type: 'success', message: 'Password updated successfully.' });
      setCurrentPassword('');
      setNewPassword('');
      setIsUpdatingPassword(false);
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Error updating password.' });
      setIsUpdatingPassword(false);
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
                Personal Account & Security Settings
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage your profile identity, security credentials, and session state.
              </p>
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Profile Information */}
            <Card>
              <CardHeader className="py-4">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-brand-600" />
                  <CardTitle>Profile Details</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Primary Email
                  </label>
                  <input
                    type="email"
                    disabled
                    value={email}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Email address is tied to your Supabase authentication profile.
                  </p>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Direct Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>

                <div className="pt-2">
                  <Button variant="primary" size="sm" className="gap-1.5 text-xs">
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Profile</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Password & Security */}
            <Card>
              <CardHeader className="py-4">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-brand-600" />
                  <CardTitle>Change Password</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <form className="space-y-4 text-xs" onSubmit={handlePasswordUpdate}>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      Current Password
                    </label>
                    <input
                      type="password"
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 8 chars with upper, lower, number"
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </div>

                  <div className="pt-2">
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      className="w-full text-xs py-2 bg-brand-600 hover:bg-brand-500"
                      isLoading={isUpdatingPassword}
                    >
                      Update Password
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
