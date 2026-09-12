/**
 * Tutorial half of the on-screen objective panel.
 *
 * This module no longer renders a panel of its own: it turns the saved tutorial
 * snapshot into the shared `Objective` shape that ObjectiveBar draws, so teaching,
 * emergencies and the manager's paid jobs share one surface on the map screen.
 * Crash guidance lives in ObjectiveBar, because a skipped player needs it too.
 */
import type { ReactNode } from 'react';
import { cityCommand } from '../game/cityControls.ts';
import type { TutorialAction } from '../game/cityTutorial.ts';
import type { Tool } from '../game/cityModel.ts';
import { getSave } from '../state/save.ts';
import { store, type AppState } from '../state/store.ts';
import type { Objective } from './ObjectiveBar.tsx';
import './tutorialCoach.css';
import {tutorialBuildTarget} from './TutorialGuidance.tsx';
import {starterDiversionPoint} from '../game/cityStarterTutorial.ts';

export const TOOL_NAMES: Record<Tool, string> = {
  wideRoad:'4-lane road',busStation:'Bus depot',busStop:'Bus stop',
  home: 'Home', store: 'Store', park: 'Park', direction: 'One-way', road: 'Road', hospital: 'Clinic',
  policeStation: 'Police', fireStation: 'Fire', bulldoze: 'Remove', stop: 'Stop', signal: 'Light', closure: 'Detour',
};
const SHORT: Record<string, { title: string; instruction: string } | undefined> = {
  'first-visit': { title: 'First customer', instruction: 'Join a Home to a Store. Watch a visit finish.' },
  'park-visit': { title: 'A place to visit', instruction: 'Connect a Park. Watch a leisure visit finish.' },
  'driver-rules': { title: 'Meet your drivers', instruction: 'Drivers choose routes, queue, visit, and return.' },
  'junction-control': { title: 'Take turns', instruction: 'Put a Stop or Light where three roads meet.' },
  'accident-response': { title: 'Watch a crossing', instruction: 'Watch an unsigned crossing, or keep your crossing controlled.' },
  rescue: { title: 'Room for crews', instruction: 'Connect Police, Clinic and Fire. Watch the crews.' },
  detour: { title: 'A way around', instruction: 'Join both sides of the crossing with a bypass.' },
};

