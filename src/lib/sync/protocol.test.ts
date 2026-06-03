import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { frame, parse, MSG_STEP1, MSG_UPDATE } from './protocol';

describe('sync protocol framing', () => {
	it('round-trips a step-1 frame', () => {
		const body = new Uint8Array([1, 2, 3, 4]);
		const msg = parse(frame(MSG_STEP1, body));
		expect(msg.kind).toBe('step1');
		expect([...msg.body]).toEqual([1, 2, 3, 4]);
	});

	it('round-trips an update frame', () => {
		const body = new Uint8Array([9, 8, 7]);
		const msg = parse(frame(MSG_UPDATE, body));
		expect(msg.kind).toBe('update');
		expect([...msg.body]).toEqual([9, 8, 7]);
	});

	it('treats a bare Y update (no magic) as legacy', () => {
		const doc = new Y.Doc();
		doc.getArray('x').push([1]);
		const update = Y.encodeStateAsUpdate(doc);
		const msg = parse(update);
		expect(msg.kind).toBe('legacy');
		// a fresh doc can still apply it
		const other = new Y.Doc();
		Y.applyUpdate(other, msg.body);
		expect(other.getArray('x').toArray()).toEqual([1]);
	});

	it('an unknown type byte falls back to legacy rather than corrupting', () => {
		const msg = parse(frame(99, new Uint8Array([5, 5])));
		expect(msg.kind).toBe('legacy');
	});
});

describe('state-vector handshake', () => {
	it('heals the reported bug: a pending insert integrates after the handshake', () => {
		// device created expenses that never reached the peer (the original bug)
		const device = new Y.Doc();
		const expenses = device.getArray<string>('expenses');
		expenses.push(['base-1', 'base-2']);

		const peer = new Y.Doc();

		// device adds a new expense; the raw incremental update references its own
		// base structs, which the peer never received, so it cannot integrate yet
		let lastUpdate: Uint8Array | null = null;
		device.on('update', (u: Uint8Array) => {
			lastUpdate = u;
		});
		expenses.push(['new-expense']);
		Y.applyUpdate(peer, lastUpdate as unknown as Uint8Array);
		expect(peer.getArray('expenses').toArray()).toEqual([]); // stuck/pending

		// the step-1 handshake: peer advertises its (empty) state, device replies
		// with the full diff, and now everything integrates in causal order
		const peerSV = Y.encodeStateVector(peer);
		Y.applyUpdate(peer, Y.encodeStateAsUpdate(device, peerSV));
		expect(peer.getArray('expenses').toArray()).toEqual(['base-1', 'base-2', 'new-expense']);
	});

	it('a step-2 reply carries exactly what the peer lacks', () => {
		// peer has some history; this doc has that plus more
		const base = new Y.Doc();
		base.getArray('x').push(['shared']);
		const peer = new Y.Doc();
		Y.applyUpdate(peer, Y.encodeStateAsUpdate(base));

		const mine = new Y.Doc();
		Y.applyUpdate(mine, Y.encodeStateAsUpdate(base));
		mine.getArray('x').push(['extra']);

		const peerSV = Y.encodeStateVector(peer);
		Y.applyUpdate(peer, Y.encodeStateAsUpdate(mine, peerSV));
		expect(peer.getArray('x').toArray()).toEqual(['shared', 'extra']);
	});

	it('a step-2 reply backfills a delete even though the state vector is unchanged', () => {
		// both peers synced on two items
		const mine = new Y.Doc();
		mine.getArray('x').push(['a', 'b']);
		const peer = new Y.Doc();
		Y.applyUpdate(peer, Y.encodeStateAsUpdate(mine));

		// delete one item; deletions do not advance the state vector, so a gate
		// based on "do I have newer structs" would wrongly skip the reply
		mine.getArray('x').delete(0, 1);

		const peerSV = Y.encodeStateVector(peer);
		Y.applyUpdate(peer, Y.encodeStateAsUpdate(mine, peerSV));
		expect(peer.getArray('x').toArray()).toEqual(['b']);
	});
});
