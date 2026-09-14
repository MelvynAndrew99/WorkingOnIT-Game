import type {ReactNode} from 'react';

/** Shared 24px stroke icons for gameplay chrome. Geometry stays identical across states. */
export function HudIcon({children}:{children:ReactNode}) {
    return <svg className="hud-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{children}</svg>;
}

export function IconHeatmap() {
    return <HudIcon><path d="M4 18V8m5 10V4m5 14v-7m5 7V6" /></HudIcon>;
}
export function IconDashboard() {
    return <HudIcon><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="5" rx="1.5"/><rect x="13" y="10" width="8" height="11" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/></HudIcon>;
}
export function IconDebug() {
    return <HudIcon><path d="M8 8v8m8-8v8M5 9H3m18 0h-2M5 15H3m18 0h-2M8 4l2 3h4l2-3M8 20l2-3h4l2 3"/><rect x="8" y="7" width="8" height="10" rx="3"/></HudIcon>;
}
export function IconPause() {
    return <HudIcon><path d="M8 5v14M16 5v14" /></HudIcon>;
}
export function IconPlay() {
    return <HudIcon><path d="M8 5v14l12-7z" /></HudIcon>;
}
export function IconMenu() {
    return <HudIcon><path d="M4 7h16M4 12h16M4 17h16" /></HudIcon>;
}
export function IconInspect() {
    return <HudIcon><path d="M5 4h6l2 3h6v13H5z" /><circle cx="11" cy="13" r="2.4" /><path d="m13 15 2.4 2.4" /></HudIcon>;
}
export function IconTown() {
    return <HudIcon><circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3" /></HudIcon>;
}
export function IconTracker() {
    return <HudIcon><path d="M8 7h11M8 12h11M8 17h8"/><circle cx="5" cy="7" r="1.15" fill="currentColor" stroke="none"/><circle cx="5" cy="12" r="1.15" fill="currentColor" stroke="none"/><circle cx="5" cy="17" r="1.15" fill="currentColor" stroke="none"/></HudIcon>;
}
export function IconRotate() {
    return <HudIcon><path d="M20 12a8 8 0 1 1-2.2-5.5M20 4v6h-6" /></HudIcon>;
}
export function IconFunds() {
    return <HudIcon><ellipse cx="12" cy="6.5" rx="7" ry="2.8"/><path d="M5 6.5v5.5c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8V6.5M5 12v5.5c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8V12"/></HudIcon>;
}
export function IconParked() {
    return <HudIcon><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M10 16V8h2.8a2.4 2.4 0 0 1 0 4.8H10"/></HudIcon>;
}
export function IconCar() {
    return <HudIcon><path d="M5 16v-4l2-5h10l2 5v4M3.5 16h17M5 12h14"/><circle cx="8" cy="17.5" r="1.6"/><circle cx="16" cy="17.5" r="1.6"/></HudIcon>;
}
export function IconHeartCrack() {
    return <HudIcon><path d="M12 20s-7.5-4.4-7.5-10A4.3 4.3 0 0 1 12 7.3 4.3 4.3 0 0 1 19.5 10c0 5.6-7.5 10-7.5 10z"/><path d="m12 7.3-1.5 4 3 1.6L12 17"/></HudIcon>;
}
export function IconClock() {
    return <HudIcon><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></HudIcon>;
}
export function IconWeather({label}:{label:string}) {
    if (label === 'Clear') return <HudIcon><circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/></HudIcon>;
    const cloud = <path d="M7.5 16.5h9.5a3.5 3.5 0 0 0 .3-7A5 5 0 0 0 7.8 9 3.8 3.8 0 0 0 7.5 16.5z"/>;
    if (label === 'Showers' || label === 'Rain' || label === 'Storm') return <HudIcon>{cloud}<path d={label === 'Storm' ? 'm12.5 17.5-2 3h3l-2 3' : 'M9 19l-1 2.5M13 19l-1 2.5M17 19l-1 2.5'}/></HudIcon>;
    if (label === 'Off') return <HudIcon>{cloud}<path d="M4 4l16 16"/></HudIcon>;
    return <HudIcon>{cloud}</HudIcon>;
}
export function IconAlert() {
    return <HudIcon><path d="M12 4 2.8 19.5h18.4z"/><path d="M12 10v4.2M12 17v.01"/></HudIcon>;
}
export function IconSiren() {
    return <HudIcon><path d="M6.5 18v-5a5.5 5.5 0 0 1 11 0v5M4 18h16v2.5H4zM12 3v1.5M4.2 6.2l1 1M19.8 6.2l-1 1"/></HudIcon>;
}
export function IconHome() {
    return <HudIcon><path d="M4 11 12 4l8 7M6 9.5V20h12V9.5M10 20v-5h4v5"/></HudIcon>;
}
export function IconBus() {
    return <HudIcon><rect x="5" y="3.5" width="14" height="14" rx="2.5"/><path d="M5 11h14M8 17.5V20M16 17.5V20"/><circle cx="8.5" cy="14.3" r=".6" fill="currentColor"/><circle cx="15.5" cy="14.3" r=".6" fill="currentColor"/></HudIcon>;
}
export function IconTarget() {
    return <HudIcon><circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="2.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></HudIcon>;
}
