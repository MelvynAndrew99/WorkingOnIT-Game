const CONTRIBUTORS = [
    ['Grok', 'Menus and UI layout, main-title artwork, game balance, and verification of game systems.'],
    ['Claude', 'Sprite artwork and corrections to awkward UI interfaces.'],
    ['Codex', 'Agent coordination, complex system and performance problems, and new game elements.'],
    ['Suno', 'Music, generated through the creator’s music workflow.'],
    ['Gemini', 'Idea exploration that helped turn traffic problems into missions.'],
];

export default function CreditsPanel({onClose}: {onClose: () => void}) {
    return <>
        <header className="menu-head">
            <p className="menu-kicker">Working ON IT!</p>
            <div className="menu-head-row">
                <h2 id="title-dialog-heading">Credits</h2>
                <button type="button" className="menu-x" aria-label="Close credits" onClick={onClose} autoFocus>
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
                </button>
            </div>
            <p className="menu-lede">From idea to a playable jam game in roughly seven days.</p>
        </header>
        <div className="menu-body" tabIndex={0} role="region" aria-label="Game credits">
            <section className="menu-card">
                <h3>Design &amp; creative direction</h3>
                <p className="menu-hint">Melvyn Andrew shaped the vision, directed the tools, playtested the results, and decided what belonged in the game.</p>
                <p className="menu-hint">The Man takes the credit. Here’s who helped do the work.</p>
            </section>
            {CONTRIBUTORS.map(([name, contribution]) => <section className="menu-card" key={name}>
                <h3>{name}</h3>
                <p className="menu-hint">{contribution}</p>
            </section>)}
            <section className="menu-card">
                <h3>Built together</h3>
                <p className="menu-hint">Human direction. AI assistance. Shared design docs, pull requests, and review to keep the work understandable and open to collaboration.</p>
                <p className="menu-hint">Built on the RUN.world jam starter with TypeScript, PixiJS, React, Vite, and Tailwind CSS.</p>
                <p className="menu-hint">Thanks to everyone who played, reported a problem, or suggested a better way through town.</p>
                <a className="title-dialog-close" href="https://github.com/MelvynAndrew99/WorkingOnIT-Game" target="_blank" rel="noopener noreferrer">Source, design docs &amp; contributing ↗</a>
            </section>
        </div>
        <footer className="menu-foot">
            <button type="button" className="commute-button" onClick={onClose}>Back to main menu</button>
        </footer>
    </>;
}
