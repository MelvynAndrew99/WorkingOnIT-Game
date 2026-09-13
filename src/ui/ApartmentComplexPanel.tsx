import {cityCommand} from '../game/cityControls.ts';
import {useStore} from '../state/store.ts';

export default function ApartmentComplexPanel() {
    const panel=useStore(s=>s.apartmentComplexPanel);
    const draft=useStore(s=>s.apartmentComplexDraft);
    const preview=useStore(s=>s.apartmentComplexPreview);
    if(!panel)return null;
    const choosing=draft!==null;
    return <div className="direction-editor place-card" role="group" aria-label="Apartment complex">
        <p className="place-card-title">Complex</p>
        <p className="place-card-stats">{panel.blocks} {panel.blocks===1?'block':'blocks'} · {panel.residents} residents</p>
        {!panel.connected&&<p className="place-card-hint" role="status">The blocks’ access is disconnected. Rejoin through clear space to restore private lanes.</p>}
        {!choosing&&<p className="place-card-hint">The community manages its private lanes. Connect them to a public road for shared entry and exit.</p>}
        {choosing&&<p className="place-card-hint">{preview?`${preview.added.length} new lane tiles · $${preview.cost}. Review the highlighted route, then join.`:'Tap a nearby apartment to preview its connecting lanes.'}</p>}
        <div className="direction-actions">
        {choosing&&preview&&<button className="place-primary" onClick={()=>cityCommand({type:'apartment-complex',id:draft,apply:true})}>Build lanes &amp; join · ${preview.cost}</button>}
            {choosing
                ? <button onClick={()=>cityCommand({type:'apartment-complex',id:draft,cancel:true})}>Cancel join</button>
                : <button className="place-primary" onClick={()=>cityCommand({type:'apartment-complex',id:panel.id})}>Join complex</button>}
        </div>
    </div>;
}
