import type { CrestSpec } from '../../domain/types';

interface CrestRendererProps {
  crest: CrestSpec;
  size?: number;
}

// Renders a crest as a self-contained inline SVG built purely from the
// CrestSpec — no external image assets, so it works identically in the
// studio editor and every mockup surface (jersey/card/news/trophy).
export function CrestRenderer({ crest, size = 120 }: CrestRendererProps) {
  const {
    baseShape,
    symbol,
    letterMark,
    primaryColor,
    secondaryColor,
    accentColor,
    backgroundColor,
    finish,
    outlineThickness,
    symbolSize,
    symbolRotation,
  } = crest;

  const strokeWidth = Math.max(1, outlineThickness);
  const gradId = 'crest-metal-grad';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      role="img"
      aria-label="شعار المنظمة"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="45%" stopColor={secondaryColor} stopOpacity="0.15" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.25" />
        </linearGradient>
      </defs>

      <rect x="0" y="0" width="200" height="200" fill="transparent" />

      {renderBaseShape(baseShape, primaryColor, secondaryColor, backgroundColor, strokeWidth)}

      {finish === 'metallic' && (
        <BaseShapeMask shape={baseShape}>
          <rect x="0" y="0" width="200" height="200" fill={`url(#${gradId})`} />
        </BaseShapeMask>
      )}

      <g
        transform={`translate(100 100) rotate(${symbolRotation}) scale(${symbolSize}) translate(-100 -100)`}
      >
        {renderSymbol(symbol, accentColor)}
      </g>

      {letterMark && symbol === 'none' && (
        <text
          x="100"
          y="118"
          textAnchor="middle"
          fontSize="56"
          fontWeight="800"
          fill={accentColor}
          fontFamily="Tahoma, sans-serif"
        >
          {letterMark}
        </text>
      )}
    </svg>
  );
}

function BaseShapeMask({
  shape,
  children,
}: {
  shape: CrestSpec['baseShape'];
  children: React.ReactNode;
}) {
  const clipId = `clip-${shape}`;
  return (
    <>
      <clipPath id={clipId}>{shapeClipPath(shape)}</clipPath>
      <g clipPath={`url(#${clipId})`}>{children}</g>
    </>
  );
}

function shapeClipPath(shape: CrestSpec['baseShape']) {
  switch (shape) {
    case 'circle':
      return <circle cx="100" cy="100" r="90" />;
    case 'diamond':
      return <polygon points="100,10 190,100 100,190 10,100" />;
    case 'hexagon':
      return <polygon points="100,10 180,55 180,145 100,190 20,145 20,55" />;
    case 'shield':
    case 'crest':
    default:
      return <path d={SHIELD_PATH} />;
  }
}

const SHIELD_PATH =
  'M100,10 L180,35 L180,105 C180,150 145,175 100,195 C55,175 20,150 20,105 L20,35 Z';

function renderBaseShape(
  shape: CrestSpec['baseShape'],
  primary: string,
  secondary: string,
  background: string,
  strokeWidth: number,
) {
  const common = {
    fill: primary,
    stroke: secondary,
    strokeWidth,
  };

  switch (shape) {
    case 'circle':
      return (
        <>
          <circle cx="100" cy="100" r="92" fill={background} />
          <circle cx="100" cy="100" r="88" {...common} />
        </>
      );
    case 'diamond':
      return (
        <>
          <polygon points="100,4 196,100 100,196 4,100" fill={background} />
          <polygon points="100,10 190,100 100,190 10,100" {...common} />
        </>
      );
    case 'hexagon':
      return (
        <>
          <polygon points="100,4 184,52 184,148 100,196 16,148 16,52" fill={background} />
          <polygon points="100,10 180,55 180,145 100,190 20,145 20,55" {...common} />
        </>
      );
    case 'minimal-badge':
      return <rect x="20" y="20" width="160" height="160" rx="16" {...common} />;
    case 'no-frame':
      return null;
    case 'wings-frame':
      return (
        <>
          <path d={SHIELD_PATH} {...common} />
          <path
            d="M20,70 C0,80 -10,110 5,140 C15,120 22,100 22,80 Z"
            fill={secondary}
          />
          <path
            d="M180,70 C200,80 210,110 195,140 C185,120 178,100 178,80 Z"
            fill={secondary}
          />
        </>
      );
    case 'laurel-frame':
      return (
        <>
          <circle cx="100" cy="100" r="80" fill={background} />
          <circle cx="100" cy="100" r="76" fill={primary} stroke={secondary} strokeWidth={strokeWidth} />
          <path
            d="M30,140 C15,110 15,80 35,55"
            fill="none"
            stroke={secondary}
            strokeWidth="6"
            strokeLinecap="round"
          />
          <path
            d="M170,140 C185,110 185,80 165,55"
            fill="none"
            stroke={secondary}
            strokeWidth="6"
            strokeLinecap="round"
          />
        </>
      );
    case 'shield':
    case 'crest':
    default:
      return (
        <>
          <path d={SHIELD_PATH} fill={background} />
          <path
            d="M100,18 L172,40 L172,104 C172,144 141,166 100,184 C59,166 28,144 28,104 L28,40 Z"
            {...common}
          />
        </>
      );
  }
}

