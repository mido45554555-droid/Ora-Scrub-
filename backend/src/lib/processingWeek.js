function localCalendarDate(date, timeZone) {
    const parts = Object.fromEntries(
        new Intl.DateTimeFormat('en-CA', {
            timeZone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        })
            .formatToParts(date)
            .filter((part) => part.type !== 'literal')
            .map(({ type, value }) => [type, value])
    );
    return new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)));
}

/** Returns the Monday date (YYYY-MM-DD) for a date in ORA's processing timezone. */
export function processingWeekStart(date = new Date(), timeZone = 'Africa/Cairo') {
    const localDate = localCalendarDate(date, timeZone);
    const daysSinceMonday = (localDate.getUTCDay() + 6) % 7;
    localDate.setUTCDate(localDate.getUTCDate() - daysSinceMonday);
    return localDate.toISOString().slice(0, 10);
}

/** Returns the current or next Saturday batch start in the configured timezone. */
export function processingBatchStart(date = new Date(), timeZone = 'Africa/Cairo') {
    const localDate = localCalendarDate(date, timeZone);
    const daysUntilSaturday = (6 - localDate.getUTCDay() + 7) % 7;
    localDate.setUTCDate(localDate.getUTCDate() + daysUntilSaturday);
    return localDate.toISOString().slice(0, 10);
}

/** Adds one calendar week to an ISO date without using the host timezone. */
export function addProcessingWeek(weekStart) {
    const date = new Date(`${weekStart}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + 7);
    return date.toISOString().slice(0, 10);
}

/** Adds one Saturday-to-Saturday batch without using the host timezone. */
export function addProcessingBatch(batchStart) {
    const date = new Date(`${batchStart}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + 7);
    return date.toISOString().slice(0, 10);
}

/** Finds the earliest batch with a free position; allocated positions are never reused. */
export async function findAvailableBatch(firstBatch, getLastPosition, capacity = 10) {
    let batchDate = firstBatch;
    while (true) {
        const lastPosition = Number(await getLastPosition(batchDate)) || 0;
        if (lastPosition < capacity) {
            return { batchDate, queuePosition: lastPosition + 1 };
        }
        batchDate = addProcessingBatch(batchDate);
    }
}
