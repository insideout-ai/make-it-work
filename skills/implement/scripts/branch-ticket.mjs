#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { args, cli, requireText } from '../../../scripts/lib/artifacts.mjs';

// A naming hint only: no inference from commit contents or uncommitted edits.
export function branchTicket(branch, ticket, base) {
  const key = /^[A-Za-z][A-Za-z0-9]*-\d+$/;
  const tickets = [...new Set([...branch.matchAll(/(?<![A-Za-z0-9])([A-Za-z][A-Za-z0-9]*-\d+)(?![A-Za-z0-9])/g)]
    .map(match => match[1].toUpperCase()))];
  return { branch, ticket, branch_tickets: tickets,
    mismatch: branch !== base && branch !== '' && key.test(ticket) && tickets.length > 0 && !tickets.includes(ticket.toUpperCase()) };
}

export function inspectBranch(repo, ticket, base) {
  const branch = execFileSync('git', ['-C', repo, 'branch', '--show-current'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  return branchTicket(branch, ticket, base);
}

cli(import.meta.url, argv => {
  const options = args(argv, ['--repo', '--ticket', '--base']);
  if (options.command !== 'check') throw new Error('Usage: branch-ticket.mjs check --repo DIR --ticket KEY --base BRANCH');
  return inspectBranch(requireText(options.repo, 'repo'), requireText(options.ticket, 'ticket'), requireText(options.base, 'base'));
});
