import { ActorData, ActorCategory, GeopoliticalRelationship, RelationType } from '../types';
import b1 from './b1.json';
import b2 from './b2.json';
import b3 from './b3.json';
import b4 from './b4.json';
import { relationshipsData } from './relationships';

interface RawActorItem {
  id: string;
  nameFa: string;
  nameEn: string;
  primaryClass: ActorCategory;
  subclass?: string;
  geography?: string;
  status?: string;
  influenceWeight?: number;
  batch?: string;
  acronym?: string;
  leader?: string;
  headquarters?: string;
  alignment?: string;
  flagEmoji?: string;
  geopoliticalRole?: string;
  militaryCapabilities?: string;
  economicLeverage?: string;
  alliances?: string[];
  activeConflicts?: string[];
  chokepoints?: string[];
  [key: string]: unknown;
}

// Function to pick a relevant flag or icon emoji based on actor attributes
function deriveFlagOrIcon(id: string, nameFa: string, nameEn: string, category: ActorCategory): string {
  const n = `${nameFa} ${nameEn}`.toLowerCase();
  if (n.includes('ایران') || n.includes('iran')) return '🇮🇷';
  if (n.includes('عربستان') || n.includes('saudi')) return '🇸🇦';
  if (n.includes('اسرائیل') || n.includes('israel')) return '🇮🇱';
  if (n.includes('آمریکا') || n.includes('united states') || n.includes('us')) return '🇺🇸';
  if (n.includes('روسیه') || n.includes('russia')) return '🇷🇺';
  if (n.includes('چین') || n.includes('china')) return '🇨🇳';
  if (n.includes('ترکیه') || n.includes('turkey') || n.includes('türkiye')) return '🇹🇷';
  if (n.includes('امارات') || n.includes('uae')) return '🇦🇪';
  if (n.includes('قطر') || n.includes('qatar')) return '🇶🇦';
  if (n.includes('مصر') || n.includes('egypt')) return '🇪🇬';
  if (n.includes('عراق') || n.includes('iraq')) return '🇮🇶';
  if (n.includes('سوریه') || n.includes('syria')) return '🇸🇾';
  if (n.includes('یمن') || n.includes('yemen')) return '🇾🇪';
  if (n.includes('لبنان') || n.includes('lebanon')) return '🇱🇧';
  if (n.includes('فلسطین') || n.includes('palestine') || n.includes('حماس') || n.includes('غزه')) return '🇵🇸';
  if (n.includes('اردن') || n.includes('jordan')) return '🇯🇴';
  if (n.includes('عمان') || n.includes('oman')) return '🇴🇲';
  if (n.includes('کویت') || n.includes('kuwait')) return '🇰🇼';
  if (n.includes('بحرین') || n.includes('bahrain')) return '🇧🇭';
  if (n.includes('آذربایجان') || n.includes('azerbaijan')) return '🇦🇿';
  if (n.includes('ارمنستان') || n.includes('armenia')) return '🇦🇲';
  if (n.includes('افغانستان') || n.includes('afghanistan')) return '🇦🇫';
  if (n.includes('پاکستان') || n.includes('pakistan')) return '🇵🇰';
  if (n.includes('هند') || n.includes('india')) return '🇮🇳';
  if (n.includes('انگلیس') || n.includes('بریتانیا') || n.includes('uk')) return '🇬🇧';
  if (n.includes('فرانسه') || n.includes('france')) return '🇫🇷';
  if (n.includes('آلمان') || n.includes('germany')) return '🇩🇪';
  if (n.includes('سودان') || n.includes('sudan')) return '🇸🇩';
  if (n.includes('اتحادیه اروپا') || n.includes('eu')) return '🇪🇺';
  if (n.includes('ناتو') || n.includes('nato')) return '🛡️';
  if (n.includes('سازمان ملل') || n.includes('un')) return '🇺🇳';
  if (n.includes('حزب‌الله') || n.includes('hezbollah')) return '🔰';
  if (n.includes('انصارالله') || n.includes('حوثی')) return '🇾🇪';
  if (n.includes('اوپک') || n.includes('opec') || n.includes('آرامکو') || n.includes('نفت')) return '🛢️';
  if (category === 'بازیگران مسلح غیردولتی/شبه‌دولتی') return '⚔️';
  if (category === 'بازیگران اقتصادی/انرژی/مالی') return '💼';
  if (category === 'شبکه‌های فراملی ایدئولوژیک/قومی/سایبری/رسانه‌ای') return '📡';
  return '🏛️';
}

