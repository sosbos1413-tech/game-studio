import { ERAS } from '../../data/eras';
import type { EraId } from '../../domain/types';

export function EraBadge({ eraId }: { eraId: EraId }) {
  const era = ERAS.find((e) => e.id === eraId) ?? ERAS[0];
  return (
    <span className="era-tag" title={era.taglineAr}>
      {era.nameAr} · {era.startYear}
    </span>
  );
}

export function eraById(eraId: EraId) {
  return ERAS.find((e) => e.id === eraId) ?? ERAS[0];
}
