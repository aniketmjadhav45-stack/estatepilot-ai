import React from 'react';
import {
  Building2,
  Globe,
  DollarSign,
  Clock,
  Shield,
  Save,
  UserPlus,
  Trash2,
} from 'lucide-react';
import { Sidebar } from '../../../components/layout/sidebar';
import { Topbar } from '../../../components/layout/topbar';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';

export default function OrganizationSettingsPage() {
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
                Organization & Workspace Settings
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage your agency details, regional localization, branch offices, and team members.
              </p>
            </div>
            <Button variant="primary" size="sm" className="gap-1.5">
              <Save className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Form details */}
            <div className="lg:col-span-2 space-y-6">
              {/* General Settings */}
              <Card>
                <CardHeader className="py-4">
                  <CardTitle>Organization Profile</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">
                        Organization Name
                      </label>
                      <input
                        type="text"
                        defaultValue="Apex Premier Realty"
                        className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">
                        Workspace Slug
                      </label>
                      <input
                        type="text"
                        defaultValue="apex-premier"
                        className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 text-slate-500 font-mono"
                        disabled
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">
                        Organization Type
                      </label>
                      <select
                        defaultValue="agency"
                        className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none"
                      >
                        <option value="individual">Solo Agent (Individual)</option>
                        <option value="agency">Agency / Brokerage</option>
                        <option value="enterprise">Enterprise Multi-Branch</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-medium text-slate-700 mb-1">
                        Default Currency
                      </label>
                      <select
                        defaultValue="USD"
                        className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none"
                      >
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                        <option value="AED">AED (Dirham)</option>
                        <option value="INR">INR (₹)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-medium text-slate-700 mb-1">
                        Time Zone
                      </label>
                      <select
                        defaultValue="America/New_York"
                        className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none"
                      >
                        <option value="America/New_York">Eastern Time (US & Canada)</option>
                        <option value="America/Los_Angeles">Pacific Time (US & Canada)</option>
                        <option value="Europe/London">London (GMT)</option>
                        <option value="Asia/Dubai">Dubai (GST)</option>
                        <option value="Asia/Kolkata">India (IST)</option>
                      </select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Branch Offices */}
              <Card>
                <CardHeader className="py-4 flex items-center justify-between">
                  <div>
                    <CardTitle>Branch Offices</CardTitle>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Configure physical branches and operational regions
                    </p>
                  </div>
                  <Button variant="outline" size="sm" className="text-xs">
                    + Add Branch
                  </Button>
                </CardHeader>
                <CardContent className="p-0 divide-y divide-slate-100 text-xs">
                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">
                          Downtown Manhattan Flagship
                        </span>
                        <Badge variant="purple" size="sm">
                          Headquarters
                        </Badge>
                      </div>
                      <p className="text-slate-500 mt-0.5">
                        452 Fifth Avenue, 18th Floor, New York, NY 10018
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" className="text-xs text-slate-500">
                      Edit
                    </Button>
                  </div>

                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-900">
                        Brooklyn Heights Office
                      </span>
                      <p className="text-slate-500 mt-0.5">
                        120 Montague Street, Brooklyn, NY 11201
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" className="text-xs text-slate-500">
                      Edit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right 1 Col: Tenant Security & RLS summary */}
            <div className="space-y-6">
              <Card>
                <CardHeader className="py-4">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-600" />
                    <CardTitle>Tenant Isolation Guarantee</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-xs leading-relaxed text-slate-600">
                  <p>
                    All data in this workspace is cryptographically isolated under organization identifier:
                  </p>
                  <code className="block p-2 rounded bg-slate-100 text-[11px] font-mono text-slate-800 break-all">
                    org_4a91f582-8921-4f2e-a5e1-8849b28a8920
                  </code>
                  <p>
                    PostgreSQL Row-Level Security (RLS) is strictly enforced on all queries, contacts, listings, and messages.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
