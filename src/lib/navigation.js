import { isDone } from './lifecycle';
import { userOf } from './masterData';
import STAGES from '../data/stages.json';

/* ---------- navigation per persona ---------- */
export const NAV = {
  producer: [
    ['home', 'Home', 'home'],
    ['list', 'My Consignments', 'box'],
    ['declare', 'New Export Declaration', 'plus'],
    ['docs', 'Documents', 'files'],
    ['notifs', 'Notifications', 'bell'],
  ],
  checker: [
    ['home', 'Home', 'home'],
    ['queue', 'Review Queue', 'clip'],
    ['approved', 'Approved', 'check2'],
    ['returned', 'Returned', 'refresh'],
    ['notifs', 'Notifications', 'bell'],
  ],
  coordinator: [
    ['home', 'Inspection Operations', 'grid'],
    ['requests', 'Requests', 'list'],
    ['calendar', 'Calendar', 'calendar'],
    ['inspectors', 'Inspectors', 'users'],
    ['exceptions', 'Exceptions', 'flag'],
  ],
  inspector: [
    ['home', 'My Inspections', 'clip'],
    ['upcoming', 'Upcoming', 'calendar'],
    ['completed', 'Completed', 'check2'],
  ],
  lab: [
    ['home', 'Laboratory', 'flask'],
    ['queue', 'Sample Queue', 'list'],
    ['completed', 'Completed', 'check2'],
  ],
  finance: [
    ['home', 'Finance Dashboard', 'grid'],
    ['awaiting', 'Awaiting Invoice', 'clock'],
    ['invoices', 'Invoices', 'receipt'],
    ['exceptions', 'Exceptions', 'flag'],
  ],
  compliance: [
    ['home', 'Regulatory Dashboard', 'grid'],
    ['cd1', 'CD1', 'bank'],
    ['boe', 'Bill of Entry', 'file'],
    ['clearance', 'Export Clearance', 'ship'],
    ['exceptions', 'Exceptions', 'flag'],
  ],
  executive: [
    ['home', 'Control Tower', 'chart'],
    ['list', 'Consignments', 'box'],
    ['exceptions', 'Exceptions', 'flag'],
    ['analytics', 'Analytics', 'bars'],
    ['reports', 'Reports', 'files'],
  ],
  customer: [
    ['home', 'My Shipments', 'ship'],
    ['docs', 'Documents', 'files'],
    ['notifs', 'Notifications', 'bell'],
  ],
  admin: [
    ['users', 'Users', 'users'],
    ['roles', 'Roles', 'key'],
    ['producers', 'Producers', 'factory'],
    ['mines', 'Mines', 'pin'],
    ['minerals', 'Minerals', 'layers'],
    ['assay', 'Assay Templates', 'flask'],
    ['sla', 'SLA Rules', 'clock'],
    ['docrules', 'Document Rules', 'files'],
    ['integ', 'Integrations', 'link'],
  ],
};

export const MODULE = {
  producer: 'Producer Portal',
  checker: 'Producer Portal',
  coordinator: 'Inspectorate',
  inspector: 'Field Inspection',
  lab: 'Laboratory',
  finance: 'Finance',
  compliance: 'Regulatory Compliance',
  executive: 'Control Tower',
  customer: 'Shipment Portal',
  admin: 'Administration',
};

export function navCount(db, s, cons, k) {
  const p = s.persona;
  const at = (key, sub) =>
    cons.filter((c) => !isDone(c) && STAGES[c.stage].k === key && (!sub || sub.includes(c.sub))).length;
  const unread = myMsgs(db, s, cons).filter((m) => !m.read).length;
  if (k === 'notifs') return unread || null;
  if (p === 'checker' && k === 'queue') return at('decl', ['review']) || null;
  if (p === 'coordinator' && k === 'requests') return at('req') || null;
  if (p === 'coordinator' && k === 'exceptions')
    return db.exc.filter((e) => e.owner === 'Inspectorate' && e.status !== 'Closed').length || null;
  if (p === 'inspector' && k === 'home')
    return cons.filter((c) => !isDone(c) && STAGES[c.stage].k === 'insp' && c.v.a_insp === userOf(s)).length || null;
  if (p === 'lab' && k === 'queue') return at('assay') || null;
  if (p === 'finance' && k === 'awaiting') return at('inv') || null;
  if (p === 'finance' && k === 'exceptions')
    return db.exc.filter((e) => e.owner === 'Finance' && e.status !== 'Closed').length || null;
  if (p === 'compliance' && k === 'cd1') return at('cd1') || null;
  if (p === 'compliance' && k === 'boe') return at('boe') || null;
  if (p === 'compliance' && k === 'clearance') return at('clr') + at('rel') || null;
  if (p === 'compliance' && k === 'exceptions')
    return db.exc.filter((e) => e.owner === 'Compliance' && e.status !== 'Closed').length || null;
  if (p === 'executive' && k === 'exceptions') return db.exc.filter((e) => e.status !== 'Closed').length || null;
  if (p === 'producer' && k === 'list') return cons.filter((c) => !isDone(c)).length || null;
  return null;
}

export function myMsgs(db, s, cons) {
  const ids = new Set(cons.map((c) => c.id));
  return db.msgs.filter((m) => m.to.includes(s.persona) && ids.has(m.ccrn)).sort((a, b) => b.at - a.at);
}