export function tutorialObjective(s: AppState): Objective | null {
  const t = s.tutorial;
  if (!t) return null;
  const finish = () => { if(window.confirm('End the tutorial and welcome outside traffic? A free access road will be added across vacant land if needed. Your town is preserved.')) cityCommand({type:'finish-tutorial'}); };
  const act = (value: TutorialAction) => value==='skip' ? finish() : cityCommand({ type: 'tutorial', action: value });

  // Historical completed/skipped towns must retain an explicit invitation without
  // restarting lessons. A saved pending request already contains that consent.
  if (t.status === 'complete' || t.status === 'skipped') {
    if (getSave().city.external?.gateway) return null;
    const pending = !!getSave().city.external?.autoConnectRequested;
    return {
      key: pending ? 'connection-pending' : 'connection-invitation',
      eyebrow: pending ? 'Outside connection pending' : 'Your next step',
      title: pending ? 'Make room for the connection' : 'Ready for a bigger town',
      instruction: pending
        ? 'Outside visitors are waiting for a connection. Build a road with a clear route to the map edge.'
        : 'Keep your town and welcome outside visitors when you are ready.',
      primary: pending
        ? { label: 'Road', run: () => store.patch({ tool: 'road', panning: false, toolSelection: s.toolSelection + 1 }) }
        : { label: t.currentId === 'h-connect' ? 'Finish tutorial' : 'Welcome outside visitors', run: finish },
      detail: <p>{pending
        ? 'You already invited outside traffic. The connection will retry automatically when a safe route is available. Any added access road is free. Run traffic after making room.'
        : 'Outside visitors use your roads and destination parking. Arrivals grow with your town. Confirming adds a free access road across vacant land if needed and preserves your buildings.'}</p>,
    };
  }

  if (t.status === 'available') return {
    key: 'guide-offer',
    eyebrow: 'Optional guide',
    title: 'Your town, your pace',
    progress: {current:t.completed,target:t.total,label:'Tutorial lessons completed'},
    instruction: 'Learn the roads on the town you already have.',
    primary: { label: 'Start guide', run: () => act('start') },
    detail: <>
      <p>Short steps, on your own map. Nothing is built for you, and you can leave at any point.</p>
      <p>{t.completed}/{t.total} lessons already done.</p>
      <div className="objective-extras">
          <button onClick={() => act('skip')}>No thanks</button>
      </div>
    </>,
  };

  const city = getSave().city;
  const starter = t.currentId.startsWith('h-');
  let lesson = SHORT[t.currentId];
  let tool = t.currentId==='first-visit'?tutorialBuildTarget(s,getSave().city):t.tool;
  let watchVisit = starter && !t.tool;
  if (t.currentId === 'first-visit') {
    if (!city.buildings.some(b => b.kind === 'home')) { lesson = { title: 'Build a home', instruction: 'Select Home, then tap empty land.' }; tool = tutorialBuildTarget(s,city); }
    else if (!city.buildings.some(b => b.kind === 'store')) { lesson = { title: 'Open a destination', instruction: 'Select Store, then place it beside your road.' }; tool = tutorialBuildTarget(s,city); }
    else if (s.connected === 0) { lesson = { title: 'Join the entrances', instruction: 'Draw roads between the entrance arrows.' }; tool = tutorialBuildTarget(s,city); }
    else { lesson = { title: 'Watch a visit', instruction: 'Run traffic. Let a shopping visit finish.' }; watchVisit = true; }
  }

  // A waived lesson points at the construction the mayor is covering, unless the
  // contextual first-visit steps already know a more specific tool.
  if (!starter) tool = tool ?? t.waived?.tool;
  const chooseTool = (next: Tool) => store.patch({ tool: next, panning: false, toolSelection: s.toolSelection + 1 });
  const diversion = starter ? starterDiversionPoint(city) : null;
  const showDivert = () => {
    chooseTool('closure');
    if(diversion)cityCommand({type:'focus',point:diversion});
  };
  const step = starter ? Math.min(t.total, t.completed + 1) : Math.max(1, t.lessons.findIndex(l => l.id === t.currentId) + 1);
  // No lesson builds on the player's map for them: the crossing lesson runs on their own
  // town, watching real traffic or keeping an existing crossing controlled.
  const primary = t.currentId === 'h-expand' ? { label: 'Add land', run: () => cityCommand({ type: 'open-expansion' }) }
    : t.currentId === 'driver-rules' ? { label: 'Understood', run: () => act('acknowledge-drivers') }
    : watchVisit ? { label: s.paused ? 'Run traffic' : 'Running', run: () => store.patch({ paused: false }) }
    : tool ? { label: TOOL_NAMES[tool], run: () => chooseTool(tool!), pressed: s.tool === tool && !s.panning }
    : { label: s.paused ? 'Run traffic' : 'Pause', run: () => store.patch({ paused: !s.paused }) };

  const detail: ReactNode = <>
    {lesson && lesson.instruction !== t.body && <p>{t.body}</p>}
    {!!t.hint && <p className="objective-hint">{t.hint}</p>}
    {t.currentId === 'driver-rules' && <p>Ordinary drivers respect traffic controls. Outbound emergency crews can cross red lights when clear and pass using available opposing lanes. Returning crews follow ordinary road rules.</p>}
    {t.canAcknowledgeSafety && <p>Match controls to the traffic and watch for conflict warnings as your town grows. Busy stops may need lights, and conflicting turns may need a safer route. A real crash still needs crews with a route to it.</p>}
    <div className="objective-extras">
      {!s.paused && <button onClick={() => store.patch({ paused: true })}>Pause traffic</button>}
      {t.focus && !starter && <button onClick={() => cityCommand({ type: 'focus', point: t.focus! })}>Show lesson area</button>}
      {t.canAcknowledgeSafety && <button onClick={() => act('acknowledge-safety')}>Keep my safe crossing</button>}
      {t.status === 'active' && <button className="objective-exit" onClick={() => act('skip')}>Skip tutorial</button>}
    </div>
  </>;

  return {
    key: `lesson-${t.currentId}-${lesson?.title ?? ''}-${t.waived ? 'waived' : ''}`,
    eyebrow: `Step ${step} of ${t.total} · Traffic ${s.paused ? 'paused' : 'running'}`,
    title: lesson?.title ?? t.title,
    progress: {current:t.completed,target:t.total,label:'Tutorial lessons completed'},
    instruction: lesson?.instruction ?? t.body,
    note: t.waived?.reason,
    primary: starter && t.currentId === 'h-connect' ? { label: 'Finish tutorial', run: finish } : primary,
    secondary: starter && t.focus ? { label: 'Show lesson area', run: () => {
      if(diversion)chooseTool(t.tool ?? 'road');
      cityCommand({ type: 'focus', point: t.focus! });
    }} : undefined,
    optional: diversion ? {label:'Show Divert',run:showDivert} : undefined,
    detail,
  };
}
