import React from 'react';
import { cookies } from 'next/headers';
import { createServerClient, getContacts } from '@estatepilot/database';
import { ACTIVE_ORG_COOKIE } from '@estatepilot/auth';
import { ContactsView } from './contacts-view';

export const dynamic = 'force-dynamic';

export default async function ContactsPage() {
  const cookieStore = cookies();
  const token = cookieStore.get('sb-access-token')?.value || '';
  const activeOrgId = cookieStore.get(ACTIVE_ORG_COOKIE)?.value || 'org_apex_01';

  const client = createServerClient(token);
  const res = await getContacts(client, activeOrgId, { limit: 100 });

  const contacts = res.ok ? res.value.data : [];
  const total = res.ok ? res.value.total : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Contacts & Client Directory
            </h1>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              {total} Contacts
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Universal client directory for buyers, sellers, landlords, investors and partner brokers.
          </p>
        </div>
      </div>

      <ContactsView initialContacts={contacts} totalContacts={total} />
    </div>
  );
}
