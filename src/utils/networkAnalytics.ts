import { ActorData, GeopoliticalRelationship, RelationType } from '../types';

export interface KeyLeverageNode {
  actor: ActorData;
  degree: number;
  alliancesCount: number;
  conflictsCount: number;
  economicCount: number;
  betweennessScore: number;
  leverageScore: number;
  roleType: 'هاب منازعه' | 'پل میانجی‌گری' | 'قدرت موازنه' | 'شریان اقتصادی' | 'بازیگر نامتقارن';
}

export interface NetworkCluster {
  id: string;
  nameFa: string;
  nameEn: string;
  color: string;
  icon: string;
  actorIds: string[];
  densityScore: number;
  strategicDescription: string;
  keyActors: string[];
}

export interface WeightBalanceAnalysis {
  totalRelationships: number;
  conflictCount: number;
  allianceCount: number;
  economicCount: number;
  diplomaticCount: number;
  proxyCyberCount: number;
  volatileCount: number;
  conflictRatio: number; // percentage
  allianceRatio: number; // percentage
  highIntensityCount: number; // intensity 4 or 5
  averageIntensity: number;
  fragilityIndex: number; // 0 to 100
}

export interface HistoricalTrendPattern {
  id: string;
  titleFa: string;
  period: string;
  category: 'نظامی-امنیتی' | 'ژئواکونومیک' | 'دیپلماتیک' | 'نامتقارن';
  severity: 'بسیار بالا' | 'بالا' | 'متوسط';
  patternCycle: string;
  actorsInvolved: string[];
  narrativeSummary: string;
  futureOutlook2026: string;
}

export interface FullNetworkAnalytics {
  leverageNodes: KeyLeverageNode[];
  bridgeActors: KeyLeverageNode[];
  clusters: NetworkCluster[];
  balance: WeightBalanceAnalysis;
  historicalTrends: HistoricalTrendPattern[];
  overallSummaryText: string;
}

// Compute Betweenness Centrality (Approximation for geopolitical network)
function computeBetweenness(
  actors: ActorData[],
  relationships: GeopoliticalRelationship[]
): Map<string, number> {
  const adj = new Map<string, string[]>();
  actors.forEach((a) => adj.set(a.id, []));
  relationships.forEach((r) => {
    if (adj.has(r.source) && adj.has(r.target)) {
      adj.get(r.source)!.push(r.target);
      adj.get(r.target)!.push(r.source);
    }
  });

  const betweenness = new Map<string, number>();
  actors.forEach((a) => betweenness.set(a.id, 0));

  const actorIds = actors.map((a) => a.id);

  // Sample paths to calculate betweenness
  for (let i = 0; i < actorIds.length; i++) {
    const s = actorIds[i];
    // BFS from s
    const dist = new Map<string, number>();
    const parent = new Map<string, string[]>();
    const queue: string[] = [s];
    dist.set(s, 0);

    while (queue.length > 0) {
      const u = queue.shift()!;
      const neighbors = adj.get(u) || [];
      for (const v of neighbors) {
        if (!dist.has(v)) {
          dist.set(v, dist.get(u)! + 1);
          parent.set(v, [u]);
          queue.push(v);
        } else if (dist.get(v) === dist.get(u)! + 1) {
          parent.get(v)!.push(u);
        }
      }
    }

    // Accumulate passes
    dist.forEach((d, targetId) => {
      if (d > 1) {
        const parents = parent.get(targetId) || [];
        parents.forEach((p) => {
          if (p !== s && p !== targetId) {
            betweenness.set(p, (betweenness.get(p) || 0) + 1);
          }
        });
      }
    });
  }

  return betweenness;
}

