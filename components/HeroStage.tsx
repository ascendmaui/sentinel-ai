import { Mark } from "./Logo";
import { HeroFigure } from "./HeroFigure";
import { BRAND_NAME } from "../lib/brand";

/** Static SVG mark is the server-rendered fallback; the canvas figure fades in over it. */
export function HeroStage() {
  return (
    <div className="hero-stage" data-hero-stage>
      <div className="hero-rings" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <Mark id="hero" size={220} className="hero-mark" title={`${BRAND_NAME} seraphim mark`} />
      <HeroFigure />
    </div>
  );
}
