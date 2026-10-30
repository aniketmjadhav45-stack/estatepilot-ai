'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { registerAction } from '../../actions/auth';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [verificationRequired, setVerificationRequired] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    const payload = new FormData();
    payload.append('firstName', formData.firstName);
    payload.append('lastName', formData.lastName);
    payload.append('email', formData.email);
    payload.append('password', formData.password);

    try {
      const res = await registerAction(payload);
      if (!res.success) {
        setErrorMessage(res.error || 'Registration failed.');
        setIsLoading(false);
        return;
      }

      if (res.data?.requiresVerification) {
        setVerificationRequired(true);
        setIsLoading(false);
        return;
      }

      // Proceed to organization onboarding
      router.push('/onboarding');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'An error occurred during registration.');
      setIsLoading(false);
    }
  };

  if (verificationRequired) {
    return (
      <div className="min-h-screen bg-navy-950 flex flex-col justify-center py-12 px-6 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md bg-navy-900 p-8 rounded-xl border border-slate-800 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white">Check your email</h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            We have sent a verification link to <strong className="text-white">{formData.email}</strong>. Please confirm your email to complete workspace activation.
          </p>
          <div className="pt-2">
            <Link href="/auth/login">
              <Button variant="secondary" size="sm" className="w-full text-xs">
                Back to Sign In
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
          Create your account
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Start your 14-day free trial. No credit card required.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg px-4 sm:px-0">
        <div className="bg-navy-900 py-8 px-6 shadow-elevated rounded-xl border border-slate-800 sm:px-10">
          {errorMessage && (
            <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center gap-2.5 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="Alex"
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData({ ...formData, firstName: e.target.value })
                  }
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-700 bg-navy-950 text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="Morgan"
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData({ ...formData, lastName: e.target.value })
                  }
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-700 bg-navy-950 text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Business Email
              </label>
              <input
                type="email"
                required
                placeholder="alex@apexrealty.com"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-700 bg-navy-950 text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                placeholder="At least 8 chars, 1 uppercase, 1 lowercase, 1 number"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-700 bg-navy-950 text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full text-xs py-2.5 mt-2 bg-brand-600 hover:bg-brand-500"
              isLoading={isLoading}
            >
              Continue to Organization Setup
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-400">
            Already have an account?{' '}
            <Link
              href="/auth/login"
              className="text-brand-400 hover:text-brand-300 font-medium"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
