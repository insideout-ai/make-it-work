const { buildSessionDetails, formatDate } = require('./sessionDetails');
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}
function details(session) { return buildSessionDetails(session).map(escapeHtml).join('<br>'); }
function renderDashboard(sessions) {
  return '<h1>Dashboard</h1><h2>Last 3 Sessions</h2><ul>' + sessions.slice(0,3).map(s =>
    `<li class="session-line"><a href="/sessions">${escapeHtml(s.description)}</a><span class="hover-details">${details(s)}</span></li>`).join('') + '</ul>';
}
function renderSessions(sessions) {
  return '<h1>Sessions</h1><table><thead><tr><th>Date</th><th>Description</th><th>Details</th></tr></thead><tbody>' + sessions.map(s =>
    `<tr class="session-line"><td>${escapeHtml(formatDate(s.date_start) || 'Unknown')}</td><td>${escapeHtml(s.description)}</td><td>${details(s)}</td></tr>`).join('') + '</tbody></table>';
}
module.exports = { renderDashboard, renderSessions };
