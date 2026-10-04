import logoMark from '../assets/logo-mark.png'

/** Emblem + wordmark, used by the header, mobile menu and footer. */
export function BrandLogo({ onClick, light = false }: { onClick: () => void; light?: boolean }) {
  return <button type="button" className={light ? 'logo light' : 'logo'} onClick={onClick} aria-label="AgroMEDConnect">
    <img src={logoMark} alt="" width={44} height={44}/>
    <span aria-hidden>AgroMED<b>CONNECT</b></span>
  </button>
}
