export function AwardRibbon({className='',number}:{className?:string;number?:number}){
  return <svg viewBox="0 0 48 64" className={className} aria-hidden="true">
    <path d="M11 29L6 61L18 54L25 62L27 29M24 30L28 62L36 54L44 59L36 28" fill="#087b79" stroke="#ffd268" strokeWidth="2"/>
    <path d="M24 2L29 6L36 5L38 12L44 16L41 23L43 30L36 33L33 40L25 38L18 41L14 34L7 32L8 24L4 18L10 13L12 6L19 6Z" fill="#edb84f" stroke="#ffe6a0" strokeWidth="2"/>
    <circle cx="24" cy="22" r="12" fill="#165953" stroke="#fff0ba" strokeWidth="2"/>
    <path d="M17 22L22 27L31 17" fill="none" stroke="#ffe4a0" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    {number!==undefined&&<text x="25" y="54" textAnchor="middle" fill="#fff5d8" fontSize="13" fontWeight="900">{number}</text>}
  </svg>;
}
