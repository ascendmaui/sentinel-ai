import { Mark } from "./Logo";
import { BRAND_NAME } from "../lib/brand";

/** Cinematic hero: abstract scan-light image, slow rings, and the six-wing aperture mark. */
export function HeroStage() {
  return (
    <div className="hero-stage" data-hero-stage>
      <div className="hero-art" aria-hidden="true" />
      <div className="hero-grid" aria-hidden="true" />
      <div className="hero-sweep" aria-hidden="true" />
      <div className="hero-rings" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <Mark id="hero" size={300} square className="hero-mark" title={`${BRAND_NAME} mark`} />
    </div>
  );
}
