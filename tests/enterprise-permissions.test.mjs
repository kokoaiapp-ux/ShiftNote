import assert from 'node:assert/strict';
import { test } from 'node:test';
import { canPerformAdminAction, canViewAdminSection, isInternalRole } from '../lib/enterprise/permissions.ts';

test('all four explicit internal roles have least-privilege section and action permissions', () => {
  for (const role of ['shiftnote_owner','shiftnote_admin']) {
    for (const action of ['approve','reissue','lead','organization-status','contract','ticket']) assert.equal(canPerformAdminAction(role,action),true);
    for (const view of ['payments','audit-logs','settings']) assert.equal(canViewAdminSection(role,view),true);
  }
  assert.equal(canPerformAdminAction('shiftnote_sales','lead'),true);
  assert.equal(canViewAdminSection('shiftnote_sales','contracts'),true);
  assert.equal(canPerformAdminAction('shiftnote_support','ticket'),true);
  for (const role of ['shiftnote_sales','shiftnote_support']) {
    for (const action of ['approve','reissue','organization-status','contract']) assert.equal(canPerformAdminAction(role,action),false);
    for (const view of ['payments','audit-logs','settings']) assert.equal(canViewAdminSection(role,view),false);
  }
  for (const role of ['owner','admin','founder','user','']) {
    assert.equal(isInternalRole(role),false);
    assert.equal(canViewAdminSection(role,'dashboard'),false);
    assert.equal(canPerformAdminAction(role,'approve'),false);
  }
});
