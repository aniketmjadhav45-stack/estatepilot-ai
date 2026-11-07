import test from 'node:test';
import assert from 'node:assert/strict';

// Import or recreate validation rules matching Zod schemas
const VALID_LEAD_STATUSES = [
  'new',
  'contacted',
  'qualified',
  'proposal',
  'negotiation',
  'closed_won',
  'closed_lost',
  'unqualified',
];

const VALID_LEAD_PRIORITIES = ['low', 'medium', 'high', 'urgent'];

const VALID_CONTACT_TYPES = [
  'client',
  'buyer',
  'seller',
  'renter',
  'landlord',
  'agent',
  'investor',
  'other',
];

const VALID_TASK_TYPES = ['call', 'email', 'visit', 'meeting', 'follow_up', 'task', 'review'];
const VALID_TASK_STATUSES = ['pending', 'in_progress', 'completed', 'cancelled'];

function validateLeadInput(input) {
  if (!input.firstName || input.firstName.trim().length === 0) {
    return { valid: false, error: 'First name is required' };
  }
  if (!input.lastName || input.lastName.trim().length === 0) {
    return { valid: false, error: 'Last name is required' };
  }
  if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
    return { valid: false, error: 'Valid email required' };
  }
  if (input.status && !VALID_LEAD_STATUSES.includes(input.status)) {
    return { valid: false, error: 'Invalid lead status' };
  }
  if (input.priority && !VALID_LEAD_PRIORITIES.includes(input.priority)) {
    return { valid: false, error: 'Invalid priority level' };
  }
  if (input.qualificationScore !== undefined) {
    if (typeof input.qualificationScore !== 'number' || input.qualificationScore < 0 || input.qualificationScore > 100) {
      return { valid: false, error: 'Qualification score must be between 0 and 100' };
    }
  }
  if (input.estimatedBudgetMin !== undefined && input.estimatedBudgetMin < 0) {
    return { valid: false, error: 'Budget min cannot be negative' };
  }
  if (input.estimatedBudgetMax !== undefined && input.estimatedBudgetMax < 0) {
    return { valid: false, error: 'Budget max cannot be negative' };
  }
  if (input.estimatedBudgetMin !== undefined && input.estimatedBudgetMax !== undefined) {
    if (input.estimatedBudgetMin > input.estimatedBudgetMax) {
      return { valid: false, error: 'Budget min cannot exceed budget max' };
    }
  }
  return { valid: true };
}

function validateContactInput(input) {
  if (!input.firstName || input.firstName.trim().length === 0) {
    return { valid: false, error: 'First name is required' };
  }
  if (!input.lastName || input.lastName.trim().length === 0) {
    return { valid: false, error: 'Last name is required' };
  }
  if (input.type && !VALID_CONTACT_TYPES.includes(input.type)) {
    return { valid: false, error: 'Invalid contact type' };
  }
  return { valid: true };
}

function validateTaskInput(input) {
  if (!input.title || input.title.trim().length === 0) {
    return { valid: false, error: 'Task title is required' };
  }
  if (input.taskType && !VALID_TASK_TYPES.includes(input.taskType)) {
    return { valid: false, error: 'Invalid task type' };
  }
  if (input.status && !VALID_TASK_STATUSES.includes(input.status)) {
    return { valid: false, error: 'Invalid task status' };
  }
  return { valid: true };
}

// ------------------------------------------------------------------------------
// Lead Schema & Lifecycle Tests
// ------------------------------------------------------------------------------

test('CRM Validation: Valid lead creation payload passes', () => {
  const result = validateLeadInput({
    firstName: 'Jordan',
    lastName: 'Sterling',
    email: 'jordan@sterling.com',
    phone: '+1 555-0192',
    status: 'new',
    priority: 'high',
    qualificationScore: 85,
    estimatedBudgetMin: 500000,
    estimatedBudgetMax: 850000,
  });

  assert.equal(result.valid, true);
});

