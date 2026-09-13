import assert from 'node:assert/strict';
import test from 'node:test';
import {RADIO_TRACKS, PREVIEW_SECONDS, TUNE_WINDOW, clipWindow, formatRadioTime, nearestStation, radioState, seekRadio, tune, radioStations, seekStation, stationAt, staticLevel} from './radio.ts';

const jam = RADIO_TRACKS.find(track => track.id === 'what-a-jam')!;

test('What a Jam is locked behind the Level 25 finale; themes are free', () => {
    assert.deepEqual(jam.unlock, {kind: 'mission', challengeId: 'what-a-jam', label: jam.unlock.kind === 'mission' ? jam.unlock.label : ''});
    assert.equal(jam.src, 'audio/radio/what-a-jam.mp3');
    for (const track of RADIO_TRACKS.filter(t => !['what-a-jam', 'fill-it-up'].includes(t.id))) assert.equal(track.unlock.kind, 'free');
    assert.equal(new Set(RADIO_TRACKS.map(t => t.frequency)).size, RADIO_TRACKS.length, 'each song has its own frequency');
});

test('station order follows the requested playlist and Too Busy to Work is free', () => {
    assert.deepEqual(radioStations().map(t => t.id), ['title', 'what-a-jam', 'we-got-pizza-we-got-praise', 'too-busy-to-work', 'fill-it-up', 'junction']);
    const busy = RADIO_TRACKS.find(t => t.id === 'too-busy-to-work')!;
    assert.equal(busy.unlock.kind, 'free');
    assert.equal(busy.src, 'audio/radio/too-busy-to-work.mp3');
    assert.equal(RADIO_TRACKS.some(t => t.id === 'room-for-us'), false);
});

test('first SEEK tunes the theme, subsequent scans advance and wrap without a startup detour', () => {
    assert.equal(radioState().power, false);
    assert.equal(radioState().trackId, null);
    assert.equal(radioState().dial, 92.3);
    for (const id of ['title', 'what-a-jam', 'we-got-pizza-we-got-praise', 'too-busy-to-work', 'fill-it-up', 'junction', 'title']) {
        seekRadio(1);
        assert.equal(radioState().trackId, id);
    }
    seekRadio(-1);
    assert.equal(radioState().trackId, 'junction');
    tune(92.3, true);
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
    const freeOnly = seekStation(92.3, 1, stations, t => t.unlock.kind === 'free');
    assert.equal(freeOnly?.id, 'we-got-pizza-we-got-praise', 'skips the locked What a Jam preview');
    assert.equal(seekStation(92.3, 1)?.id, 'what-a-jam');
});

test('clock labels', () => {
    assert.equal(formatRadioTime(0), '0:00');
    assert.equal(formatRadioTime(11.9), '0:11');
    assert.equal(formatRadioTime(169), '2:49');
});
