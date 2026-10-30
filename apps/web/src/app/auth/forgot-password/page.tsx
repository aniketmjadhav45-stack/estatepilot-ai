'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Sparkles, Mail, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { forgotPasswordAction } from '../../actions/auth';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    const formData = new FormData();
    formData.append('email', email);

    try {
      const res = await forgotPasswordAction(formData);
      if (!res.success) {
        setErrorMessage(res.error || 'Failed to send reset link.');
        setIsLoading(false);
        return;
      }
      setIsSuccess(true);
      setIsLoading(false);
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
          Reset your password
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Enter your registered email address to receive password reset instructions.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-navy-900 py-8 px-6 shadow-elevated rounded-xl border border-slate-800 sm:px-10">
          {isSuccess ? (
            <div className="text-center space-y-4">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-white">Recovery link dispatched</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                If an account exists with <strong className="text-white">{email}</strong>, a secure password recovery email has been sent.
              </p>
              <div className="pt-2">
                <Link href="/auth/login">
                  <Button variant="secondary" size="sm" className="w-full text-xs">
                    Return to Login
                  </Button>
                </Link>
              </div>
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
                  Business Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="agent@brokerage.com"
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
                Send Reset Link
              </Button>

              <div className="text-center pt-2">
                <Link
                  href="/auth/login"
                  className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to login</span>
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
