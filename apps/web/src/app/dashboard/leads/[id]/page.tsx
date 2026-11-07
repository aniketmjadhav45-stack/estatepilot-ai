import React from 'react';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServerClient, getLeadById } from '@estatepilot/database';
import { ACTIVE_ORG_COOKIE } from '@estatepilot/auth';
import { LeadDetailView } from './lead-detail-view';

export const dynamic = 'force-dynamic';

export default async function LeadDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const cookieStore = cookies();
  const token = cookieStore.get('sb-access-token')?.value || '';
  const activeOrgId = cookieStore.get(ACTIVE_ORG_COOKIE)?.value || 'org_apex_01';

  const client = createServerClient(token);
  const res = await getLeadById(client, activeOrgId, params.id);

  if (!res.ok || !res.value) {
    notFound();
  }

  return <LeadDetailView lead={res.value} />;
}
