import {useState} from 'react';
import {getSaveLoadProblem,getSaveRecoveryNotice,getPreservedSaveCopies} from '../state/save.ts';
import {ChallengeMenu,ChallengeGame} from './Challenges.tsx';
/**
 * Screen router. One phase visible at a time; the 'playing' phase stacks the
 * React HUD above the Pixi canvas.
 *
 * #app-frame (styled in styles/app.css) is the device frame: a centered
 * frame that follows the saved game display preference while playing.
 * Everything — canvas and DOM UI — lives inside it, so they always align.
 */
import { useStore } from '../state/store.ts';
import LoadingScreen from './LoadingScreen.tsx';
import MainMenu from './MainMenu.tsx';
import Hud from './Hud.tsx';
import GameCanvas from '../game/GameCanvas.tsx';

function downloadPreservedCopies() {
    const blob=new Blob([JSON.stringify({copies:getPreservedSaveCopies()},null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob),link=document.createElement('a');
    link.href=url;link.download='working-on-it-preserved-saves.json';link.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export default function App() {
    const phase = useStore((s) => s.phase);
    const displayMode = useStore(s => s.displayMode);
    const showTips = useStore((s) => s.showTips);
    const [noticeDismissed,setNoticeDismissed]=useState(false);
    const problem=phase==='loading'?null:getSaveLoadProblem();
    const notice=phase==='menu'&&!noticeDismissed?getSaveRecoveryNotice():null;
    if(problem)return <div id="app-frame" data-phase="recovery" style={{display:'grid',placeItems:'center',padding:24,background:'#172b45',color:'#fff'}}>
        <section role="alert" aria-labelledby="save-recovery-title" style={{maxWidth:560,lineHeight:1.5}}>
            <h1 id="save-recovery-title">Your town needs recovery</h1>
            <p>{problem}</p>
            <p>Gameplay is paused and saving is disabled to protect your original town.</p>
            <div style={{display:'flex',flexWrap:'wrap',gap:12}}>
                <button onClick={downloadPreservedCopies}>Download preserved copies</button>
                <button onClick={()=>location.reload()}>Retry loading</button>
            </div>
        </section>
    </div>;
    return (
        <div id="app-frame" data-phase={phase} data-display-mode={displayMode} className={`bg-surface text-white${showTips ? '' : ' hide-gameplay-tips'}`}>
            {notice&&<aside role="status" style={{position:'absolute',bottom:12,left:12,right:12,zIndex:100,padding:12,background:'#172b45',border:'1px solid #ffe179',borderRadius:8}}>
                <p style={{margin:'0 0 8px'}}>{notice}</p>
                <button onClick={downloadPreservedCopies}>Download original copies</button>{' '}
                <button onClick={()=>setNoticeDismissed(true)}>Dismiss</button>
            </aside>}
            {phase === 'loading'  && <LoadingScreen />}
            {phase === 'menu' && <MainMenu />}
            {phase === 'challenges' && <ChallengeMenu />}
            {phase === 'challenge' && <ChallengeGame />}
            {phase === 'playing' && (
                <div className="absolute inset-0">
                    <GameCanvas />
                    <Hud />
                </div>
            )}

        </div>
    );
}