function deriveAlignment(item: RawActorItem): string {
  if (item.alignment) return item.alignment;
  const combined = `${item.nameFa} ${item.nameEn} ${item.f1_identity || ''} ${item.f6_doctrine || ''} ${item.f10_allies || ''}`.toLowerCase();
  if (combined.includes('مقاومت') || combined.includes('ایران') || combined.includes('قدس') || combined.includes('حزب‌الله')) {
    return 'محور مقاومت و بازدارندگی منطقه‌ای';
  }
  if (combined.includes('آمریکا') || combined.includes('ناتو') || combined.includes('سنتکام') || combined.includes('اسرائیل')) {
    return 'محور غربی و ائتلاف امنیتی واشنگتن';
  }
  if (combined.includes('چین') || combined.includes('روسیه') || combined.includes('بریکس')) {
    return 'محور شرق و نظم چندقطبی';
  }
  if (combined.includes('اوپک') || combined.includes('خلیج فارس') || combined.includes('عربستان') || combined.includes('امارات')) {
    return 'موازنه مثبت منطقه‌ای و توسعه‌گرا';
  }
  return 'بی‌طرف / چندجانبه‌گرا';
}

// Merge all actors and deduplicate by id
const rawActors: RawActorItem[] = [
  ...(b1 as unknown as RawActorItem[]),
  ...(b2 as unknown as RawActorItem[]),
  ...(b3 as unknown as RawActorItem[]),
  ...(b4 as unknown as RawActorItem[]),
];

const actorMap = new Map<string, ActorData>();
rawActors.forEach((raw) => {
  if (raw && raw.id && !actorMap.has(raw.id)) {
    const category = raw.primaryClass;
    const influenceWeight = Number(raw.influenceWeight) || 3;
    const influenceScore = Math.round(influenceWeight);
    const flagEmoji = raw.flagEmoji || deriveFlagOrIcon(raw.id, raw.nameFa, raw.nameEn, category);
    const alignment = deriveAlignment(raw);

    const geopoliticalRole =
      raw.geopoliticalRole ||
      (typeof raw.f1_identity === 'string' ? raw.f1_identity : '') ||
      `${raw.nameFa} یکی از بازیگران برجسته در طبقه ${category} در چشم‌انداز ژئوپلیتیک ۲۰۲۶ است.`;

    const militaryCapabilities =
      raw.militaryCapabilities ||
      (typeof raw.f2_power === 'string' ? raw.f2_power : '') ||
      (typeof raw.f9_tools === 'string' ? raw.f9_tools : undefined);

    const economicLeverage =
      raw.economicLeverage ||
      (typeof raw.f3_interests === 'string' ? raw.f3_interests : undefined);

    // Extract alliances array from string if needed
    let alliances = raw.alliances;
    if (!alliances && typeof raw.f10_allies === 'string' && raw.f10_allies !== 'نامشخص — شکاف داده') {
      alliances = raw.f10_allies.split(/[,،;]+/).map((s) => s.trim()).filter(Boolean);
    }

    // Extract conflicts array from string if needed
    let activeConflicts = raw.activeConflicts;
    if (!activeConflicts && typeof raw.f11_rivals === 'string' && raw.f11_rivals !== 'نامشخص — شکاف داده') {
      activeConflicts = raw.f11_rivals.split(/[,،;]+/).map((s) => s.trim()).filter(Boolean);
    }

    const normalizedActor: ActorData = {
      ...raw,
      id: raw.id,
      nameFa: raw.nameFa,
      nameEn: raw.nameEn,
      primaryClass: category,
      category,
      subclass: raw.subclass || '',
      geography: raw.geography || 'خاورمیانه',
      status: raw.status || 'فعال',
      influenceWeight,
      influenceScore,
      batch: raw.batch || 'batch_1',
      acronym: raw.acronym || (raw.nameEn && raw.nameEn.length <= 6 ? raw.nameEn : undefined),
      leader: raw.leader,
      headquarters: raw.headquarters,
      alignment,
      flagEmoji,
      geopoliticalRole,
      militaryCapabilities,
      economicLeverage,
      alliances,
      activeConflicts,
      chokepoints: raw.chokepoints,
    };

    actorMap.set(raw.id, normalizedActor);
  }
});

