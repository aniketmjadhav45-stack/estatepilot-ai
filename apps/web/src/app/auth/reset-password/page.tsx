'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles, Lock, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { resetPasswordAction } from '../../actions/auth';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    const formData = new FormData();
    formData.append('newPassword', newPassword);

    try {
      const res = await resetPasswordAction(formData);
      if (!res.success) {
        setErrorMessage(res.error || 'Failed to update password.');
        setIsLoading(false);
        return;
      }
      setIsSuccess(true);
      setIsLoading(false);
      setTimeout(() => {
        router.push('/auth/login');
      }, 1500);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'An error occurred.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-2 mb-4">
          <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center text-white shadow-md">
            <Sparkles className="w-6 h-6" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">
            EstatePilot <span className="text-brand-400">AI</span>
          </span>
        </Link>
        <h2 className="text-2xl font-bold text-white tracking-tight">
          Set new password
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Enter your new strong password below to regain workspace access.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-navy-900 py-8 px-6 shadow-elevated rounded-xl border border-slate-800 sm:px-10">
          {isSuccess ? (
            <div className="text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-white">Password Updated</h3>
              <p className="text-xs text-slate-400">
                Your password has been reset successfully. Redirecting to login...
              </p>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              {errorMessage && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center gap-2.5 text-xs text-rose-300">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 8 chars, 1 uppercase, 1 lowercase, 1 number"
                    className="w-full text-xs pl-9 pr-3 py-2.5 rounded-lg border border-slate-700 bg-navy-950 text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className="w-full text-xs pl-9 pr-3 py-2.5 rounded-lg border border-slate-700 bg-navy-950 text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full text-xs py-2.5 mt-2 bg-brand-600 hover:bg-brand-500"
                isLoading={isLoading}
              >
                Update Password
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
