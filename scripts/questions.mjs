#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { args, cli, fail, jsonInput, section } from './lib/artifacts.mjs';

export function questionWaves(questions, limit = 4) {
  if (!Array.isArray(questions) || !Number.isSafeInteger(limit) || limit < 1 || limit > 4) fail('Questions and a batch limit of 1–4 are required.');
  const ids = questions.map((q) => q.id);
  if (new Set(ids).size !== ids.length || ids.some((id) => typeof id !== 'string' || !id)) fail('Question IDs must be unique strings.');
  for (const q of questions) if (!Array.isArray(q.depends) || q.depends.some((id) => !ids.includes(id) || id === q.id)) fail(`Unknown/self dependency for ${q.id}.`);
  const done = new Set(), waves = [];
  while (done.size < questions.length) {
    const ready = questions.filter((q) => !done.has(q.id) && q.depends.every((id) => done.has(id)));
    if (!ready.length) fail('Question dependency cycle.');
    for (let i = 0; i < ready.length; i += limit) waves.push(ready.slice(i, i + limit).map((q) => q.id));
    ready.forEach((q) => done.add(q.id));
  }
  return waves;
}
const label = (value) => value.replace(/\s*\(Recommended\)\s*$/, '').trim();
export function parseQuestions(markdown) {
  const body = section(markdown, 'Questions');
  if (body === null) fail('Questions section missing.');
  const matches = [...body.matchAll(/^### (Q\d+)\s*[—–-]\s*(.+)$/gm)];
  const questions = matches.map((match, index) => {
    const content = body.slice(match.index + match[0].length, matches[index + 1]?.index);
    const condition = match[2].match(/Answer only if\s+(Q\d+)\s*=\s*(.*?)\s*\)\*?\s*$/i);
    const options = [...content.matchAll(/^- \[([ xX])\]\s*(.+)$/gm)].map((m) => ({ label: label(m[2]), checked: m[1].toLowerCase() === 'x' }));
    const open = content.match(/^\*\*Your answer:\*\*[ \t]*([^\n]*)/m);
    const text = content.match(/^\*\*Question:\*\*[ \t]*([^\n]+)/m)?.[1];
    if (!text) fail(`${match[1]} has no question text.`);
    if (!options.length && !open) fail(`${match[1]} has no options or open answer field.`);
    return { id: match[1], question: text, condition: condition ? { question: condition[1], equals: label(condition[2]) } : null,
      depends: condition ? [condition[1]] : [], options, answer: open?.[1].trim() ?? null };
  });
  if (!questions.length) fail('No questions found.');
  questionWaves(questions);
  for (const [index, q] of questions.entries()) if (q.depends.some((id) => questions.findIndex((other) => other.id === id) >= index)) fail(`${q.id}: gating question must precede its dependent.`);
  for (const q of questions.filter((q) => q.condition)) {
    const parent = questions.find((parent) => parent.id === q.condition.question);
    if (!parent.options.some((option) => option.label === q.condition.equals)) fail(`${q.id} condition names an unavailable parent option.`);
  }
  return questions;
}
export function resolveQuestions(questions) {
  questionWaves(questions);
  const resolved = [], pending = new Map(questions.map((q) => [q.id, q]));
  while (pending.size) {
    let progress = false;
    for (const [id, q] of pending) {
      const parent = q.condition ? resolved.find((entry) => entry.id === q.condition.question) : null;
      if (q.condition && !parent) continue;
      let status, answer = null;
      if (parent?.status === 'not-applicable') status = 'not-applicable';
      else if (parent && !['answered', 'tbd'].includes(parent.status)) status = 'waiting-for-parent';
      else if (parent && label(parent.answer ?? '') !== label(q.condition.equals)) status = 'not-applicable';
      else if (q.options.length) {
        const selected = q.options.filter((option) => option.checked);
        if (selected.length > 1) { status = 'conflict'; answer = selected.map((option) => option.label); }
        else if (!selected.length) status = 'blank';
        else if (/^Skip\b/i.test(selected[0].label)) { status = 'tbd'; answer = selected[0].label; }
        else if (/^Other:/i.test(selected[0].label) && !selected[0].label.replace(/^Other:\s*/i, '').replace(/_/g, '').trim()) status = 'blank';
        else { status = 'answered'; answer = selected[0].label; }
      } else { answer = q.answer?.trim() || null; status = answer ? 'answered' : 'blank'; }
      resolved.push({ id, status, answer }); pending.delete(id); progress = true;
    }
    if (!progress) fail('Unresolvable question dependencies.');
  }
  const active = resolved.filter((q) => q.status !== 'not-applicable');
  return { answers: resolved, conflicts: resolved.filter((q) => q.status === 'conflict'),
    unanswered: active.filter((q) => ['blank', 'waiting-for-parent'].includes(q.status)).map((q) => q.id),
    tbd_items: resolved.filter((q) => q.status === 'tbd').length,
    decision_ids: resolved.filter((q) => ['answered', 'tbd'].includes(q.status)).map((q) => q.id),
    waves: questionWaves(questions) };
}
export function exactSlackAnswer(question, reply) {
  const text = reply.trim().replace(new RegExp(`^${question.id}\\s*:\\s*`, 'i'), '').trim();
  if (!question.options.length) return text ? { answer: text } : null;
  const offered = question.options.filter((option) => !/^Other:|^Skip\b/i.test(option.label));
  const byLetter = /^[A-Z]$/i.test(text) ? offered[text.toUpperCase().charCodeAt(0) - 65] : null;
  const byLabel = offered.filter((option) => label(option.label) === label(text));
  const selected = byLetter ?? (byLabel.length === 1 ? byLabel[0] : null);
  return selected ? { chosen: selected.label } : null;
}
cli(import.meta.url, async (argv) => {
  const o = args(argv, ['--file', '--input']);
  if (o.command === 'waves') return questionWaves(await jsonInput(o.input));
  if (o.command !== 'inspect' || !o.file) fail('Usage: questions.mjs inspect --file QUESTIONS.md | waves --input QUESTIONS.json');
  const questions = parseQuestions(await readFile(o.file, 'utf8'));
  return { questions, ...resolveQuestions(questions) };
});