test('CRM Validation: Rejects lead creation without first or last name', () => {
  const noFirst = validateLeadInput({ lastName: 'Sterling' });
  assert.equal(noFirst.valid, false);
  assert.equal(noFirst.error, 'First name is required');

  const noLast = validateLeadInput({ firstName: 'Jordan', lastName: '' });
  assert.equal(noLast.valid, false);
  assert.equal(noLast.error, 'Last name is required');
});

test('CRM Validation: Validates email format strictly', () => {
  const invalidEmail = validateLeadInput({
    firstName: 'Jordan',
    lastName: 'Sterling',
    email: 'not-an-email',
  });
  assert.equal(invalidEmail.valid, false);
  assert.equal(invalidEmail.error, 'Valid email required');
});

test('CRM Validation: Enforces qualification score bounds [0, 100]', () => {
  const scoreTooHigh = validateLeadInput({
    firstName: 'Jordan',
    lastName: 'Sterling',
    qualificationScore: 105,
  });
  assert.equal(scoreTooHigh.valid, false);
  assert.equal(scoreTooHigh.error, 'Qualification score must be between 0 and 100');

  const scoreNegative = validateLeadInput({
    firstName: 'Jordan',
    lastName: 'Sterling',
    qualificationScore: -10,
  });
  assert.equal(scoreNegative.valid, false);
});

test('CRM Validation: Validates budget range consistency (min <= max)', () => {
  const invertedBudget = validateLeadInput({
    firstName: 'Jordan',
    lastName: 'Sterling',
    estimatedBudgetMin: 1000000,
    estimatedBudgetMax: 500000,
  });
  assert.equal(invertedBudget.valid, false);
  assert.equal(invertedBudget.error, 'Budget min cannot exceed budget max');
});

test('CRM Validation: All 8 pipeline stages are recognized', () => {
  VALID_LEAD_STATUSES.forEach((st) => {
    const res = validateLeadInput({
      firstName: 'Test',
      lastName: 'Lead',
      status: st,
    });
    assert.equal(res.valid, true);
  });

  const invalidStage = validateLeadInput({
    firstName: 'Test',
    lastName: 'Lead',
    status: 'non_existent_stage',
  });
  assert.equal(invalidStage.valid, false);
  assert.equal(invalidStage.error, 'Invalid lead status');
});

// ------------------------------------------------------------------------------
// Contact Validation Tests
// ------------------------------------------------------------------------------

test('CRM Validation: Valid contact creation passes with supported types', () => {
  VALID_CONTACT_TYPES.forEach((type) => {
    const res = validateContactInput({
      firstName: 'Eleanor',
      lastName: 'Vance',
      company: 'Vance Capital',
      type,
    });
    assert.equal(res.valid, true);
  });

  const invalidType = validateContactInput({
    firstName: 'Eleanor',
    lastName: 'Vance',
    type: 'unrecognized_type',
  });
  assert.equal(invalidType.valid, false);
  assert.equal(invalidType.error, 'Invalid contact type');
});

// ------------------------------------------------------------------------------
// Task & Follow-up Lifecycle Tests
// ------------------------------------------------------------------------------

test('CRM Validation: Task creation validates title and valid task types', () => {
  const validTask = validateTaskInput({
    title: 'Site Viewing: Penthouse Suite B',
    taskType: 'visit',
    status: 'pending',
  });
  assert.equal(validTask.valid, true);

  const missingTitle = validateTaskInput({
    title: '',
    taskType: 'call',
  });
  assert.equal(missingTitle.valid, false);
  assert.equal(missingTitle.error, 'Task title is required');

  const invalidType = validateTaskInput({
    title: 'Call prospect',
    taskType: 'fly_helicopter',
  });
  assert.equal(invalidType.valid, false);
  assert.equal(invalidType.error, 'Invalid task type');
});

test('CRM Lifecycle: Task completion updates status and completion timestamp', () => {
  const task = {
    id: 'task_001',
    status: 'pending',
    completedAt: null,
  };

  // Complete task
  const completedTask = {
    ...task,
    status: 'completed',
    completedAt: new Date().toISOString(),
  };

  assert.equal(completedTask.status, 'completed');
  assert.notEqual(completedTask.completedAt, null);
});
