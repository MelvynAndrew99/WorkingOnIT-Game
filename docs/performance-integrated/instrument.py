"""Temporary snapshot-only instrumentation, never shipped in runtime."""
from pathlib import Path
import sys
root=Path(sys.argv[1]); p=root/'src/game/cityScene.ts'; s=p.read_text()
for name in ['report','renderGround','renderWorld','renderCars','renderControls','renderActivity','preview','syncWeather','layout']:
    old=f'function {name}() {{'
    assert s.count(old)==1,name
    s=s.replace(old,f'''function {name}() {{ const start=performance.now(); try {{ return perfOriginal_{name}(); }} finally {{ (window as any).__perfRecord?.('{name}', performance.now()-start); }} }}
    function perfOriginal_{name}() {{''')
s=s.replace('if(session)session.step(dt);else stepCity(city, dt);',"const perfStart=performance.now(); if(session)session.step(dt);else stepCity(city, dt); (window as any).__perfRecord?.('simulation',performance.now()-perfStart);")
p.write_text(s)
p=root/'src/game/pixiApp.ts';s=p.read_text().replace('host.appendChild(app.canvas);',"""const originalRender=app.renderer.render.bind(app.renderer);
    app.renderer.render=((...args:any[])=>{const start=performance.now();try{return (originalRender as any)(...args);}finally{(window as any).__perfRecord?.('pixiSubmit',performance.now()-start);}}) as any;
    host.appendChild(app.canvas);""");p.write_text(s)
p=root/'src/main.tsx';s=p.read_text()
for i,path in enumerate(['/src/state/save.ts','/src/state/store.ts','/src/game/cityControls.ts','/src/game/cityModel.ts','/src/game/cityPrivateLanes.ts','/src/audio/radio.ts']):
    s+=f"\nimport * as perfModule{i} from '.{path.removeprefix('/src')}';\n(window as any).__gameModules ??= {{}}; (window as any).__gameModules['{path}']=perfModule{i};\n"
p.write_text(s)
