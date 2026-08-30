import { NAV_SECTIONS } from '../../data/navSections';
import type { EraId } from '../../domain/types';
import { ERAS } from '../../data/eras';

interface NavSidebarProps {
  currentEraId: EraId;
  activeSection: string;
  onSelect: (id: string) => void;
}

export function NavSidebar({ currentEraId, activeSection, onSelect }: NavSidebarProps) {
  const currentEraOrder = ERAS.find((e) => e.id === currentEraId)?.order ?? 1;

  return (
    <nav className="paper-card" style={{ padding: 12 }}>
      <div className="section-title">التنقل</div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {NAV_SECTIONS.map((section) => {
          const eraOrder = ERAS.find((e) => e.id === section.unlocksAtEra)?.order ?? 1;
          const isUnlockedByEra = eraOrder <= currentEraOrder;
          const isUsable = section.implemented && isUnlockedByEra;
          return (
            <li key={section.id}>
              <button
                type="button"
                disabled={!isUsable}
                className={isUsable ? '' : 'nav-locked'}
                style={{
                  width: '100%',
                  textAlign: 'start',
                  background: activeSection === section.id ? 'rgba(184,134,47,0.25)' : 'transparent',
                  border: 'none',
                  borderRadius: 4,
                  padding: '8px 10px',
                  color: 'var(--ink)',
                  fontSize: 14,
                }}
                onClick={() => isUsable && onSelect(section.id)}
                title={
                  !isUnlockedByEra
                    ? 'يُفتح في عصر لاحق'
                    : !section.implemented
                      ? 'قيد الإنشاء'
                      : undefined
                }
              >
                {section.labelAr}
                {!isUsable && <span style={{ fontSize: 11, opacity: 0.7 }}> 🔒</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