export function analyzeGeopoliticalNetwork(
  actors: ActorData[],
  relationships: GeopoliticalRelationship[]
): FullNetworkAnalytics {
  const actorMap = new Map<string, ActorData>();
  actors.forEach((a) => actorMap.set(a.id, a));

  const degreeMap = new Map<string, { total: number; conflict: number; alliance: number; economic: number }>();
  actors.forEach((a) => {
    degreeMap.set(a.id, { total: 0, conflict: 0, alliance: 0, economic: 0 });
  });

  let totalIntensity = 0;
  let highIntensityCount = 0;
  const typeCounts: Record<RelationType, number> = {
    conflict: 0,
    alliance: 0,
    economic: 0,
    diplomatic: 0,
    proxy_cyber: 0,
    volatile: 0,
  };

  relationships.forEach((rel) => {
    totalIntensity += rel.intensity;
    if (rel.intensity >= 4) highIntensityCount++;
    if (typeCounts[rel.type] !== undefined) {
      typeCounts[rel.type]++;
    }

    const srcDeg = degreeMap.get(rel.source);
    if (srcDeg) {
      srcDeg.total++;
      if (rel.type === 'conflict') srcDeg.conflict++;
      if (rel.type === 'alliance') srcDeg.alliance++;
      if (rel.type === 'economic') srcDeg.economic++;
    }

    const tgtDeg = degreeMap.get(rel.target);
    if (tgtDeg) {
      tgtDeg.total++;
      if (rel.type === 'conflict') tgtDeg.conflict++;
      if (rel.type === 'alliance') tgtDeg.alliance++;
      if (rel.type === 'economic') tgtDeg.economic++;
    }
  });

  const betweenness = computeBetweenness(actors, relationships);

  // Build Key Leverage Nodes
  const leverageNodes: KeyLeverageNode[] = actors.map((actor) => {
    const stats = degreeMap.get(actor.id) || { total: 0, conflict: 0, alliance: 0, economic: 0 };
    const bScore = betweenness.get(actor.id) || 0;
    const leverageScore = Math.round(
      stats.total * 3 +
      (actor.influenceScore || 3) * 5 +
      bScore * 0.5 +
      stats.conflict * 2
    );

    let roleType: KeyLeverageNode['roleType'] = 'قدرت موازنه';
    if (stats.conflict >= 4 || stats.conflict > stats.alliance * 1.5) {
      roleType = 'هاب منازعه';
    } else if (bScore >= 15 || actor.id === 'REG-007' || actor.id === 'REG-010') {
      roleType = 'پل میانجی‌گری';
    } else if (stats.economic >= 3 || actor.category === 'بازیگران اقتصادی/انرژی/مالی') {
      roleType = 'شریان اقتصادی';
    } else if (actor.category === 'بازیگران مسلح غیردولتی/شبه‌دولتی') {
      roleType = 'بازیگر نامتقارن';
    }

    return {
      actor,
      degree: stats.total,
      alliancesCount: stats.alliance,
      conflictsCount: stats.conflict,
      economicCount: stats.economic,
      betweennessScore: bScore,
      leverageScore,
      roleType,
    };
  });

  // Sort by leverage score
  leverageNodes.sort((a, b) => b.leverageScore - a.leverageScore);

  // Bridge Actors sorted by betweenness
  const bridgeActors = [...leverageNodes].sort((a, b) => b.betweennessScore - a.betweennessScore);

  // Clusters identification
  const clusters: NetworkCluster[] = [
    {
      id: 'cluster-resistance',
      nameFa: 'محور مقاومت و بازدارندگی فرامرزی',
      nameEn: 'Axis of Resistance & Regional Deterrence',
      color: '#ef4444',
      icon: '⚔️',
      actorIds: ['REG-002', 'NSA-001', 'NSA-002', 'NSA-004', 'REG-009', 'REG-008', 'NSA-010', 'NSA-025'],
      densityScore: 88,
      strategicDescription:
        'ائتلاف چندلایه متقارن-نامتقارن با هدایت راهبردی تهران و تسلیح پیشرفته موشکی-پهپادی، با هدف مهار هژمونی آمریکا و ایجاد بازدارندگی متقابل علیه اسرائیل در جبهه‌های هم‌زمان لبنان، غزه، یمن و عراق.',
      keyActors: ['ایران', 'حزب‌الله لبنان', 'انصارالله یمن', 'حماس', 'دولت سوریه'],
    },
    {
      id: 'cluster-western-security',
      nameFa: 'معماری امنیتی غرب، سنتکام و اسرائیل',
      nameEn: 'Western-Centcom Security Architecture & Israel',
      color: '#3b82f6',
      icon: '🛡️',
      actorIds: ['PWR-001', 'REG-003', 'PWR-005', 'REG-001', 'REG-006', 'REG-015', 'SEC-006', 'REG-007'],
      densityScore: 82,
      strategicDescription:
        'اتحاد دفاعی مبتنی بر چتر امنیتی ایالات متحده، تسلیحات فوق‌پیشرفته، میزبانی پایگاه‌های راهبردی (العدید، ناوگان پنجم منامه، پایگاه‌های سنتکام) و پیشبرد یکپارچه‌سازی پدافندی موسوم به پیمان‌های ابراهیم.',
      keyActors: ['ایالات متحده آمریکا', 'اسرائیل', 'عربستان سعودی', 'امارات', 'فرماندهی سنتکام'],
    },
    {
      id: 'cluster-energy-opec',
      nameFa: 'کارتل انرژی جهانی و ائتلاف اوپک‌پلاس',
      nameEn: 'Global Energy Cartel & OPEC+ Coalition',
      color: '#f59e0b',
      icon: '🛢️',
      actorIds: ['REG-001', 'PWR-002', 'REG-006', 'ECO-001', 'ECO-002', 'ECO-003', 'ECO-004', 'ECO-008'],
      densityScore: 78,
      strategicDescription:
        'موازنه شریان‌های حیاتی نفت خام و گاز طبیعی جهان؛ تنظیم سطح عرضه جهانی توسط محور ریاض-مسکو به همراه غول‌های نفتی آرامکو، ادنوک و گازپروم جهت حفظ درآمدهای پایدار و توسعه سرمایه‌گذاری‌های پساصنعتی.',
      keyActors: ['عربستان سعودی', 'روسیه', 'امارات', 'اوپک‌پلاس', 'آرامکو'],
    },
    {
      id: 'cluster-eurasian-brics',
      nameFa: 'موازنه چندقطبی اوراسیا و بریکس‌پلاس',
      nameEn: 'Eurasian Multipolar Balance & BRICS+',
      color: '#10b981',
      icon: '🌐',
      actorIds: ['PWR-003', 'PWR-002', 'REG-002', 'PWR-008', 'IO-019', 'REG-004'],
      densityScore: 74,
      strategicDescription:
        'همگرایی ژئواکونومیک برای دلارزدایی از مبادلات انرژی، اتصال کریدورهای شمال-جنوب و کمربند و راه، گسترش سرمایه‌گذاری صنعتی پکن و تقویت نهادهای پولی چندقطبی در برابر تحریم‌های خزانه‌داری آمریکا.',
      keyActors: ['چین', 'روسیه', 'ایران', 'هند', 'بریکس‌پلاس'],
    },
    {
      id: 'cluster-chokepoints',
      nameFa: 'کانون بحران تنگه‌های راهبردی و دریای سرخ',
      nameEn: 'Strategic Maritime Chokepoints & Red Sea',
      color: '#06b6d4',
      icon: '🚢',
      actorIds: ['NSA-004', 'PWR-001', 'PWR-005', 'REG-005', 'SEC-005', 'SEC-006', 'REG-027', 'REG-012'],
      densityScore: 84,
      strategicDescription:
        'رویارویی نامتقارن دریایی در باب‌المندب، خلیج عدن و تنگه هرمز؛ مسدودسازی ترانزیت دریایی مرتبط با اسرائیل توسط موشک‌ها و شهپادهای یمن در برابر عملیات‌های نگهبان رفاه و آسپیدس اروپا.',
      keyActors: ['انصارالله یمن', 'فرماندهی سنتکام', 'مصر (کانال سوئز)', 'ناوگان آسپیدس اتحادیه اروپا', 'جیبوتی'],
    },
  ];

  // Weight & Directional Balance
  const totalRels = relationships.length || 1;
  const conflictRatio = Math.round((typeCounts.conflict / totalRels) * 100);
  const allianceRatio = Math.round((typeCounts.alliance / totalRels) * 100);
  const avgIntensity = Number((totalIntensity / totalRels).toFixed(1));
  const fragilityIndex = Math.min(100, Math.round((typeCounts.conflict * 2.5 + typeCounts.volatile * 1.8 + highIntensityCount * 1.5) / (totalRels * 0.05)));

  const balance: WeightBalanceAnalysis = {
    totalRelationships: relationships.length,
    conflictCount: typeCounts.conflict,
    allianceCount: typeCounts.alliance,
    economicCount: typeCounts.economic,
    diplomaticCount: typeCounts.diplomatic,
    proxyCyberCount: typeCounts.proxy_cyber,
    volatileCount: typeCounts.volatile,
    conflictRatio,
    allianceRatio,
    highIntensityCount,
    averageIntensity: avgIntensity,
    fragilityIndex,
  };

  // Historical Trends & Recurring Patterns (synthesized from dossier dimensions F14, F15, F16, F17)
  const historicalTrends: HistoricalTrendPattern[] = [
    {
      id: 'trend-01',
      titleFa: 'گذار از جنگ سایه و نیابتی به موازنه آتش مستقیم موشکی',
      period: '۲۰۲۳ - ۲۰۲۶',
      category: 'نظامی-امنیتی',
      severity: 'بسیار بالا',
      patternCycle: 'پایان دکترین صبر راهبردی و تبادل ضربات مستقیم بالستیک/هوایی',
      actorsInvolved: ['جمهوری اسلامی ایران', 'رژیم اسرائیل', 'ایالات متحده آمریکا', 'حزب‌الله لبنان'],
      narrativeSummary:
        'تحول بنیادین از دکترین درگیری نیابتی غیرمستقیم به تبادل آتش مستقیم موشکی و پهپادی میان ایران و اسرائیل پس از عملیات‌های وعده صادق ۱ و ۲ و پاسخ‌های متقابل. این الگو خطوط قرمز سنتی را بازتعریف کرده و منطقه را در آستانه جنگ فراگیر با ریسک خطای محاسباتی قرار داده است.',
      futureOutlook2026:
        'تثبیت موازنه وحشت موشکی دوطرفه؛ تشدید نبردهای پدافندی و سرمایه‌گذاری طرفین بر سامانه‌های هایپرسونیک و لایه‌های پدافند هوایی لیزری و بردبلند.',
    },
    {
      id: 'trend-02',
      titleFa: 'سلاح‌سازی تنگه‌های بین‌المللی و بازدارندگی نامتقارن دریایی',
      period: '۲۰۲۴ - ۲۰۲۶',
      category: 'ژئواکونومیک',
      severity: 'بسیار بالا',
      patternCycle: 'اهرم‌سازی باب‌المندب و دریای سرخ در برابر زنجیره‌های تأمین جهانی',
      actorsInvolved: ['انصارالله یمن', 'سنتکام آمریکا', 'بریتانیا', 'مصر', 'اسرائیل (بندر ایلات)'],
      narrativeSummary:
        'تبدیل موقعیت ژئوپلیتیک یمن به مؤثرترین اهرم فشار ضداسرائیلی از طریق شکار موشکی و شهپادی کشتی‌های تجاری و نظامی در تنگه باب‌المندب، که منجر به کاهش بیش از ۶۰ درصدی ترانزیت کانال سوئز و ورشکستگی بندر ایلات گردید و ائتلاف‌های بزرگ دریایی غرب را در مهار نامتقارن زمین‌گیر کرد.',
      futureOutlook2026:
        'تداوم انسداد هدفمند آبراه تا تثبیت آتش‌بس فراگیر غزه و افزایش چشمگیر هزینه‌های بیمه دریایی و حمل‌ونقل کانتینری در اقیانوس هند.',
    },
    {
      id: 'trend-03',
      titleFa: 'شتاب دلارزدایی و بلوک‌بندی ژئواکونومیک شرق',
      period: '۲۰۲۲ - ۲۰۲۶',
      category: 'ژئواکونومیک',
      severity: 'بالا',
      patternCycle: 'تسویه ارزی با یوآن/روبل و اتصال ترانزیتی جنوب-شمال',
      actorsInvolved: ['چین', 'روسیه', 'جمهوری اسلامی ایران', 'هند', 'عربستان سعودی'],
      narrativeSummary:
        'در پی تحریم‌های کم‌سابقه غرب علیه روسیه و ایران، بلوک بریکس‌پلاس و سازمان شانگهای با محوریت چین، استفاده از ارزهای ملی در تسویه خرید نفت و پروژه‌های زیرساختی را به عنوان سپر دفاعی علیه سوئیفت و خزانه‌داری آمریکا نهادینه کردند.',
      futureOutlook2026:
        'تکمیل زیرساخت‌های پایانه چابهار توسط هند و تسریع اجرای سند ۲۵ ساله ایران و چین، همراه با تسویه بیش از ۵۰ درصد تجارت منطقه‌ای با ارزهای غیردلاری.',
    },
    {
      id: 'trend-04',
      titleFa: 'دیپلماسی پنهان و کانال‌های سنتی پیام‌رسانی (دوحه و مسقط)',
      period: 'مستمر و چرخه‌ای',
      category: 'دیپلماتیک',
      severity: 'متوسط',
      patternCycle: 'میانجی‌گری در شرایط انسداد کامل روابط دیپلماتیک رسمی',
      actorsInvolved: ['قطر', 'سلطنت عمان', 'ایران', 'ایالات متحده آمریکا', 'حماس'],
      narrativeSummary:
        'هر زمان که تنش‌های میدانی به نقطه اوج بحران می‌رسد، دوحه (با میزبانی حماس و پایگاه العدید) و مسقط (با روابط تاریخی نزدیک با تهران و واشنگتن) به عنوان سوپاپ اطمینان امنیتی منطقه برای جلوگیری از لغزش به جنگ هسته‌ای/منطقه‌ای وارد عمل می‌شوند.',
      futureOutlook2026:
        'نقش تعیین‌کننده عمان در مذاکرات غیرمستقیم پرونده هسته‌ای و تبادل زندانیان، و میزبانی قطر در مذاکرات آتش‌بس و بازسازی پساجنگ غزه.',
    },
    {
      id: 'trend-05',
      titleFa: 'مناقشه ژئوپلیتیک کریدور زنگزور و بازآرایی مرزهای قفقاز جنوبی',
      period: '۲۰۲۰ - ۲۰۲۶',
      category: 'نظامی-امنیتی',
      severity: 'بالا',
      patternCycle: 'فشار باکو-آنکارا در برابر خط قرمز تهران در تغییر مرزهای ارمنستان',
      actorsInvolved: ['جمهوری آذربایجان', 'ترکیه', 'ارمنستان', 'ایران', 'روسیه', 'اسرائیل'],
      narrativeSummary:
        'اصرار باکو و آنکارا برای ایجاد دالان برون‌سرزمینی زنگزور جهت اتصال مستقیم به نخجوان و جهان ترک، با مخالفت صریح تهران مبنی بر تغییرناپذیری مرزهای تاریخی با ارمنستان و قطع مرز مشترک زمینی مواجه شده و قفقاز را به کانون موازنه تنش بدل کرده است.',
      futureOutlook2026:
        'جایگزینی تدریجی طرح کریدور ارس در خاک ایران به عنوان راهکار مصالحه‌آمیز اقتصادی، همزمان با تداوم رقابت اطلاعاتی اسرائیل و ایران در حوزه خزر.',
    },
  ];

  const overallSummaryText = `گراف ژئوپلیتیک ۲۰۲۶ نشان‌دهنده یک شبکه عمیقاً قطبش‌یافته با شاخص شکنندگی ${fragilityIndex}٪ است. تقابل نظامی و تحریمی با اختصاص سهم ${conflictRatio}٪ از کل پیوندها، وزن بالاتری نسبت به هم‌پیمانی (${allianceRatio}٪) دارد. بازیگران دارای بالاترین اهرم ژئوپلیتیک شامل ایران، ایالات متحده، اسرائیل، عربستان و چین هستند که نه‌تنها بالاترین درجه پیوند را دارا می‌باشند، بلکه جریان اصلی تنش یا موازنه انرژی جهان را تنظیم می‌کنند. حضور بازیگران پل نظیر قطر و عمان مانع از قطع کامل زنجیره‌های ارتباطی در زمان اوج بحران شده است.`;

  return {
    leverageNodes,
    bridgeActors,
    clusters,
    balance,
    historicalTrends,
    overallSummaryText,
  };
}
