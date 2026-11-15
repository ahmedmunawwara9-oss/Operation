import { Trip } from '../types';
import { buildTripDateTimes, getTodayDateString } from './dateTimeUtils';

/**
 * Creates dynamic realistic demo dataset anchored around current reference time
 * so that upon launching, there are active trips moving on the map, upcoming departures,
 * completed trips, overnight trips, and a realistic bus assignment conflict.
 */
export function generateDemoTrips(baseDateStr?: string, referenceTime?: Date): Trip[] {
  const dateStr = baseDateStr || getTodayDateString();
  const ref = referenceTime || new Date();
  
  // Get base hours to arrange realistic distribution around current time
  const currentHour = ref.getHours();
  const currentMinute = ref.getMinutes();

  // Helper to format HH:mm given hour offset from current time
  const timeOffset = (hourDelta: number, minuteDelta: number = 0): string => {
    let totalMinutes = (currentHour + hourDelta) * 60 + currentMinute + minuteDelta;
    while (totalMinutes < 0) totalMinutes += 24 * 60;
    totalMinutes = totalMinutes % (24 * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = Math.floor(totalMinutes % 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const rawTripSpecs = [
    // 1. In-progress trips (currently active)
    {
      tripNumber: 'TRP-101',
      busId: 'BUS-101',
      plateNumber: 'أ ب د 1011',
      driverName: 'فهد بن محمد العتيبي',
      driverPhone: '0501234567',
      origin: 'الرياض - محطة النقل المركزية',
      destination: 'جدة - محطة المطار الدولية',
      depTime: timeOffset(-1, -15), // started 75 min ago
      arrTime: timeOffset(2, 45),   // finishes in 2h 45m
      route: 'طريق الرياض - مكة السريع',
      passengerCount: 46,
      notes: 'رحلة كبار الشخصيات VIP مع خدمة إنترنت',
    },
    {
      tripNumber: 'TRP-102',
      busId: 'BUS-102',
      plateNumber: 'ر س ل 2022',
      driverName: 'خالد بن ناصر الشمري',
      driverPhone: '0559876543',
      origin: 'الدمام - كورنيش الشرقية',
      destination: 'الرياض - محطة النقل المركزية',
      depTime: timeOffset(-0, -40), // started 40 min ago
      arrTime: timeOffset(2, 20),
      route: 'طريق الدمام - الرياض السريع',
      passengerCount: 42,
      notes: 'رحلة منتظمة مجدولة',
    },
    {
      tripNumber: 'TRP-103',
      busId: 'BUS-103',
      plateNumber: 'ط ك م 3033',
      driverName: 'عبدالله بن سعد الدوسري',
      driverPhone: '0533344455',
      origin: 'مكة المكرمة - محطة الحرم',
      destination: 'المدينة المنورة - محطة السلام',
      depTime: timeOffset(-1, -30),
      arrTime: timeOffset(1, 30),
      route: 'طريق الهجرة السريع',
      passengerCount: 49,
      notes: 'وفد معتمرين',
    },
    {
      tripNumber: 'TRP-104',
      busId: 'BUS-104',
      plateNumber: 'ع ص ق 4044',
      driverName: 'أحمد بن علي الغامدي',
      driverPhone: '0567788990',
      origin: 'أبها - المحطة الإقليمية',
      destination: 'جازان - ميناء الركاب',
      depTime: timeOffset(-0, -25),
      arrTime: timeOffset(1, 45),
      route: 'طريق عقبة ضلع',
      passengerCount: 38,
      notes: 'حافلة حديثة مجهزة بنظام تتبع',
    },

    // 2. Upcoming soon (departing within 10 to 45 minutes)
    {
      tripNumber: 'TRP-105',
      busId: 'BUS-105',
      plateNumber: 'ح ن ف 5055',
      driverName: 'محمد بن سالم القحطاني',
      driverPhone: '0541122334',
      origin: 'الرياض - محطة النقل المركزية',
      destination: 'القصيم - محطة بريدة المركزية',
      depTime: timeOffset(0, 12), // Departs in 12 minutes!
      arrTime: timeOffset(3, 30),
      route: 'طريق القصيم السريع',
      passengerCount: 45,
      notes: 'صعود الركاب عند الرصيف رقم 4',
    },
    {
      tripNumber: 'TRP-106',
      busId: 'BUS-106',
      plateNumber: 'د و س 6066',
      driverName: 'عمر بن إبراهيم السبيعي',
      driverPhone: '0589900112',
      origin: 'جدة - محطة المطار',
      destination: 'ينبع - المركز التجاري',
      depTime: timeOffset(0, 28), // Departs in 28 minutes
      arrTime: timeOffset(3, 40),
      route: 'طريق الساحل الغربي',
      passengerCount: 35,
      notes: 'تأكيد جاهزية السائق',
    },
    {
      tripNumber: 'TRP-107',
      busId: 'BUS-107',
      plateNumber: 'س ل م 7077',
      driverName: 'سلطان بن فهد العنزي',
      driverPhone: '0502233445',
      origin: 'المدينة المنورة - محطة السلام',
      destination: 'تبوك - محطة الشاحنات والحافلات',
      depTime: timeOffset(0, 50),
      arrTime: timeOffset(6, 30),
      route: 'طريق خيبر - تيماء السريع',
      passengerCount: 40,
      notes: 'رحلة طويلة مع استراحة مجدولة',
    },

    // 3. Later departures
    {
      tripNumber: 'TRP-108',
      busId: 'BUS-108',
      plateNumber: 'ق ر ش 8088',
      driverName: 'بندر بن حمد الخالدي',
      driverPhone: '0556677889',
      origin: 'الرياض - محطة النقل المركزية',
      destination: 'حائل - البوابة الشمالية',
      depTime: timeOffset(2, 0),
      arrTime: timeOffset(7, 0),
      route: 'طريق حائل السريع',
      passengerCount: 44,
      notes: 'مجدولة للمساء',
    },
    {
      tripNumber: 'TRP-109',
      busId: 'BUS-109',
      plateNumber: 'ك ت ب 9099',
      driverName: 'ياسر بن صالح الزهراني',
      driverPhone: '0547788112',
      origin: 'الطائف - محطة الهدا',
      destination: 'مكة المكرمة - محطة الحرم',
      depTime: timeOffset(2, 30),
      arrTime: timeOffset(4, 0),
      route: 'طريق الكر - الهدا',
      passengerCount: 48,
      notes: 'رحلة ترددية',
    },
    {
      tripNumber: 'TRP-110',
      busId: 'BUS-110',
      plateNumber: 'م ع ن 1010',
      driverName: 'نايف بن مسفر الهاجري',
      driverPhone: '0538899221',
      origin: 'الجبيل - محطة الصناعية',
      destination: 'الخبر - محطة المجمع',
      depTime: timeOffset(3, 15),
      arrTime: timeOffset(4, 45),
      route: 'طريق الجبيل السريع',
      passengerCount: 30,
      notes: 'نقل موظفي وردية مسائية',
    },

    // 4. Overnight trip (23:30 to 07:15)
    {
      tripNumber: 'TRP-111',
      busId: 'BUS-111',
      plateNumber: 'ل ي ل 1111',
      driverName: 'منصور بن عبدالعزيز المطيري',
      driverPhone: '0505544332',
      origin: 'الرياض - محطة النقل المركزية',
      destination: 'نجران - المحطة الجنوبية',
      depTime: '23:15',
      arrTime: '07:30', // crosses midnight overnight!
      route: 'طريق وادي الدواسر - نجران',
      passengerCount: 47,
      notes: 'رحلة مبيت ليلية عبر وادي الدواسر',
    },
    {
      tripNumber: 'TRP-112',
      busId: 'BUS-112',
      plateNumber: 'س هـ ر 1212',
      driverName: 'تركي بن مساعد الحربي',
      driverPhone: '0591122334',
      origin: 'جدة - محطة المطار',
      destination: 'تبوك - محطة تبوك المركزية',
      depTime: '22:45',
      arrTime: '06:15', // overnight trip
      route: 'طريق الساحل الشمالي',
      passengerCount: 43,
      notes: 'رحلة ليلية مع تبديل طاقم السائقين',
    },

    // 5. Completed trips earlier in the day
    {
      tripNumber: 'TRP-113',
      busId: 'BUS-101',
      plateNumber: 'أ ب د 1011',
      driverName: 'سعود بن كمال البقمي',
      driverPhone: '0543322119',
      origin: 'الخرج - المحطة العامة',
      destination: 'الرياض - محطة النقل المركزية',
      depTime: timeOffset(-5, 0),
      arrTime: timeOffset(-3, 30),
      actualDepartureTime: timeOffset(-5, 2),
      actualArrivalTime: timeOffset(-3, 28),
      actualStatus: 'completed' as const,
      route: 'طريق الخرج السريع',
      passengerCount: 39,
      notes: 'تمت بنجاح وتأكيد وصول ميداني',
    },
    {
      tripNumber: 'TRP-114',
      busId: 'BUS-102',
      plateNumber: 'ر س ل 2022',
      driverName: 'وليد بن حمد العسيري',
      driverPhone: '0509988776',
      origin: 'الهفوف - محطة الأحساء',
      destination: 'الدمام - كورنيش الشرقية',
      depTime: timeOffset(-4, 30),
      arrTime: timeOffset(-2, 45),
      actualDepartureTime: timeOffset(-4, 30),
      actualArrivalTime: timeOffset(-2, 42),
      actualStatus: 'completed' as const,
      route: 'طريق الأحساء - بقيق',
      passengerCount: 44,
      notes: 'رحلة صباحية منجزة',
    },
    {
      tripNumber: 'TRP-115',
      busId: 'BUS-105',
      plateNumber: 'ح ن ف 5055',
      driverName: 'ماجد بن طلال الرشيدي',
      driverPhone: '0554433221',
      origin: 'المجمعة - محطة القطار',
      destination: 'الرياض - محطة النقل المركزية',
      depTime: timeOffset(-4, 0),
      arrTime: timeOffset(-2, 10),
      actualDepartureTime: timeOffset(-4, 0),
      actualArrivalTime: timeOffset(-2, 8),
      actualStatus: 'completed' as const,
      route: 'طريق سدير السريع',
      passengerCount: 36,
      notes: 'رحلة مجدولة سابقة للحافلة',
    },

    // 6. Confirmed Delayed Trip (with actual field data)
    {
      tripNumber: 'TRP-116',
      busId: 'BUS-113',
      plateNumber: 'ت أ خ 1313',
      driverName: 'هاني بن ممدوح الجهني',
      driverPhone: '0562233445',
      origin: 'ينبع - ميناء الملك فهد',
      destination: 'المدينة المنورة - محطة السلام',
      depTime: timeOffset(-2, 0),
      arrTime: timeOffset(-0, 10),
      actualDepartureTime: timeOffset(-1, 30), // departed 30 min late
      actualStatus: 'delayed' as const,
      delayMinutes: 30,
      route: 'طريق ينبع - المدينة السريع',
      passengerCount: 41,
      notes: 'تأخير مؤكد بسبب أعمال صيانة على الطريق',
    },

    // 7. DELIBERATE CONFLICT FOR TESTING CONFLICT ENGINE:
    // BUS-104 is already assigned to TRP-104 from timeOffset(-0, -25) to timeOffset(1, 45).
    // Now TRP-117 is also assigned to BUS-104 overlapping during the same period!
    {
      tripNumber: 'TRP-117',
      busId: 'BUS-104', // Overlapping bus conflict!
      plateNumber: 'ع ص ق 4044',
      driverName: 'حسام بن أحمد الصالح',
      driverPhone: '0583322110',
      origin: 'جازان - المحطة المركزية',
      destination: 'صبيا - الموقف العام',
      depTime: timeOffset(0, 10),
      arrTime: timeOffset(1, 15),
      route: 'طريق جازان - صبيا',
      passengerCount: 28,
      notes: '⚠️ تعارض مجدول: نفس الحافلة BUS-104 مخصصة لرحلتين متداخلتين!',
    },

    // 8. Additional trips to reach 22 total trips and 14 distinct buses
    {
      tripNumber: 'TRP-118',
      busId: 'BUS-114',
      plateNumber: 'ب ر د 1414',
      driverName: 'زياد بن عبدالله الثقفي',
      driverPhone: '0534455667',
      origin: 'الطائف - محطة الهدا',
      destination: 'الباحة - المحطة المركزية',
      depTime: timeOffset(1, 10),
      arrTime: timeOffset(3, 40),
      route: 'طريق الجنوب الجبلي',
      passengerCount: 34,
      notes: 'رحلة جبلية تتطلب كابتن معتمد',
    },
    {
      tripNumber: 'TRP-119',
      busId: 'BUS-106',
      plateNumber: 'د و س 6066',
      driverName: 'طلال بن عبدالمحسن العمري',
      driverPhone: '0507788990',
      origin: 'المدينة المنورة - محطة السلام',
      destination: 'العلا - محطة الواحة',
      depTime: timeOffset(4, 0),
      arrTime: timeOffset(7, 30),
      route: 'طريق المدينة - العلا السياحي',
      passengerCount: 48,
      notes: 'فوج سياحي متجه إلى العلا',
    },
    {
      tripNumber: 'TRP-120',
      busId: 'BUS-115',
      plateNumber: 'ع ر و 1515',
      driverName: 'سعد بن ناصر الغامدي',
      driverPhone: '0551122998',
      origin: 'عرعر - المحطة الشمالية',
      destination: 'سكاكا - الجوف المركزية',
      depTime: timeOffset(1, 45),
      arrTime: timeOffset(3, 45),
      route: 'طريق عرعر - الجوف',
      passengerCount: 31,
      notes: 'رحلة الربط الشمالي',
    },
    {
      tripNumber: 'TRP-121',
      busId: 'BUS-116',
      plateNumber: 'ر أ س 1616',
      driverName: 'مبارك بن سالم المري',
      driverPhone: '0548877665',
      origin: 'الأحساء - محطة المبرز',
      destination: 'سلوى - المنفذ الحدودي',
      depTime: timeOffset(0, 35),
      arrTime: timeOffset(2, 0),
      route: 'طريق سلوى الدولي',
      passengerCount: 40,
      notes: 'تأكيد أوراق الركاب والمنفذ',
    },
    {
      tripNumber: 'TRP-122',
      busId: 'BUS-103',
      plateNumber: 'ط ك م 3033',
      driverName: 'فايز بن مسعود الشهري',
      driverPhone: '0594455661',
      origin: 'خميس مشيط - المحطة المركزية',
      destination: 'بيشة - الموقف العام',
      depTime: timeOffset(3, 30),
      arrTime: timeOffset(6, 0),
      route: 'طريق خميس مشيط - بيشة',
      passengerCount: 37,
      notes: 'مجدولة بعد استراحة الحافلة',
    },
  ];

  return rawTripSpecs.map((spec, index) => {
    const { departureDateTime, arrivalDateTime, isOvernight, durationMinutes } =
      buildTripDateTimes(dateStr, spec.depTime, spec.arrTime, true);

    return {
      id: `demo-${index + 1}`,
      tripNumber: spec.tripNumber,
      busId: spec.busId,
      plateNumber: spec.plateNumber,
      driverName: spec.driverName,
      driverPhone: spec.driverPhone,
      origin: spec.origin,
      destination: spec.destination,
      tripDate: dateStr,
      departureTime: spec.depTime,
      arrivalTime: spec.arrTime,
      departureDateTime,
      arrivalDateTime,
      isOvernight,
      durationMinutes,
      route: spec.route,
      passengerCount: spec.passengerCount,
      notes: spec.notes,
      actualDepartureTime: spec.actualDepartureTime,
      actualArrivalTime: spec.actualArrivalTime,
      actualStatus: spec.actualStatus,
      delayMinutes: spec.delayMinutes,
      status: 'scheduled_upcoming' as const,
      progress: 0,
      elapsedMinutes: 0,
      remainingMinutes: durationMinutes,
      conflicts: [],
    };
  });
}

/**
 * Deliberately invalid test row for demonstrating the Excel import validator
 */
export const SAMPLE_INVALID_ROW_FOR_TEST = {
  'رقم الرحلة': 'TRP-ERR-999',
  'رقم الحافلة': '',
  'اسم السائق': 'سائق غير معين',
  'من': 'الرياض',
  'إلى': '',
  'وقت الانطلاق': 'غير صالح',
  'وقت الوصول': '14:00',
  'التاريخ': '2026-11-11',
};
