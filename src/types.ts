export type ActorCategory =
  | 'بازیگران اقتصادی/انرژی/مالی'
  | 'سازمان‌های بین‌المللی/منطقه‌ای'
  | 'بازیگران مسلح غیردولتی/شبه‌دولتی'
  | 'قدرت‌ها/بازیگران دولتی فرامنطقه‌ای'
  | 'دولت‌ها/اقتدارهای سطح دولتی منطقه‌ای'
  | 'شبکه‌های فراملی ایدئولوژیک/قومی/سایبری/رسانه‌ای';

export type RelationType =
  | 'alliance'      // هم‌پیمانی / حمایت راهبردی
  | 'conflict'      // خصومت / تقابل / تحریم
  | 'economic'      // همکاری اقتصادی / انرژی / زیرساخت
  | 'diplomatic'    // دیپلماسی / میانجی‌گری / عضویت نهادی
  | 'proxy_cyber'   // پیوند سایبری / روایی / نیابتی
  | 'volatile';     // نوسانی / رقابت مهارشده / مذاکره شکننده

export interface ActorData {
  id: string;
  nameFa: string;
  nameEn: string;
  primaryClass: ActorCategory;
  category: ActorCategory; // normalized alias for primaryClass
  subclass: string;
  geography: string;
  status: string;
  influenceWeight: number; // 1 to 5
  influenceScore: number;  // normalized alias
  batch: string;
  dossierWordCount?: number;
  finalWordCount?: number;
  sourceCount?: number;
  sources?: string;
  dataGapIds?: string;

  // Normalized intelligence dimensions & display fields
  acronym?: string;
  leader?: string;
  headquarters?: string;
  alignment: string;
  flagEmoji?: string;
  geopoliticalRole: string;
  militaryCapabilities?: string;
  economicLeverage?: string;
  alliances?: string[];
  activeConflicts?: string[];
  chokepoints?: string[];

  // 18 Analytical Dimensions (F1 - F18)
  f1_identity?: string;
  f2_power?: string;
  f3_interests?: string;
  f4_goals?: string;
  f5_redlines?: string;
  f6_doctrine?: string;
  f7_decision?: string;
  f8_constraints?: string;
  f9_tools?: string;
  f10_allies?: string;
  f11_rivals?: string;
  f12_keyRelations?: string;
  f13_vulnerabilities?: string;
  f14_timeline?: string;
  f15_variables?: string;
  f16_earlyWarnings?: string;
  f17_scenarios?: string;
  f18_uncertainties?: string;
}

export interface GeopoliticalRelationship {
  id: string;
  source: string;
  target: string;
  type: RelationType;
  typeFa: string;
  intensity: number; // 1 to 5
  description: string;
  directional?: boolean;
}

export interface GraphNode extends ActorData {
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
  radius?: number;
  color?: string;
  degree?: number;
}

export interface GraphLink {
  id: string;
  source: string | GraphNode;
  target: string | GraphNode;
  type: RelationType;
  typeFa: string;
  intensity: number;
  description: string;
}

export interface FilterState {
  searchQuery: string;
  categories: ActorCategory[];
  relationTypes: RelationType[];
  minInfluence: number;
  geographies: string[];
  alignments: string[];
  statuses: string[];
}
