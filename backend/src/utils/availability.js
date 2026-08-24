function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && aEnd > bStart;
}

function roundUpToMinutes(date, stepMinutes) {
  const stepMs = stepMinutes * 60 * 1000;
  return new Date(Math.ceil(date.getTime() / stepMs) * stepMs);
}

function getUtcDayBounds(date) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
  return { start, end };
}

function buildAvailableSlots({
  from,
  to,
  durationMinutes,
  slotMinutes,
  dayStartHour,
  dayEndHour,
  busyIntervals
}) {
  const slots = [];
  const durationMs = durationMinutes * 60 * 1000;
  const slotStepMs = slotMinutes * 60 * 1000;

  let cursorDay = new Date(from);

  while (cursorDay <= to) {
    const { start: dayStart } = getUtcDayBounds(cursorDay);
    const windowStart = new Date(dayStart);
    windowStart.setUTCHours(dayStartHour, 0, 0, 0);

    const windowEnd = new Date(dayStart);
    windowEnd.setUTCHours(dayEndHour, 0, 0, 0);

    const effectiveStart = roundUpToMinutes(new Date(Math.max(windowStart.getTime(), from.getTime())), slotMinutes);
    const effectiveEnd = new Date(Math.min(windowEnd.getTime(), to.getTime()));

    for (let slotStart = new Date(effectiveStart); slotStart.getTime() + durationMs <= effectiveEnd.getTime(); slotStart = new Date(slotStart.getTime() + slotStepMs)) {
      const slotEnd = new Date(slotStart.getTime() + durationMs);

      const blocked = busyIntervals.some((interval) =>
        overlaps(slotStart, slotEnd, new Date(interval.start_time), new Date(interval.end_time))
      );

      if (!blocked) {
        slots.push({
          startTime: slotStart.toISOString(),
          endTime: slotEnd.toISOString()
        });
      }
    }

    cursorDay = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  }

  return slots;
}

module.exports = {
  buildAvailableSlots
};
