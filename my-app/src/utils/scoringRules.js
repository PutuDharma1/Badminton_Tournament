export function validateSetScore(h, a, pointSystem, isWomensSingles) {
  // No tied final scores exist in any system
  if (h === a) return `Score ${h}-${a}: tied score is not a valid final score.`;

  const mx = Math.max(h, a);
  const mn = Math.min(h, a);

  if (pointSystem === 'RALLY_21') {
    // First to 21; deuce at 20-20 (win by 2); cap: 29-29 → next point wins → max 30-29
    if (mx > 30) return `Score ${h}-${a}: max is 30.`;
    if (mx >= 21) {
      if (mx === 30 && mn !== 28 && mn !== 29)
        return `Score ${h}-${a}: at 30, loser must have 28 or 29.`;
      if (mx > 21 && mx < 30 && mx - mn !== 2)
        return `Score ${h}-${a}: must win by exactly 2 past 20-20.`;
      if (mx === 21 && mn >= 20)
        return `Score ${h}-${a}: must win by 2 at deuce (20-20) — e.g. 22-20.`;
    }
    return null;
  }

  if (pointSystem === 'RALLY_15') {
    // First to 15; deuce at 14-14 (win by 2); cap: 20-20 → next point wins → max 21-20
    if (mx > 21) return `Score ${h}-${a}: max is 21.`;
    if (mx >= 15) {
      if (mx === 21 && mn !== 19 && mn !== 20)
        return `Score ${h}-${a}: at 21, loser must have 19 or 20.`;
      if (mx > 15 && mx < 21 && mx - mn !== 2)
        return `Score ${h}-${a}: must win by exactly 2 past 14-14.`;
      if (mx === 15 && mn >= 14)
        return `Score ${h}-${a}: must win by 2 at deuce (14-14) — e.g. 16-14.`;
    }
    return null;
  }

  if (pointSystem === 'CLASSIC') {
    // Classic (pre-2006): first to 15.
    // Setting at 13-13 → extend to 18 (+5). Setting at 14-14 → extend to 17 (+3).
    // Valid winning scores: 15 (normal), 17 (set at 14-14), 18 (set at 13-13).
    if (mx !== 15 && mx !== 17 && mx !== 18)
      return `Score ${h}-${a}: invalid. Classic winner scores exactly 15, 17 (setting at 14-14), or 18 (setting at 13-13).`;
    if (mx === 17 && mn < 14)
      return `Score ${h}-${a}: at 17, loser must have ≥14 — setting is only invoked at 14-14.`;
    if (mx === 18 && mn < 13)
      return `Score ${h}-${a}: at 18, loser must have ≥13 — setting is only invoked at 13-13.`;
    return null;
  }

  return null;
}

export function setIsWon(h, a, pointSystem, isWomensSingles) {
  const mx = Math.max(h, a);
  if (pointSystem === 'RALLY_21') return mx >= 21;
  if (pointSystem === 'RALLY_15') return mx >= 15;
  if (pointSystem === 'CLASSIC')  return mx === 15 || mx === 17 || mx === 18;
  return false;
}

export function getMaxScore(pointSystem, isWomensSingles) {
  if (pointSystem === 'RALLY_21') return 30;
  if (pointSystem === 'RALLY_15') return 21;
  if (pointSystem === 'CLASSIC')  return 18;
  return 30;
}

export function getScoringHint(pointSystem, isWomensSingles) {
  if (pointSystem === 'RALLY_21') return 'Rally 21 — first to 21, deuce at 20-20 (win by 2), cap 30-29';
  if (pointSystem === 'RALLY_15') return 'Rally 15 — first to 15, deuce at 14-14 (win by 2), cap 21-20';
  if (pointSystem === 'CLASSIC')  return 'Classic — first to 15; setting at 13-13 (→18) or 14-14 (→17)';
  return '';
}
