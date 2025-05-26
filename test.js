type DistributionMode = "space-between" | "space-around";

/**
 * Distributes event start times uniformly in a given interval.
 * @param overallDuration Total interval duration
 * @param eventDuration Duration of each event
 * @param numEvents Number of events
 * @param mode "space-between" (default) or "space-around"
 * @returns Array of start times (ascending)
 */
function distributeEventStartTimes(
  overallDuration: number,
  eventDuration: number,
  numEvents: number,
  mode: DistributionMode = "space-between"
): number[] {
  if (numEvents <= 0) return [];
  if (numEvents === 1) {
    if (mode === "space-around") {
      return [Math.max(0, (overallDuration - eventDuration) / 2)];
    }
    return [0];
  }
  if (overallDuration <= eventDuration) {
    return Array(numEvents).fill(0);
  }

  if (mode === "space-between") {
    // First at 0, last at overallDuration - eventDuration
    const interval = (overallDuration - eventDuration) / (numEvents - 1);
    return Array.from({ length: numEvents }, (_, i) =>
      +(i * interval).toFixed(8)
    );
  } else {
    // space-around: equal gap at both ends and between events
    const totalEventsDuration = eventDuration * numEvents;
    const totalGap = overallDuration - totalEventsDuration;
    const gap = totalGap / (numEvents + 1);
    return Array.from({ length: numEvents }, (_, i) =>
      +(gap * (i + 1) + eventDuration * i).toFixed(8)
    );
  }
}

// Examples:
distributeEventStartTimes(2, 1, 3, "space-between"); // [0, 0.5, 1]
distributeEventStartTimes(2, 1, 3, "space-around");  // [0.25, 1, 1.75]
distributeEventStartTimes(5, 1, 3, "space-between"); // [0, 2, 4]
distributeEventStartTimes(5, 1, 3, "space-around");  // [1, 2, 3]