import type { CrestSpec, Organization } from '../../domain/types';
import { CrestRenderer } from './CrestRenderer';

interface MockupProps {
  crest: CrestSpec;
  org: Pick<Organization, 'name' | 'tag' | 'primaryColor' | 'secondaryColor'>;
}

// Live-preview surfaces required by the master prompt §14: jersey, player
// card, match graphic, news article, trophy banner.
export function CrestMockups({ crest, org }: MockupProps) {
  return (
    <div className="grid grid-3" style={{ marginTop: 16 }}>
      <MockupFrame label="القميص">
        <div
          style={{
            background: org.primaryColor,
            borderRadius: 10,
            padding: '18px 12px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <CrestRenderer crest={crest} size={70} />
          <span style={{ color: org.secondaryColor, fontWeight: 700, letterSpacing: 2 }}>
            {org.tag}
          </span>
        </div>
      </MockupFrame>

      <MockupFrame label="بطاقة لاعب">
        <div className="paper-card" style={{ textAlign: 'center', padding: 12 }}>
          <CrestRenderer crest={crest} size={56} />
          <div style={{ fontSize: 12, marginTop: 6 }}>{org.name}</div>
          <div className="stamp" style={{ marginTop: 6, fontSize: '0.6rem' }}>
            روستر
          </div>
        </div>
      </MockupFrame>

      <MockupFrame label="بانر البطولة">
        <div
          style={{
            background: '#1c1710',
            borderRadius: 10,
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <CrestRenderer crest={crest} size={64} />
          <span style={{ color: '#d4af6a', fontSize: 12 }}>{org.name}</span>
        </div>
      </MockupFrame>

      <MockupFrame label="مقال إخباري">
        <div className="paper-card" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <CrestRenderer crest={crest} size={40} />
          <div style={{ fontSize: 11 }}>
            <div style={{ fontWeight: 700 }}>{org.name} تستعد للموسم الجديد</div>
            <div style={{ color: 'var(--ink-soft)' }}>تقرير خاص — العصر السري</div>
          </div>
        </div>
      </MockupFrame>

      <MockupFrame label="رسومات المباراة">
        <div
          style={{
            background: '#0f172a',
            borderRadius: 10,
            padding: 14,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <CrestRenderer crest={crest} size={44} />
          <span style={{ color: '#94a3b8', fontSize: 20, fontWeight: 700 }}>VS</span>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: '#334155',
            }}
          />
        </div>
      </MockupFrame>

      <MockupFrame label="لافتة الأبطال">
        <div
          style={{
            background: 'linear-gradient(180deg,#d4af37,#8a6423)',
            borderRadius: 10,
            padding: 14,
            textAlign: 'center',
          }}
        >
          <CrestRenderer crest={crest} size={50} />
          <div style={{ fontSize: 11, marginTop: 6, color: '#2b2114', fontWeight: 700 }}>
            بطل الموسم
          </div>
        </div>
      </MockupFrame>
    </div>
  );
}

function MockupFrame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ color: 'var(--paper)', fontSize: 12, marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}
