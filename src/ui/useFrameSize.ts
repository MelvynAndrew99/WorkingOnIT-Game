import { useLayoutEffect, useState } from 'react';

/**
 * Measured width of the gameplay frame in CSS pixels.
 *
 * The display preference ('auto' | 'wide' | 'portrait') changes #app-frame's width
 * live, and a desktop player can force the narrow portrait frame. Composition
 * therefore keys off the frame's real width, never the viewport's.
 *
 * The measurement runs in a layout effect: on the first mount #app-frame is not in
 * the document yet, so the initial guess would otherwise paint the wrong layout for
 * a frame and make the renderer re-measure its reserved bands twice.
 */
export const WIDE_FRAME = 860;
/** Below this the objective row stacks and the header tightens its action spacing. */
export const NARROW_FRAME = 380;

export function useFrameWidth(): number {
    const [width, setWidth] = useState(() => document.getElementById('app-frame')?.clientWidth ?? window.innerWidth);
    useLayoutEffect(() => {
        const frame = document.getElementById('app-frame');
        if (!frame) return;
        const observer = new ResizeObserver(() => setWidth(frame.clientWidth));
        observer.observe(frame);
        setWidth(frame.clientWidth);
        return () => observer.disconnect();
    }, []);
    return width;
}
