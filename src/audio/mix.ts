/** Measured clip trims, before the user's SFX fader. See docs/audio/mix/README.md. */
const FOREGROUND=-20, RAIN=-26, TRAFFIC=-29;
export const SFX_MIX = {
 'audio/vehicles/FireTruckSiren_S08ER.232.mp3': {lufs:-15.91, target:FOREGROUND},
 'audio/vehicles/PoliceSiren_AP1.1061.mp3': {lufs:-8.09, target:FOREGROUND},
 'audio/vehicles/AmbulanceDrive_S08ER.19.mp3': {lufs:-18.69, target:FOREGROUND},
 'audio/construction/demolition.mp3': {lufs:-14.51, target:FOREGROUND},
 'audio/crashes/crash-minor-01.mp3': {lufs:-6.13, target:FOREGROUND},
 'audio/crashes/crash-minor-02.mp3': {lufs:-8.66, target:FOREGROUND},
 'audio/crashes/crash-minor-03.mp3': {lufs:-11.77, target:FOREGROUND},
 'audio/crashes/crash-minor-04.mp3': {lufs:-14.41, target:FOREGROUND},
 'audio/crashes/crash-minor-05.mp3': {lufs:-10.19, target:FOREGROUND},
 'audio/crashes/crash-minor-06.mp3': {lufs:-8.88, target:FOREGROUND},
 'audio/weather/rain-2.mp3': {lufs:-22.53, target:RAIN},
 'audio/weather/rain-3.mp3': {lufs:-22.41, target:RAIN},
 'audio/weather/rain-5.mp3': {lufs:-22.51, target:RAIN},
 'audio/vehicles/CarPassBy_BW.62241.mp3': {lufs:-17.40, target:TRAFFIC},
 'audio/vehicles/CarPassBy_S011TM.11.mp3': {lufs:-22.18, target:TRAFFIC},
 'audio/vehicles/CarPassBy_S011TM.17.mp3': {lufs:-20.99, target:TRAFFIC},
 'audio/vehicles/CarPassBy_S011TM.18.mp3': {lufs:-22.83, target:TRAFFIC},
} as const;
export type SfxSource = keyof typeof SFX_MIX;
const trims = Object.fromEntries(Object.entries(SFX_MIX).map(([src,{lufs,target}])=>[
 src, Math.min(1,10**((target-lufs)/20)),
])) as Record<SfxSource,number>;
const unit=(value:number)=>Number.isFinite(value)?Math.min(1,Math.max(0,value)):0;
/** Attenuation only: the entire slider range scales every clip proportionally. */
export function sfxVolume(src:SfxSource, master:number, envelope=1):number {
 return unit(master)*trims[src]*unit(envelope);
}
