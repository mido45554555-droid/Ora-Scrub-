import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    addProcessingBatch,
    addProcessingWeek,
    findAvailableBatch,
    processingBatchStart,
    processingWeekStart,
} from '../src/lib/processingWeek.js';

test('processing week begins Monday in the configured timezone', () => {
    assert.equal(processingWeekStart(new Date('2026-09-27T20:59:00.000Z'), 'Africa/Cairo'), '2026-09-21');
    assert.equal(processingWeekStart(new Date('2026-09-27T21:00:00.000Z'), 'Africa/Cairo'), '2026-09-28');
    assert.equal(processingWeekStart(new Date('2026-09-29T12:00:00.000Z'), 'UTC'), '2026-09-28');
});

test('week arithmetic is independent of the host timezone', () => {
    assert.equal(addProcessingWeek('2026-09-28'), '2026-10-05');
});

test('processing batches begin on Saturday in the configured timezone', () => {
    assert.equal(processingBatchStart(new Date('2026-10-02T20:59:00.000Z'), 'Africa/Cairo'), '2026-10-03');
    assert.equal(processingBatchStart(new Date('2026-10-03T20:59:00.000Z'), 'Africa/Cairo'), '2026-10-03');
    assert.equal(processingBatchStart(new Date('2026-10-03T21:00:00.000Z'), 'Africa/Cairo'), '2026-10-10');
    assert.equal(processingBatchStart(new Date('2026-10-03T23:00:00.000Z'), 'UTC'), '2026-10-03');
});

test('batch allocator restarts positions for each full Saturday batch', async () => {
    const positions = new Map();
    const allocate = async (candidate) => findAvailableBatch(candidate, async (batchDate) => positions.get(batchDate) ?? 0);
    const firstBatch = '2026-10-03';
    const assigned = [];

    for (let index = 0; index < 21; index += 1) {
        const slot = await allocate(firstBatch);
        assigned.push(slot);
        positions.set(slot.batchDate, slot.queuePosition);
    }

    assert.deepEqual(assigned.slice(0, 10).map(({ queuePosition }) => queuePosition), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    assert.deepEqual(assigned.slice(10, 20).map(({ queuePosition }) => queuePosition), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    assert.deepEqual(
        [assigned[0], assigned[4], assigned[9], assigned[10], assigned[11], assigned[19], assigned[20]],
        [
            { batchDate: '2026-10-03', queuePosition: 1 },
            { batchDate: '2026-10-03', queuePosition: 5 },
            { batchDate: '2026-10-03', queuePosition: 10 },
            { batchDate: '2026-10-10', queuePosition: 1 },
            { batchDate: '2026-10-10', queuePosition: 2 },
            { batchDate: '2026-10-10', queuePosition: 10 },
            { batchDate: '2026-10-17', queuePosition: 1 },
        ]
    );
    assert.equal(assigned[10].batchDate, '2026-10-10');
    assert.equal(assigned[11].queuePosition, 2);
    assert.equal(assigned[20].batchDate, '2026-10-17');
    assert.equal(assigned[20].queuePosition, 1);
    assert.equal(addProcessingBatch(firstBatch), '2026-10-10');
});
