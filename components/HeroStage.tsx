import { Mark } from "./Logo";

export function HeroStage() {
  return (
    <div className="hero-stage">
      <div className="hero-rings" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <Mark id="hero" size={220} className="hero-mark" title="Sentinel AI shield" />
    </div>
  );
}
