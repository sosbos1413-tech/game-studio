import { useState } from 'react';
import { useGameStore } from '../../state/gameStore';
import { REGIONS } from '../../data/regions';
import { ROLE_LABELS_AR } from '../../data/nameGenerator';
import { CrestRenderer } from '../crest-studio/CrestRenderer';
import { EraBadge, eraById } from '../world-eras/EraBadge';
import { NavSidebar } from './NavSidebar';

export function ManagerDeskScreen() {
  const world = useGameStore((s) => s.world);
  const triggerAutosave = useGameStore((s) => s.triggerAutosave);
  const [activeSection, setActiveSection] = useState('desk');

  if (!world) return null;
  const { organization: org, currentEraId, clock } = world;
  const region = REGIONS.find((r) => r.id === org.regionId);
  const era = eraById(currentEraId);

  return (
    <div>
      <div className="top-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <CrestRenderer crest={org.crest} size={44} />
          <div>
            <div style={{ fontWeight: 700 }}>{org.name}</div>
            <div style={{ fontSize: 12, color: 'var(--brass-light)' }}>
              {org.tag} · {region?.nameAr} · {org.hqCity}
            </div>
          </div>
        </div>
        <EraBadge eraId={currentEraId} />
      </div>

      <div className="grid" style={{ gridTemplateColumns: '220px 1fr', alignItems: 'start' }}>
        <NavSidebar
          currentEraId={currentEraId}
          activeSection={activeSection}
          onSelect={setActiveSection}
        />

        <div className="grid grid-2">
          <div className="paper-card">
            <div className="pin" aria-hidden="true" />
            <div className="section-title">هوية المنظمة</div>
            <p style={{ marginTop: 0 }}>
              تأسست عام {org.foundingYear} في {org.hqCity}. {era.taglineAr}
            </p>
            <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>{era.descriptionAr}</p>
          </div>

          <div className="paper-card">
            <div className="section-title">التشكيلة (تعريفية)</div>
            <ul style={{ margin: 0, paddingInlineStart: 18 }}>
              {world.rosterTeaser.map((slot) => (
                <li key={slot.id} style={{ marginBottom: 4 }}>
                  {slot.displayName} — {ROLE_LABELS_AR[slot.role]}
                </li>
              ))}
            </ul>
            <p style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
              التشكيلة الكاملة وبطاقات اللاعبين تُفتح في الجزء الثاني.
            </p>
          </div>

          <div className="paper-card">
            <div className="section-title">دفتر المالية</div>
            <p style={{ margin: 0 }}>الرصيد الحالي: ${org.cash.toLocaleString('en-US')}</p>
            <p style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
              الاقتصاد الكامل (رعاة، جمهور، عقود) يُفتح لاحقًا.
            </p>
          </div>

          <div className="paper-card">
            <div className="section-title">ملف المنافس القادم</div>
            <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
              لا توجد مباريات مجدولة بعد — Scrims والبطولات تصل مع الجزء الثاني.
            </p>
          </div>

          <div className="paper-card" style={{ gridColumn: '1 / -1' }}>
            <div className="section-title">الجدول والأخبار</div>
            <p style={{ fontSize: 13 }}>
              اليوم {clock.day} من مسيرة {org.name}. لا توجد تحديثات (Patch) بعد — أول إشارة ستصل
              قريبًا.
            </p>
            <button
              type="button"
              className="btn"
              onClick={() => triggerAutosave('manual')}
              title="حفظ يدوي — الحفظ التلقائي يعمل أيضًا عند الأحداث الكبرى لاحقًا"
            >
              حفظ الآن
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
