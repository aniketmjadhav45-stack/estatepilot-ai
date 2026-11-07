import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * In-memory simulation of CRM multi-tenant storage engine
 * strictly replicating organization boundary enforcement.
 */
class MockCrmStore {
  constructor() {
    this.leads = [];
    this.contacts = [];
    this.tasks = [];
    this.activities = [];
  }

  insertLead(actingOrgId, lead) {
    if (!actingOrgId) throw new Error('TenantIsolationViolation: organizationId is required');
    const newLead = {
      ...lead,
      id: `lead_${this.leads.length + 1}`,
      organization_id: actingOrgId,
      status: lead.status || 'new',
      priority: lead.priority || 'medium',
      source: lead.source || 'website',
      qualification_score: lead.qualification_score || 50,
      estimated_budget_max: lead.estimated_budget_max || 0,
      deleted_at: null,
      created_at: new Date().toISOString(),
    };
    this.leads.push(newLead);
    return newLead;
  }

  getLeads(actingOrgId, filters = {}) {
    if (!actingOrgId) throw new Error('TenantIsolationViolation: actingOrgId is required');
    return this.leads.filter((l) => {
      if (l.organization_id !== actingOrgId) return false;
      if (l.deleted_at !== null) return false;
      if (filters.status && l.status !== filters.status) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const matchName = `${l.firstName} ${l.lastName}`.toLowerCase().includes(q);
        if (!matchName) return false;
      }
      return true;
    });
  }

  updateLeadStatus(actingOrgId, leadId, newStatus) {
    const lead = this.leads.find(
      (l) => l.id === leadId && l.organization_id === actingOrgId && l.deleted_at === null
    );
    if (!lead) throw new Error('LeadNotFoundOrUnauthorized');
    lead.status = newStatus;
    return lead;
  }

  deleteLead(actingOrgId, leadId) {
    const lead = this.leads.find(
      (l) => l.id === leadId && l.organization_id === actingOrgId && l.deleted_at === null
    );
    if (!lead) throw new Error('LeadNotFoundOrUnauthorized');
    lead.deleted_at = new Date().toISOString();
    return true;
  }

  insertTask(actingOrgId, task) {
    if (!actingOrgId) throw new Error('TenantIsolationViolation: organizationId is required');
    const newTask = {
      ...task,
      id: `task_${this.tasks.length + 1}`,
      organization_id: actingOrgId,
      status: task.status || 'pending',
      deleted_at: null,
      created_at: new Date().toISOString(),
    };
    this.tasks.push(newTask);
    return newTask;
  }

  getDashboardMetrics(actingOrgId) {
    const activeLeads = this.leads.filter(
      (l) => l.organization_id === actingOrgId && l.deleted_at === null
    );

    const totalLeads = activeLeads.length;
    const newLeads = activeLeads.filter((l) => l.status === 'new').length;
    const qualifiedLeads = activeLeads.filter((l) => l.status === 'qualified').length;
    const activeDeals = activeLeads.filter((l) => ['proposal', 'negotiation'].includes(l.status)).length;

    const followUpsDue = this.tasks.filter(
      (t) => t.organization_id === actingOrgId && t.status === 'pending' && t.deleted_at === null
    ).length;

    const stages = [
      'new',
      'contacted',
      'qualified',
      'proposal',
      'negotiation',
      'closed_won',
      'closed_lost',
      'unqualified',
    ];

    const pipelineOverview = stages.map((st) => {
      const match = activeLeads.filter((l) => l.status === st);
      const totalValue = match.reduce((sum, l) => sum + (l.estimated_budget_max || 0), 0);
      return {
        stage: st,
        count: match.length,
        totalValue,
        percentage: totalLeads > 0 ? Math.round((match.length / totalLeads) * 100) : 0,
      };
    });

    const sourceCounts = {};
    for (const l of activeLeads) {
      sourceCounts[l.source] = (sourceCounts[l.source] || 0) + 1;
    }

    const sourceBreakdown = Object.entries(sourceCounts).map(([src, count]) => ({
      source: src,
      count,
      percentage: totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0,
    }));

    return {
      totalLeads,
      newLeads,
      qualifiedLeads,
      activeDeals,
      followUpsDue,
      pipelineOverview,
      sourceBreakdown,
    };
  }
}

// ------------------------------------------------------------------------------
// Integration Tests: Tenant Isolation
// ------------------------------------------------------------------------------

