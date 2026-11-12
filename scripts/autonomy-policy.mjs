#!/usr/bin/env node
import { args, cli, fail, jsonInput } from './lib/artifacts.mjs';
import { normalizeEntry } from './decision-log.mjs';

export const POLICIES = {
  implement: { 'branch-guard': 'create-branch', 'testing-readiness': 'automated', 'fix-dispatch': 'sequential', 'delivery-offer': 'ask', 'ticket-publication': 'ask', 'manual-verification': 'ask' },
  execute: { 'mode-choice': 'subagent-driven', 'inline-pause-mode-backfill': 'straight-through', 'inline-step-pause-override': 'continue', 'repo-ambiguity': 'stop', 'no-root': 'stop', 'no-ticket': 'stop', 'no-plan': 'stop', 'invalid-dependencies': 'stop' },
  'run-regression': { 'mode-choice': 'full', 'repo-ambiguity': 'stop', 'no-command': 'stop' },
  'plan-the-work': { 'existing-plan-collision': 'suffix', 'scope-check': 'continue', 'mid-refinement': 'stop', 'baseline-failure': 'document-and-proceed', 'optional-review': 'decline', 'repo-ambiguity': 'stop', 'no-root': 'stop', 'no-ticket': 'stop', 'no-spec': 'stop' },
  'close-the-gaps': { 'mode-choice': 'here', 'ticket-fetch-failed': 'stop', 'pending-export': 'stop', 'conflicting-answers': 'stop', 'slack-no-reply': 'answer-live' },
  'go-deep': { 'workflow-choice': 'repair', 'fresh-impact': 'stop', 'repair-actions': 'all', 'staleness-window': '30-days', 'repair-confirm': 'continue', 'confirm-scope': 'continue', 'project-review': 'continue', 'sample-review': 'continue', 'final-review': 'continue' },
  'define-test-strategy': { 'no-repo': 'stop', 'go-deep-offer': 'continue-without', 'prior-output': 'refresh', 'location-confirm': 'all', 'strategy-review': 'review', 'strategy-confirm': 'continue', 'map-confirm': 'continue', 'refresh-conflict': 'keep-user', 'missing-pointer': 'skip' },
  'slice-the-epic': { 'slicing-approach': 'recommended', 'jira-creation': 'skip' },
};
function policy(skill, site) {
  if (POLICIES[skill]?.[site]) return POLICIES[skill][site];
  if (skill === 'close-the-gaps' && /^(wave-\d+-q\d+|blank-q\d+|drift-q\d+)$/.test(site)) return 'recommended';
  if (skill === 'plan-the-work' && /^(approach|scope|migration|compatibility|assumption|prerequisite|rollout)-gap$/.test(site)) return 'recommended';
  if (skill === 'go-deep' && /^question-\d+$/.test(site)) return 'recommended';
  if (skill === 'define-test-strategy' && /^strategy-question-\d+$/.test(site)) return 'recommended';
  fail(`No deterministic policy for ${skill}/${site}; use the skill's semantic contract and do not invent a default.`);
}
export function resolveDecision(input) {
  if (!['guided', 'autonomous', 'autopilot'].includes(input.mode)) fail('Invalid autonomy mode.');
  const options = input.options ?? [];
  if (!Array.isArray(options) || options.some((option) => !/^[a-z0-9][a-z0-9-]*$/.test(option.id ?? '') || typeof option.label !== 'string' || !option.label.trim())) fail('Options require stable ids and labels.');
  if (new Set(options.map((option) => option.id)).size !== options.length) fail('Option ids must be unique.');
  const rule = policy(input.skill, input.site);
  if (input.user_choice !== undefined) {
    if (input.source !== 'user' || !['chat', 'question'].includes(input.via)) fail('Explicit choice requires user provenance.');
    const selected = options.find((option) => option.id === input.user_choice);
    if (!selected) fail('User choice is not an offered option.');
    return { action: 'chosen', choice_id: selected.id, chosen: selected.label, source: 'user', entry: null };
  }
  const autonomousDefault = input.skill === 'implement' && ['testing-readiness', 'fix-dispatch'].includes(input.site) || input.skill === 'define-test-strategy' && /^strategy-(question-\d+|confirm|review)$/.test(input.site);
  if (rule === 'ask' || input.mode !== 'autopilot' && !(input.mode === 'autonomous' && autonomousDefault)) return { action: 'ask', choice_id: null, entry: null };
  let chosen = null, choiceId = null;
  if (rule !== 'stop') {
    let selected;
    if (rule === 'recommended') {
      const candidates = options.filter((option) => option.recommended === true);
      if (candidates.length !== 1) fail('Exactly one substantive recommendation is required.');
      selected = candidates[0];
    } else if (rule === 'all') {
      selected = options.filter((option) => option.candidate === true);
      if (!selected.length) fail('No actual candidates were supplied.');
      if (input.multiSelect !== true && (input.kind ?? 'askUserQuestion') === 'askUserQuestion') {
        if (selected.length !== 1) fail('All-candidate policy requires multiSelect for multiple candidates.');
        selected = selected[0];
      }
    } else {
      selected = options.find((option) => option.id === rule);
      if (!selected) fail(`Required policy option ${rule} is unavailable; do not choose an alternative.`);
    }
    chosen = Array.isArray(selected) ? selected.map((option) => option.label) : selected.label;
    choiceId = Array.isArray(selected) ? selected.map((option) => option.id) : selected.id;
  }
  const source = input.mode === 'autopilot' ? 'autopilot' : 'policy';
  const entry = { phase: input.phase, site: input.site, kind: input.kind ?? 'askUserQuestion', chosen,
    rationale: rule === 'stop' ? 'This site has no documented unattended default.' : `The ${input.mode} policy selects ${Array.isArray(choiceId) ? choiceId.join(', ') : choiceId}.` };
  if (entry.kind === 'askUserQuestion') Object.assign(entry, { question: input.question, options: options.map(({ label, description }) => description === undefined ? label : { label, description }), multiSelect: input.multiSelect ?? false });
  else if (Array.isArray(entry.chosen)) entry.chosen = entry.chosen.join('; ');
  return { action: rule === 'stop' ? 'stop' : 'chosen', choice_id: choiceId, chosen, source,
    entry: source === 'autopilot' ? normalizeEntry(entry, input.skill) : null };
}
cli(import.meta.url, async (argv) => {
  const o = args(argv, ['--input']);
  if (o.command === 'list') return POLICIES;
  if (o.command !== 'resolve') fail('Usage: autonomy-policy.mjs list | resolve --input DECISION.json');
  return resolveDecision(await jsonInput(o.input));
});
