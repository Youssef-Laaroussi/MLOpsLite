import { ArrowRight, Code2, Database, Layers, TrendingUp } from "lucide-react";

/** Lightweight vector/CSS illustration that stays crisp at every screen size. */
export function LifecycleArtwork() {
  return <div className="lifecycle-art" aria-hidden="true">
    <div className="art-platform" />
    {[Database, Code2, Layers, null, TrendingUp].map((Icon, index) => <div className="art-step" key={index}>
      {Icon ? <div className={`art-object art-object-${index}`}><Icon strokeWidth={1.3} /></div> : <div className="iso-cube"><i /><b /><em /></div>}
      {index < 4 && <ArrowRight className="art-arrow" />}
    </div>)}
  </div>;
}
