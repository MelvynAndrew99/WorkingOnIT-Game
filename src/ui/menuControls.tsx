import type {CSSProperties, ReactNode} from 'react';

export function MenuToggle({label, hint, checked, onChange}:{label:string; hint?:string; checked:boolean; onChange:(value:boolean)=>void}) {
    return <div className="menu-toggle-block">
        <label className="menu-toggle">
            <span className="menu-toggle-copy">{label}</span>
            <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
            <span className="menu-toggle-track" aria-hidden="true"><span /></span>
        </label>
        {hint && <p className="menu-hint">{hint}</p>}
    </div>;
}

export function VolumeMixer({icon, label, volumeLabel, hint, muted, volume, onMuted, onVolume}:{
    icon: ReactNode; label: string; volumeLabel: string; hint?: string;
    muted: boolean; volume: number; onMuted: (value: boolean) => void; onVolume: (value: number) => void;
}) {
    const percent = Math.round(volume * 100);
    return <div className={`menu-mixer${muted ? ' is-muted' : ''}`}>
        <div className="menu-mixer-top">
            <span className="menu-mixer-icon" aria-hidden="true">{icon}</span>
            <MenuToggle label={label} checked={!muted} onChange={value => onMuted(!value)} />
        </div>
        <div className="menu-fader">
            <div className="menu-fader-rail" aria-hidden="true">
                <div className="menu-fader-fill" style={{width: `${percent}%`}} />
            </div>
            <input
                className="menu-fader-input"
                style={{'--fill': `${percent}%`} as CSSProperties}
                aria-label={volumeLabel}
                type="range"
                min="0"
                max="100"
                step="1"
                value={percent}
                onChange={e => onVolume(Number(e.target.value) / 100)}
            />
            <span className="menu-fader-value">{muted ? 'Off' : `${percent}%`}</span>
        </div>
        {hint && <p className="menu-hint">{hint}</p>}
    </div>;
}

export function IconMusic() {
    return <svg viewBox="0 0 24 24"><path d="M10 18V7l10-2v11" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><circle cx="8" cy="18" r="2.5" /><circle cx="18" cy="16" r="2.5" /></svg>;
}

export function IconSpeaker() {
    return <svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><path d="M16.5 9.5a4 4 0 0 1 0 5M18.7 7.3a7 7 0 0 1 0 9.4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
}

/** A labelled block inside Game options. Use for simulation style, radio, or other pause settings. */
export function MenuOption({title, hint, children}:{title?:string; hint?:string; children:ReactNode}) {
    return <div className="menu-option">
        {title && <p className="menu-choice-label">{title}</p>}
        {children}
        {hint && <p className="menu-hint">{hint}</p>}
    </div>;
}