function renderSymbol(symbol: CrestSpec['symbol'], color: string) {
  const stroke = color;
  switch (symbol) {
    case 'none':
      return null;
    case 'wolf':
      return (
        <path
          d="M60,140 L80,80 L100,100 L120,80 L140,140 L120,130 L100,140 L80,130 Z"
          fill={stroke}
        />
      );
    case 'falcon':
    case 'raven':
      return (
        <path
          d="M100,60 C70,70 50,95 40,130 C60,120 80,115 100,120 C120,115 140,120 160,130 C150,95 130,70 100,60 Z"
          fill={stroke}
        />
      );
    case 'lion':
      return <circle cx="100" cy="105" r="38" fill={stroke} />;
    case 'dragon':
      return (
        <path
          d="M50,120 Q75,60 100,90 Q125,60 150,120 Q125,100 100,110 Q75,100 50,120 Z"
          fill={stroke}
        />
      );
    case 'cobra':
      return (
        <path
          d="M100,50 C130,70 130,110 100,150 C70,110 70,70 100,50 Z"
          fill={stroke}
        />
      );
    case 'phoenix':
      return (
        <path
          d="M100,45 C60,70 45,120 100,155 C155,120 140,70 100,45 Z M100,70 L100,130"
          fill={stroke}
        />
      );
    case 'crown':
      return (
        <path
          d="M50,130 L60,80 L85,105 L100,70 L115,105 L140,80 L150,130 Z"
          fill={stroke}
        />
      );
    case 'flame':
      return (
        <path
          d="M100,50 C120,80 130,100 110,130 C120,110 100,100 95,120 C80,100 90,80 100,50 Z"
          fill={stroke}
        />
      );
    case 'lightning':
      return <polygon points="110,45 75,110 95,110 85,155 130,90 108,90" fill={stroke} />;
    case 'star':
      return (
        <polygon
          points="100,45 112,85 155,85 120,110 132,150 100,127 68,150 80,110 45,85 88,85"
          fill={stroke}
        />
      );
    case 'sword':
      return (
        <path
          d="M96,40 L104,40 L104,120 L118,134 L100,152 L82,134 L96,120 Z"
          fill={stroke}
        />
      );
    case 'helmet':
      return <path d="M60,120 C60,80 140,80 140,120 L140,140 L60,140 Z" fill={stroke} />;
    case 'eye':
      return (
        <>
          <path d="M50,100 C75,75 125,75 150,100 C125,125 75,125 50,100 Z" fill={stroke} />
          <circle cx="100" cy="100" r="14" fill="var(--paper,#f3e9d2)" />
        </>
      );
    case 'geometric':
      return <polygon points="100,55 145,100 100,145 55,100" fill={stroke} />;
    case 'abstract':
      return (
        <path
          d="M60,60 C90,50 130,70 140,100 C130,130 90,150 60,140 C80,120 80,80 60,60 Z"
          fill={stroke}
        />
      );
    default:
      return null;
  }
}