export const allActors: ActorData[] = Array.from(actorMap.values());
export const allRelationships: GeopoliticalRelationship[] = relationshipsData;

export const CATEGORY_COLORS: Record<ActorCategory, { bg: string; text: string; hex: string; border: string }> = {
  'دولت‌ها/اقتدارهای سطح دولتی منطقه‌ای': {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    hex: '#10b981',
    border: 'border-emerald-500/30',
  },
  'قدرت‌ها/بازیگران دولتی فرامنطقه‌ای': {
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    hex: '#3b82f6',
    border: 'border-blue-500/30',
  },
  'بازیگران مسلح غیردولتی/شبه‌دولتی': {
    bg: 'bg-rose-500/10',
    text: 'text-rose-400',
    hex: '#f43f5e',
    border: 'border-rose-500/30',
  },
  'بازیگران اقتصادی/انرژی/مالی': {
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    hex: '#f59e0b',
    border: 'border-amber-500/30',
  },
  'سازمان‌های بین‌المللی/منطقه‌ای': {
    bg: 'bg-cyan-500/10',
    text: 'text-cyan-400',
    hex: '#06b6d4',
    border: 'border-cyan-500/30',
  },
  'شبکه‌های فراملی ایدئولوژیک/قومی/سایبری/رسانه‌ای': {
    bg: 'bg-purple-500/10',
    text: 'text-purple-400',
    hex: '#a855f7',
    border: 'border-purple-500/30',
  },
};

export const RELATION_CONFIG: Record<
  RelationType,
  { labelFa: string; color: string; strokeDash: string; description: string }
> = {
  conflict: {
    labelFa: 'خصومت / تقابل / تحریم',
    color: '#ef4444',
    strokeDash: '0',
    description: 'جنگ نظامی، حملات موشکی، ترور، تحریم‌های فلج‌کننده اقتصادی یا قطع روابط',
  },
  alliance: {
    labelFa: 'هم‌پیمانی / حمایت راهبردی',
    color: '#10b981',
    strokeDash: '0',
    description: 'پیمان‌های دفاعی، تسلیحاتی، اشتراک اطلاعاتی یا همسویی درون‌محوری',
  },
  economic: {
    labelFa: 'همکاری اقتصادی / انرژی / کریدور',
    color: '#f59e0b',
    strokeDash: '4,4',
    description: 'صادرات نفت، سرمایه‌گذاری زیرساختی، کریدورهای ترانزیتی و تسویه ارزی',
  },
  diplomatic: {
    labelFa: 'دیپلماسی / میانجی‌گری / توافق',
    color: '#38bdf8',
    strokeDash: '6,3',
    description: 'میانجی‌گری آتش‌بس، میزبانی مذاکرات، احیای روابط و عضویت‌های نهادی',
  },
  proxy_cyber: {
    labelFa: 'سایبری / روایی / اطلاعاتی',
    color: '#c084fc',
    strokeDash: '2,2',
    description: 'عملیات هک و نفوذ، جنگ روایی رسانه‌ای و پیوندهای نیابتی پیچیده',
  },
  volatile: {
    labelFa: 'نوسانی / رقابت مهارشده / شکننده',
    color: '#fb923c',
    strokeDash: '8,4',
    description: 'تنش‌های مرزی مقطعی، موازنه پرمخاطره و چالش‌های حل‌نشده حقوقی',
  },
};

export const ALL_CATEGORIES: ActorCategory[] = Object.keys(CATEGORY_COLORS) as ActorCategory[];

export const ALL_GEOGRAPHIES = Array.from(
  new Set(allActors.map((a) => a.geography.split('/')[0].trim()).filter(Boolean))
).sort();
