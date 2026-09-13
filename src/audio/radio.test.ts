import assert from 'node:assert/strict';
import test from 'node:test';
import {RADIO_TRACKS, PREVIEW_SECONDS, TUNE_WINDOW, clipWindow, formatRadioTime, nearestStation, radioStations, seekStation, stationAt, staticLevel} from './radio.ts';

const jam = RADIO_TRACKS.find(track => track.id === 'what-a-jam')!;

test('What a Jam is locked behind the Level 25 finale; themes are free', () => {
    assert.deepEqual(jam.unlock, {kind: 'mission', challengeId: 'what-a-jam', label: jam.unlock.kind === 'mission' ? jam.unlock.label : ''});
    assert.equal(jam.src, 'audio/radio/what-a-jam.mp3');
    for (const track of RADIO_TRACKS.filter(t => !['what-a-jam', 'room-for-us', 'fill-it-up'].includes(t.id))) assert.equal(track.unlock.kind, 'free');
    assert.equal(new Set(RADIO_TRACKS.map(t => t.frequency)).size, RADIO_TRACKS.length, 'each song has its own frequency');
});

test('Room For Us is a game-credits unlock with a chorus preview', () => {
    const room = RADIO_TRACKS.find(track => track.id === 'room-for-us')!;
    assert.equal(room.unlock.kind, 'purchase');
    assert.equal(room.src, 'audio/radio/room-for-us.mp3');
    assert.deepEqual(clipWindow(room, 223), {start: 39, end: 59, length: PREVIEW_SECONDS});
    assert.deepEqual(clipWindow(room, 223, true), {start: 0, end: 223, length: 223});
});

test('Fill It Up! is a game-credits unlock previewing its chorus', () => {
    const fill = RADIO_TRACKS.find(track => track.id === 'fill-it-up')!;
    assert.equal(fill.unlock.kind, 'purchase');
    assert.equal(fill.src, 'audio/radio/fill-it-up.mp3');
    assert.deepEqual(clipWindow(fill, 169.5), {start: 50, end: 70, length: PREVIEW_SECONDS});
    assert.equal(RADIO_TRACKS.some(track => track.id === 'tranquil'), false, 'Tranquil City stays gameplay music only');
});

test('locked songs play a short preview; unlocked songs play in full', () => {
    const preview = clipWindow(jam, 169);
    assert.equal(preview.start, 33);
    assert.equal(preview.length, PREVIEW_SECONDS);
    const full = clipWindow(jam, 169, true);
    assert.equal(full.start, 0);
    assert.equal(full.length, 169);
    assert.equal(clipWindow({...jam, previewStart: 160}, 169).length, 9, 'a preview never runs past the file');
});

test('the dial locks onto nearby stations and hisses between them', () => {
    assert.equal(stationAt(jam.frequency)?.id, 'what-a-jam');
    assert.equal(stationAt(jam.frequency + TUNE_WINDOW)?.id, 'what-a-jam');
    assert.equal(stationAt(100.1), null);
    assert.equal(staticLevel(jam.frequency), 0);
    assert.equal(staticLevel(100.1), 1);
    assert.equal(nearestStation(104).station?.id, 'junction');
});

test('SEEK wraps the band, and the station rolls on through unlocked songs only', () => {
    const stations = radioStations();
    const last = stations[stations.length - 1];
    assert.equal(seekStation(last.frequency, 1)?.id, stations[0].id);
    assert.equal(seekStation(stations[0].frequency, -1)?.id, last.id);
    const freeOnly = seekStation(96.1, 1, stations, t => t.unlock.kind === 'free');
    assert.equal(freeOnly?.id, 'junction', 'skips the locked 98.7 and 101.5 previews');
    assert.equal(seekStation(92.3, 1)?.id, 'fill-it-up');
});

test('clock labels', () => {
    assert.equal(formatRadioTime(0), '0:00');
    assert.equal(formatRadioTime(11.9), '0:11');
    assert.equal(formatRadioTime(169), '2:49');
});
