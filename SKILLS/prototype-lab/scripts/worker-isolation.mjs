export const freshWorkerCapability = "fresh-worker-no-inherited-history";

const adapterSpecs = Object.freeze({
  "codex-fork-turns-none": {
    evidence: "fork_turns:none",
    legacyForkTurns: "none"
  },
  "dedicated-cli-clean-session": {
    evidence: "fresh-process-packet-only",
    legacyForkTurns: null
  },
  "separate-thread-fresh-context": {
    evidence: "fresh-thread-no-history",
    legacyForkTurns: null
  }
});

export function codexFreshWorkerIsolation() {
  return {
    capability: freshWorkerCapability,
    adapter: "codex-fork-turns-none",
    inheritedHistory: false,
    coordinatorContextExposed: false,
    evidence: "fork_turns:none"
  };
}

export function validatedFreshWorkerIsolation(isolation, { forkTurns, label = "dispatch" } = {}) {
  const issues = [];
  if (!isolation || typeof isolation !== "object" || Array.isArray(isolation)) {
    return [`${label} requires an isolation object`];
  }
  if (isolation.capability !== freshWorkerCapability) {
    issues.push(`${label} isolation.capability must be ${freshWorkerCapability}`);
  }
  const adapter = adapterSpecs[isolation.adapter];
  if (!adapter) {
    issues.push(`${label} isolation.adapter must be codex-fork-turns-none, dedicated-cli-clean-session, or separate-thread-fresh-context`);
  } else {
    if (isolation.evidence !== adapter.evidence) {
      issues.push(`${label} isolation.evidence must be ${adapter.evidence} for ${isolation.adapter}`);
    }
    if (adapter.legacyForkTurns && forkTurns !== adapter.legacyForkTurns) {
      issues.push(`${label} Codex adapter requires forkTurns ${adapter.legacyForkTurns}`);
    }
    if (!adapter.legacyForkTurns && forkTurns !== undefined) {
      issues.push(`${label} ${isolation.adapter} must not record a Codex-only forkTurns field`);
    }
  }
  if (isolation.inheritedHistory !== false) {
    issues.push(`${label} isolation.inheritedHistory must be false`);
  }
  if (isolation.coordinatorContextExposed !== false) {
    issues.push(`${label} isolation.coordinatorContextExposed must be false`);
  }
  return issues;
}

export function hasVerifiedFreshWorkerIsolation(run) {
  return validatedFreshWorkerIsolation(run?.isolation, {
    forkTurns: run?.forkTurns,
    label: "run"
  }).length === 0;
}

export function isolationAdapterLabel(isolation) {
  return typeof isolation?.adapter === "string" ? isolation.adapter : "not captured";
}
