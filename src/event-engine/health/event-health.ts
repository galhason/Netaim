import type { EventCapability } from '../capabilities/capabilities';
import { resolveCapabilities } from '../capabilities/capabilities';
import type { EventPhase } from '../lifecycle/phases';
import { availableTransitions } from '../lifecycle/transitions';
import type { Finding, FindingSeverity } from '../readiness/findings';
import { evaluateReadiness, type ReadinessInput } from '../readiness/readiness';

const SEVERITY_WEIGHT: Record<FindingSeverity, number> = {
  blocker: 15,
  warning: 5,
  advice: 1,
};

const SEVERITY_ORDER: Record<FindingSeverity, number> = {
  blocker: 0,
  warning: 1,
  advice: 2,
};

export interface EventHealthInput {
  phase: EventPhase;
  publishStatus: 'draft' | 'published';
  declaredCapabilities: readonly EventCapability[];
  readiness: ReadinessInput;
  experienceFindings: readonly Finding[];
  translationCompleteness: number;
  mediaCompleteness: number;
}

export interface EventHealth {
  phase: EventPhase;
  publishStatus: 'draft' | 'published';
  capabilities: EventCapability[];
  invalidCapabilities: { capability: EventCapability; missing: EventCapability[] }[];
  findings: Finding[];
  blockers: number;
  warnings: number;
  readinessScore: number;
  translationCompleteness: number;
  mediaCompleteness: number;
  requiredActions: Finding[];
  availableTransitions: EventPhase[];
}

const clampPercent = (value: number): number =>
  Math.max(0, Math.min(100, Math.round(value)));

/*
 * The single source of truth for event health (Objective 6). Nothing
 * else on the platform derives readiness, scores or required actions;
 * every surface renders this aggregate.
 */
export const computeEventHealth = (input: EventHealthInput): EventHealth => {
  const capabilities = resolveCapabilities(input.declaredCapabilities);
  const findings = [
    ...evaluateReadiness(input.readiness),
    ...input.experienceFindings,
  ].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);

  const blockers = findings.filter((f) => f.severity === 'blocker').length;
  const warnings = findings.filter((f) => f.severity === 'warning').length;

  const penalty = findings.reduce(
    (total, finding) => total + SEVERITY_WEIGHT[finding.severity],
    0,
  );

  return {
    phase: input.phase,
    publishStatus: input.publishStatus,
    capabilities: capabilities.enabled,
    invalidCapabilities: capabilities.invalid,
    findings,
    blockers,
    warnings,
    readinessScore: clampPercent(100 - penalty),
    translationCompleteness: clampPercent(input.translationCompleteness),
    mediaCompleteness: clampPercent(input.mediaCompleteness),
    requiredActions: findings.filter((f) => f.severity !== 'advice'),
    availableTransitions: availableTransitions(
      input.phase,
      capabilities.enabled,
    ),
  };
};