test('CRM Tenant Isolation: Org A cannot read Org B leads', () => {
  const store = new MockCrmStore();
  const ORG_A = 'org_apex_01';
  const ORG_B = 'org_metro_02';

  store.insertLead(ORG_A, { firstName: 'Alice', lastName: 'Smith', status: 'new' });
  store.insertLead(ORG_B, { firstName: 'Bob', lastName: 'Jones', status: 'qualified' });

  const orgALeads = store.getLeads(ORG_A);
  assert.equal(orgALeads.length, 1);
  assert.equal(orgALeads[0].firstName, 'Alice');

  const leaked = orgALeads.some((l) => l.organization_id === ORG_B);
  assert.equal(leaked, false);
});

test('CRM Tenant Isolation: Org A cannot update or delete Org B leads', () => {
  const store = new MockCrmStore();
  const ORG_A = 'org_apex_01';
  const ORG_B = 'org_metro_02';

  const orgBLead = store.insertLead(ORG_B, { firstName: 'Secret', lastName: 'Client', status: 'new' });

  // Attempt to update Org B lead using Org A credentials
  assert.throws(
    () => store.updateLeadStatus(ORG_A, orgBLead.id, 'closed_won'),
    { message: 'LeadNotFoundOrUnauthorized' }
  );

  // Attempt to delete Org B lead using Org A credentials
  assert.throws(
    () => store.deleteLead(ORG_A, orgBLead.id),
    { message: 'LeadNotFoundOrUnauthorized' }
  );

  // Confirm Org B lead remains untouched
  const orgBLeads = store.getLeads(ORG_B);
  assert.equal(orgBLeads.length, 1);
  assert.equal(orgBLeads[0].status, 'new');
});

test('CRM Data Lifecycle: Soft-deleted leads are excluded from active list and metrics', () => {
  const store = new MockCrmStore();
  const ORG_A = 'org_apex_01';

  const lead1 = store.insertLead(ORG_A, { firstName: 'Active', lastName: 'One', status: 'new' });
  const lead2 = store.insertLead(ORG_A, { firstName: 'ToDelete', lastName: 'Two', status: 'new' });

  assert.equal(store.getLeads(ORG_A).length, 2);

  store.deleteLead(ORG_A, lead2.id);

  const remaining = store.getLeads(ORG_A);
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].id, lead1.id);

  const metrics = store.getDashboardMetrics(ORG_A);
  assert.equal(metrics.totalLeads, 1);
});

// ------------------------------------------------------------------------------
// Integration Tests: Real-time Dashboard Aggregations
// ------------------------------------------------------------------------------

test('CRM Dashboard: Accurately calculates real metrics from active records', () => {
  const store = new MockCrmStore();
  const ORG_A = 'org_apex_01';

  // Seed 4 leads with various statuses and sources
  store.insertLead(ORG_A, {
    firstName: 'Lead',
    lastName: 'New',
    status: 'new',
    source: 'website',
    estimated_budget_max: 500000,
  });

  store.insertLead(ORG_A, {
    firstName: 'Lead',
    lastName: 'Qualified',
    status: 'qualified',
    source: 'portal',
    estimated_budget_max: 1200000,
  });

  store.insertLead(ORG_A, {
    firstName: 'Lead',
    lastName: 'Negotiation',
    status: 'negotiation',
    source: 'referral',
    estimated_budget_max: 2000000,
  });

  store.insertLead(ORG_A, {
    firstName: 'Lead',
    lastName: 'Proposal',
    status: 'proposal',
    source: 'website',
    estimated_budget_max: 800000,
  });

  // Seed 2 tasks: 1 pending, 1 completed
  store.insertTask(ORG_A, { title: 'Call buyer', status: 'pending' });
  store.insertTask(ORG_A, { title: 'Sent email', status: 'completed' });

  const metrics = store.getDashboardMetrics(ORG_A);

  assert.equal(metrics.totalLeads, 4);
  assert.equal(metrics.newLeads, 1);
  assert.equal(metrics.qualifiedLeads, 1);
  assert.equal(metrics.activeDeals, 2); // negotiation + proposal
  assert.equal(metrics.followUpsDue, 1); // 1 pending task

  // Check pipeline overview
  const proposalStage = metrics.pipelineOverview.find((s) => s.stage === 'proposal');
  assert.equal(proposalStage.count, 1);
  assert.equal(proposalStage.totalValue, 800000);
  assert.equal(proposalStage.percentage, 25); // 1 of 4 = 25%

  // Check source breakdown
  const websiteSource = metrics.sourceBreakdown.find((s) => s.source === 'website');
  assert.equal(websiteSource.count, 2);
  assert.equal(websiteSource.percentage, 50); // 2 of 4 = 50%
});
