export async function routeOf(pc) {
  try {
    const stats = await pc.getStats();
    let pair;
    stats.forEach((s) => {
      if (s.type === 'transport' && s.selectedCandidatePairId) pair = stats.get(s.selectedCandidatePairId);
    });
    if (!pair) stats.forEach((s) => s.type === 'candidate-pair' && s.nominated && s.state === 'succeeded' && (pair = s));
    const local = pair && stats.get(pair.localCandidateId);
    return local ? local.candidateType : null;
  } catch {
    return null;
  }
}
