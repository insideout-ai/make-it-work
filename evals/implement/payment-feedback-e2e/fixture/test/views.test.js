const test = require('node:test');
const assert = require('node:assert/strict');
const {formatDate, buildSessionDetails} = require('../src/sessionDetails');
const {renderDashboard, renderSessions} = require('../src/views');
const sessions = require('../src/data');
test('session date uses UTC and invalid values are absent', () => {
  assert.equal(formatDate('2026-11-01T23:00:00-02:00'), '2026-11-02');
  assert.equal(formatDate('invalid'), null);
  assert.equal(formatDate(null), null);
});
test('billing status distinguishes paid and unpaid sessions', () => {
  assert.ok(buildSessionDetails(sessions[0]).includes('Payment received'));
  assert.ok(buildSessionDetails(sessions[1]).includes('Awaiting payment'));
});
test('dashboard limits rows and escapes session text', () => {
  const html = renderDashboard(sessions);
  assert.equal((html.match(/<li /g)||[]).length,3);
  assert.ok(html.includes('Coaching &lt;A&gt;'));
  assert.ok(html.includes('hover-details'));
});
test('sessions table displays all rows', () => {
  const html = renderSessions(sessions);
  assert.equal((html.match(/<tr class=/g)||[]).length,4);
  assert.ok(html.includes('2026-11-01'));
  assert.ok(html.includes('Coaching &lt;A&gt;'));
});
