import { useState } from 'react';
import { useGameStore } from '../../state/gameStore';
import { REGIONS } from '../../data/regions';
import { deriveTag, suggestOrgName } from '../../data/nameGenerator';
import { STYLE_PRESETS } from '../../data/crestOptions';
import { createSeededRng } from '../../sim/rng';
import type { Organization, RegionId } from '../../domain/types';

const defaultStyle = STYLE_PRESETS[0];
const rngSeedForSuggestions = createSeededRng(String(Date.now()));

export function NewGameScreen() {
  const setDraftOrg = useGameStore((s) => s.setDraftOrg);

  const [name, setName] = useState(suggestOrgName(rngSeedForSuggestions));
  const [managerName, setManagerName] = useState('');
  const [regionId, setRegionId] = useState<RegionId>('middle-east');
  const [hqCity, setHqCity] = useState('');
  const [foundingYear, setFoundingYear] = useState(2003);
  const [primaryColor, setPrimaryColor] = useState(defaultStyle.primaryColor);
  const [secondaryColor, setSecondaryColor] = useState(defaultStyle.secondaryColor);

  const tag = deriveTag(name);
  const canSubmit = name.trim().length >= 2 && hqCity.trim().length >= 2;

  function submit() {
    if (!canSubmit) return;
    const org: Organization = {
      id: `org-${Date.now()}`,
      name: name.trim(),
      tag,
      managerName: managerName.trim() || undefined,
      regionId,
      hqCity: hqCity.trim(),
      foundingYear,
      primaryColor,
      secondaryColor,
      cash: 50_000,
      crest: {
        baseShape: 'shield',
        symbol: 'wolf',
        letterMark: tag,
        style: 'classic',
        primaryColor: defaultStyle.primaryColor,
        secondaryColor: defaultStyle.secondaryColor,
        accentColor: defaultStyle.accentColor,
        backgroundColor: defaultStyle.backgroundColor,
        finish: 'flat',
        outlineThickness: 3,
        symbolSize: 1,
        symbolRotation: 0,
      },
    };
    setDraftOrg(org);
  }

  return (
    <div className="paper-card">
      <div className="pin" aria-hidden="true" />
      <h2>PATCH DAY</h2>
      <p style={{ color: 'var(--ink-soft)', marginTop: -6 }}>
        قبل الدخول إلى المكتب، أسّس منظمتك. القاعدة الذهبية: أنت لا تدير أقوى لاعب — أنت تدير
        منظمة تحاول الازدهار في صناعة تتغير قوانينها باستمرار.
      </p>

      <div className="grid grid-2" style={{ marginTop: 16 }}>
        <div className="field">
          <label>اسم المنظمة</label>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label>الاختصار (تلقائي)</label>
          <input value={tag} readOnly />
        </div>
        <div className="field">
          <label>اسم المدير (اختياري)</label>
          <input value={managerName} onChange={(e) => setManagerName(e.target.value)} />
        </div>
        <div className="field">
          <label>المنطقة</label>
          <select value={regionId} onChange={(e) => setRegionId(e.target.value as RegionId)}>
            {REGIONS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nameAr}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>مدينة المقر</label>
          <input value={hqCity} onChange={(e) => setHqCity(e.target.value)} placeholder="مثال: الفنار" />
        </div>
        <div className="field">
          <label>سنة التأسيس</label>
          <input
            type="number"
            value={foundingYear}
            min={1995}
            max={2010}
            onChange={(e) => setFoundingYear(Number(e.target.value))}
          />
        </div>
      </div>

      <div className="grid grid-2">
        <div className="field">
          <label>اللون الأساسي</label>
          <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} />
        </div>
        <div className="field">
          <label>اللون الثانوي</label>
          <input type="color" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} />
        </div>
      </div>

      <p style={{ color: 'var(--ink-soft)', fontSize: 13 }}>
        {REGIONS.find((r) => r.id === regionId)?.flavorAr}
      </p>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
        <button type="button" className="btn" disabled={!canSubmit} onClick={submit}>
          التالي: تصميم الشعار
        </button>
      </div>
    </div>
  );
}
