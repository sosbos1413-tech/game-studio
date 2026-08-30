import { useGameStore } from '../../state/gameStore';
import { BASE_SHAPES, STYLE_PRESETS, SYMBOLS, stylePresetById } from '../../data/crestOptions';
import type { CrestSpec } from '../../domain/types';
import { CrestRenderer } from './CrestRenderer';
import { CrestMockups } from './CrestMockups';

export function CrestStudioScreen() {
  const draftOrg = useGameStore((s) => s.draftOrg);
  const updateDraftCrest = useGameStore((s) => s.updateDraftCrest);
  const confirmCrestAndEnterDesk = useGameStore((s) => s.confirmCrestAndEnterDesk);

  if (!draftOrg) return null;
  const crest = draftOrg.crest;

  function patch(partial: Partial<CrestSpec>) {
    updateDraftCrest({ ...crest, ...partial });
  }

  function applyStyle(styleId: CrestSpec['style']) {
    const preset = stylePresetById(styleId);
    patch({
      style: styleId,
      primaryColor: preset.primaryColor,
      secondaryColor: preset.secondaryColor,
      accentColor: preset.accentColor,
      backgroundColor: preset.backgroundColor,
    });
  }

  return (
    <div className="paper-card">
      <div className="pin" aria-hidden="true" />
      <div className="stamp" style={{ position: 'absolute', top: 14, insetInlineEnd: 16 }}>
        سري
      </div>
      <h2>Crest &amp; Brand Studio</h2>
      <p style={{ color: 'var(--ink-soft)', marginTop: -6 }}>
        طاولة تصميم {draftOrg.name} — العصر السري. اختر الشكل والرمز واللون قبل أن يظهر الشعار في
        العالم.
      </p>

      <div className="grid grid-2" style={{ alignItems: 'start', marginTop: 16 }}>
        <div>
          <div className="section-title">الشكل الأساسي</div>
          <div className="chip-row">
            {BASE_SHAPES.map((shape) => (
              <button
                key={shape.id}
                type="button"
                className={`chip ${crest.baseShape === shape.id ? 'selected' : ''}`}
                onClick={() => patch({ baseShape: shape.id })}
              >
                {shape.labelAr}
              </button>
            ))}
          </div>

          <div className="section-title" style={{ marginTop: 16 }}>
            الرمز
          </div>
          <div className="chip-row">
            {SYMBOLS.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`chip ${crest.symbol === s.id ? 'selected' : ''}`}
                onClick={() => patch({ symbol: s.id })}
              >
                {s.labelAr}
              </button>
            ))}
          </div>

          <div className="section-title" style={{ marginTop: 16 }}>
            النمط
          </div>
          <div className="chip-row">
            {STYLE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={`chip ${crest.style === preset.id ? 'selected' : ''}`}
                onClick={() => applyStyle(preset.id)}
              >
                {preset.labelAr}
              </button>
            ))}
          </div>

          <div className="grid grid-2" style={{ marginTop: 16 }}>
            <div className="field">
              <label>سماكة الحواف</label>
              <input
                type="range"
                min={0}
                max={10}
                value={crest.outlineThickness}
                onChange={(e) => patch({ outlineThickness: Number(e.target.value) })}
              />
            </div>
            <div className="field">
              <label>حجم الرمز</label>
              <input
                type="range"
                min={0.5}
                max={1.5}
                step={0.05}
                value={crest.symbolSize}
                onChange={(e) => patch({ symbolSize: Number(e.target.value) })}
              />
            </div>
            <div className="field">
              <label>دوران الرمز</label>
              <input
                type="range"
                min={-45}
                max={45}
                value={crest.symbolRotation}
                onChange={(e) => patch({ symbolRotation: Number(e.target.value) })}
              />
            </div>
            <div className="field">
              <label>اللمسة النهائية</label>
              <select
                value={crest.finish}
                onChange={(e) => patch({ finish: e.target.value as CrestSpec['finish'] })}
              >
                <option value="flat">مسطحة</option>
                <option value="metallic">معدنية</option>
              </select>
            </div>
          </div>

          <div className="field">
            <label>حرف مختصر (اختياري إذا لا يوجد رمز)</label>
            <input
              value={crest.letterMark}
              maxLength={3}
              onChange={(e) => patch({ letterMark: e.target.value.toUpperCase() })}
            />
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div className="section-title" style={{ justifyContent: 'center' }}>
            معاينة مباشرة
          </div>
          <div
            style={{
              background: '#1c1710',
              borderRadius: 12,
              padding: 24,
              display: 'inline-block',
            }}
          >
            <CrestRenderer crest={crest} size={180} />
          </div>

          <CrestMockups crest={crest} org={draftOrg} />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
        <button type="button" className="btn" onClick={confirmCrestAndEnterDesk}>
          اعتماد الشعار والدخول إلى المكتب
        </button>
      </div>
    </div>
  );
}
