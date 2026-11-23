import { createHash } from 'crypto';
import * as bcrypt from 'bcrypt';
import {
  ContractLocationType,
  ContractStatus,
  EmployeeMediaType,
  EmployeeStatus,
  NotificationType,
  PlotStatus,
  Prisma,
  PrismaClient,
  ProposalStatus,
  Role,
  TokenType,
  UserStatus,
} from '@prisma/client';

// Пароль для всіх демо-акаунтів
export const DEMO_PASSWORD = 'Password123!';

// ---------- Утиліти ----------

// Детермінований UUID: однаковий при кожному запуску
const uid = (ns: string, n: number) =>
  `${ns}-0000-4000-8000-${String(n).padStart(12, '0')}`;

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20261116);
const int = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));
const chance = (p: number) => rnd() < p;
const pick = <T>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];
function pickMany<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  while (out.length < n && copy.length) {
    out.push(copy.splice(Math.floor(rnd() * copy.length), 1)[0]);
  }
  return out;
}
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const NOW = new Date();
const DAY = 24 * 3600 * 1000;
const HOUR = 3600 * 1000;
const daysAgo = (d: number) => new Date(NOW.getTime() - d * DAY);
const daysAhead = (d: number) => new Date(NOW.getTime() + d * DAY);
const addH = (d: Date, h: number) => new Date(d.getTime() + h * HOUR);
const addD = (d: Date, days: number) => new Date(d.getTime() + days * DAY);
const past = (d: Date) =>
  new Date(Math.min(d.getTime(), NOW.getTime() - 5 * 60 * 1000));
const round100 = (v: number) => Math.round(v / 100) * 100;
const sha = (v: string) => createHash('sha256').update(v).digest('hex');

// ---------- Довідкові дані ----------

type Cat = 'funeral' | 'care' | 'monument';

const ROOT_CAT: Record<string, Cat> = {
  'b1000000-0000-4000-8000-000000000001': 'funeral',
  'b1000000-0000-4000-8000-000000000002': 'care',
  'b1000000-0000-4000-8000-000000000003': 'monument',
};

// Центр області/міста для координат та адрес
const REGION_INFO: Record<string, { lat: number; lng: number; city: string }> =
  {
    'Хмельницька область': { lat: 49.42, lng: 26.99, city: 'Хмельницький' },
    'Вінницька область': { lat: 49.23, lng: 28.47, city: 'Вінниця' },
    'Тернопільська область': { lat: 49.55, lng: 25.59, city: 'Тернопіль' },
    Київ: { lat: 50.45, lng: 30.52, city: 'Київ' },
    'Київська область': { lat: 50.15, lng: 30.3, city: 'Біла Церква' },
    'Чернігівська область': { lat: 51.5, lng: 31.3, city: 'Чернігів' },
    'Львівська область': { lat: 49.84, lng: 24.03, city: 'Львів' },
    'Івано-Франківська область': {
      lat: 48.92,
      lng: 24.71,
      city: 'Івано-Франківськ',
    },
    'Закарпатська область': { lat: 48.62, lng: 22.3, city: 'Ужгород' },
    'Волинська область': { lat: 50.75, lng: 25.33, city: 'Луцьк' },
    'Одеська область': { lat: 46.48, lng: 30.72, city: 'Одеса' },
    'Миколаївська область': { lat: 46.975, lng: 31.994, city: 'Миколаїв' },
    'Херсонська область': { lat: 46.635, lng: 32.617, city: 'Херсон' },
    'Харківська область': { lat: 49.99, lng: 36.23, city: 'Харків' },
    'Полтавська область': { lat: 49.59, lng: 34.55, city: 'Полтава' },
    'Дніпропетровська область': { lat: 48.46, lng: 35.05, city: 'Дніпро' },
  };

const CITY_REGION: Record<string, string> = {
  Хмельницький: 'Хмельницька область',
  Львів: 'Львівська область',
  Київ: 'Київ',
  Одеса: 'Одеська область',
  Харків: 'Харківська область',
  Дніпро: 'Дніпропетровська область',
  Вінниця: 'Вінницька область',
  'Івано-Франківськ': 'Івано-Франківська область',
  Тернопіль: 'Тернопільська область',
  Полтава: 'Полтавська область',
  Чернігів: 'Чернігівська область',
  Ужгород: 'Закарпатська область',
  Луцьк: 'Волинська область',
};

const STREETS = [
  'вул. Шевченка',
  'вул. Лесі Українки',
  'вул. Соборна',
  'вул. Героїв України',
  'вул. Франка',
  'вул. Хмельницького',
  'просп. Миру',
  'вул. Садова',
  'вул. Паркова',
  'вул. Січових Стрільців',
];

const customerDefs: [string, string][] = [
  ['Олена Коваленко', 'olena.kovalenko@example.com'],
  ['Андрій Мельник', 'andrii.melnyk@example.com'],
  ['Марія Шевченко', 'maria.shevchenko@example.com'],
  ['Ігор Бондаренко', 'ihor.bondarenko@example.com'],
  ['Тетяна Кравченко', 'tetiana.kravchenko@example.com'],
  ['Сергій Олійник', 'serhii.oliinyk@example.com'],
  ['Наталія Ткаченко', 'nataliia.tkachenko@example.com'],
  ['Василь Мороз', 'vasyl.moroz@example.com'],
  ['Ірина Лисенко', 'iryna.lysenko@example.com'],
  ['Дмитро Поліщук', 'dmytro.polishchuk@example.com'],
  ['Юлія Савчук', 'yuliia.savchuk@example.com'], // email не підтверджено
  ['Богдан Руденко', 'bohdan.rudenko@example.com'],
];

interface EmpDef {
  name: string;
  email: string;
  kind: Cat | 'mixed';
  regions: string[];
  description: string;
  blocked?: boolean;
  dual?: boolean; // має також роль customer
}

const employeeDefs: EmpDef[] = [
  {
    name: 'Петро Гончаренко',
    email: 'petro.honcharenko@example.com',
    kind: 'funeral',
    regions: [
      'Хмельницька область',
      'Вінницька область',
      'Тернопільська область',
    ],
    description:
      'Організовую поховання під ключ понад 12 років: від оформлення документів до поминального обіду. Працюю з родинами делікатно та без прихованих платежів.',
  },
  {
    name: 'Іван Савченко',
    email: 'ivan.savchenko@example.com',
    kind: 'funeral',
    regions: ['Київ', 'Київська область', 'Чернігівська область'],
    description:
      'Ритуальна служба з власним транспортом і залом прощання. Допомагаємо з кремацією, перевезенням та церемонією у будь-який час доби.',
  },
  {
    name: 'Роман Кузьменко',
    email: 'roman.kuzmenko@example.com',
    kind: 'funeral',
    regions: [
      'Львівська область',
      'Івано-Франківська область',
      'Закарпатська область',
      'Волинська область',
    ],
    description:
      'Церемоніймайстер і ритуальний агент. Беру на себе всі організаційні питання, щоб родина могла бути поруч із близькими.',
  },
  {
    name: 'Андрій Левченко',
    email: 'andrii.levchenko@example.com',
    kind: 'mixed',
    regions: ['Одеська область', 'Миколаївська область'],
    description:
      'Повний цикл послуг: похорон, благоустрій та встановлення пам’ятника. Одна бригада — один відповідальний за результат.',
  },
  {
    name: 'Микола Бойко',
    email: 'mykola.boiko@example.com',
    kind: 'monument',
    regions: [
      'Хмельницька область',
      'Тернопільська область',
      'Вінницька область',
    ],
    description:
      'Виготовляю пам’ятники з граніту та мармуру, лазерне гравіювання портретів. Власний цех, гарантія на роботи 5 років.',
  },
  {
    name: 'Олексій Павленко',
    email: 'oleksii.pavlenko@example.com',
    kind: 'monument',
    regions: ['Київ', 'Київська область', 'Полтавська область'],
    description:
      'Майстерня пам’ятників: одинарні та подвійні комплекси, реставрація старих надгробків, монтаж на готову основу.',
  },
  {
    name: 'Віталій Шаповал',
    email: 'vitalii.shapoval@example.com',
    kind: 'monument',
    regions: [
      'Харківська область',
      'Полтавська область',
      'Дніпропетровська область',
    ],
    description:
      'Камінь, граніт, мармур. Індивідуальні ескізи та встановлення по всьому регіону, доставка включена.',
  },
  {
    name: 'Степан Клименко',
    email: 'stepan.klymenko@example.com',
    kind: 'monument',
    regions: ['Львівська область', 'Волинська область', 'Закарпатська область'],
    description:
      'Каменяр у третьому поколінні. Працюю з гранітом, мармуром, ковкою; виготовляю огорожі та обрамлення.',
  },
  {
    name: 'Галина Гнатюк',
    email: 'halyna.hnatiuk@example.com',
    kind: 'care',
    regions: ['Хмельницька область', 'Вінницька область'],
    description:
      'Догляд за могилами: прибирання, озеленення, фарбування огорожі. Надсилаю фото до та після кожного виїзду.',
  },
  {
    name: 'Оксана Радченко',
    email: 'oksana.radchenko@example.com',
    kind: 'care',
    regions: ['Київ', 'Київська область'],
    description:
      'Сезонний та разовий догляд за місцями поховання, висадка квітів, укладання газону та плитки.',
  },
  {
    name: 'Лариса Тарасенко',
    email: 'larysa.tarasenko@example.com',
    kind: 'care',
    regions: ['Львівська область', 'Івано-Франківська область'],
    description:
      'Беру могили на постійний догляд за абонементом. Для родин, які живуть за кордоном, надаю щомісячні фотозвіти.',
  },
  {
    name: 'Юрій Гриценко',
    email: 'yurii.hrytsenko@example.com',
    kind: 'care',
    regions: ['Одеська область', 'Миколаївська область', 'Херсонська область'],
    description: 'Благоустрій та догляд за могилами на півдні країни.',
    blocked: true,
  },
  {
    name: 'Тарас Литвин',
    email: 'taras.lytvyn@example.com',
    kind: 'mixed',
    regions: [
      'Харківська область',
      'Дніпропетровська область',
      'Полтавська область',
    ],
    description:
      'Універсальна бригада: поховання, благоустрій, пам’ятники. Також сам замовляю послуги для рідних, тому розумію клієнтів.',
    dual: true,
  },
  {
    name: 'Катерина Зінченко',
    email: 'kateryna.zinchenko@example.com',
    kind: 'mixed',
    regions: [
      'Київ',
      'Хмельницька область',
      'Львівська область',
      'Одеська область',
    ],
    description:
      'Координую ритуальні послуги в кількох містах через перевірених партнерів. Завжди на зв’язку.',
    dual: true,
  },
];

const CONTRACT_TEXT: Record<Cat, { titles: string[]; descriptions: string[] }> =
  {
    funeral: {
      titles: [
        'Організація похорону',
        'Потрібен катафалк і церемоніймайстер',
        'Кремація та оформлення документів',
        'Поминальний обід',
        'Підготовка місця поховання',
        'Труна та ритуальні атрибути',
        'Перевезення та прощання з рідною людиною',
      ],
      descriptions: [
        'Потрібна повна організація церемонії та допомога з документами. Очікується близько 40 гостей.',
        'Прошу допомогти з транспортом і залом прощання. Важливо дотриматися часу, який вказано в заявці.',
        'Шукаємо людину, яка візьме на себе всі організаційні питання. Бажано з досвідом роботи з літніми людьми.',
        'Потрібно організувати поминальний обід на 30–40 осіб у закладі поруч із кладовищем.',
      ],
    },
    care: {
      titles: [
        'Прибирання та догляд за могилою',
        'Озеленення місця поховання',
        'Встановлення лавки біля могили',
        'Фарбування огорожі',
        'Сезонний догляд за могилою',
        'Укладання плитки навколо могили',
        'Заміна огорожі',
      ],
      descriptions: [
        'Живемо в іншому місті, тому шукаємо людину для регулярного догляду. Потрібні фото після кожного виконання.',
        'Місце поховання запущене, потрібне комплексне прибирання та висадка квітів.',
        'Хочемо облаштувати ділянку: плитка, лавка та квітник. Розміри ділянки 2×3 м.',
        'Стара огорожа іржавіє, потрібна заміна на металеву або кувану.',
      ],
    },
    monument: {
      titles: [
        'Виготовлення гранітного пам’ятника',
        'Подвійний пам’ятник із портретами',
        'Реставрація старого пам’ятника',
        'Гравіювання портрета та напису',
        'Мармуровий пам’ятник',
        'Встановлення готового пам’ятника',
        'Заміна плити та написів',
      ],
      descriptions: [
        'Потрібен пам’ятник із чорного граніту, бажаний розмір 100×50 см. Ескіз надам.',
        'Хочемо подвійний пам’ятник із лазерним гравіюванням. Готові обговорити матеріали та терміни.',
        'Пам’ятник просів і потемнів. Потрібне очищення, вирівнювання та відновлення написів.',
        'Потрібне якісне гравіювання портрета за фотографією, фото надішлю окремо.',
      ],
    },
  };

const PROPOSAL_COMMENTS = [
  'Готовий взятися за роботу вже цього тижня. Усі матеріали та виїзд включені у вартість.',
  'Маю великий досвід у таких замовленнях. Можу під’їхати на огляд безкоштовно.',
  'Виконаю якісно та у вказаний термін. Надам фотозвіт на кожному етапі.',
  'Пропоную свою ціну з урахуванням усіх нюансів із заявки. Готовий обговорити деталі.',
  'Працюю у вашому регіоні, тому зможу почати без затримок.',
  'Можу запропонувати знижку, якщо додасте ще одну послугу до цього замовлення.',
  'Усі роботи виконуємо з гарантією. Оплата за домовленістю: частина вперед, решта після завершення.',
  'Зв’яжіться зі мною, щоб уточнити деталі. Відповідаю протягом години.',
];

const REVIEW_TEXTS: Record<number, string[]> = {
  5: [
    'Все зробили бездоганно та вчасно. Дуже вдячні за турботу й повагу до нашої родини.',
    'Чудова робота, фото звіт надіслали того ж дня. Рекомендую без вагань.',
    'Професіонал своєї справи. Ціна відповідала домовленості, ніяких додаткових платежів.',
  ],
  4: [
    'Загалом усе добре, але трохи затримались із початком робіт. Результатом задоволені.',
    'Якісна робота. Єдине зауваження — хотілося б більше зворотного зв’язку по ходу виконання.',
  ],
  3: [
    'Робота виконана, але довелося кілька разів нагадувати про деталі. Результат середній.',
    'Загалом нормально, проте окремі моменти довелося переробляти.',
  ],
  2: [
    'Термін зірвали на кілька днів, якість нижча від очікуваної.',
    'Не все було зроблено так, як домовлялись. Довелося просити виправити.',
  ],
  1: [
    'Дуже незадоволений: роботу виконано неякісно, ціна змінювалась по ходу.',
  ],
};

const CUSTOMER_MSGS = [
  'Добрий день! Ваша пропозиція мені цікава, чи можемо обговорити деталі?',
  'Скажіть, будь ласка, чи входить вартість матеріалів у ціну?',
  'Коли ви зможете приїхати на огляд?',
  'Чи є у вас вільна дата у вказаний термін?',
  'Дякую, це нам підходить.',
  'Чи можна отримати знижку, якщо додати ще одну послугу?',
  'Надішлю вам усі потрібні документи сьогодні ввечері.',
  'Підтверджую, чекаємо вас у домовлений час.',
];

const EMPLOYEE_MSGS = [
  'Добрий день! Так, звісно, готовий обговорити всі деталі.',
  'Так, матеріали входять у вартість, додаткових платежів не буде.',
  'Можу під’їхати на огляд завтра після обіду.',
  'Вказана дата вільна, закріплю її за вами.',
  'Дякую за довіру, все зробимо якісно та вчасно.',
  'Залежить від обсягу додаткових робіт, можемо порахувати.',
  'Добре, чекаю на документи.',
  'Домовились, буду вчасно.',
];

// Розташування куплених ділянок: [номер кладовища, x, y, індекс клієнта]
const OWNED_PLOTS: [number, number, number, number][] = [
  [1, 2, 3, 0],
  [1, 5, 7, 1],
  [2, 4, 4, 2],
  [3, 6, 2, 3],
  [4, 3, 8, 4],
  [4, 9, 1, 5],
  [6, 7, 5, 6],
  [9, 1, 6, 7],
  [7, 10, 3, 8],
];

const cemeteryId = (n: number) =>
  `00000000-0000-0000-0000-00000000c${String(n).padStart(3, '0')}`;

// ---------- Основна функція ----------

export async function seedDemo(prisma: PrismaClient) {
  const marker = await prisma.user.findUnique({
    where: { id: uid('e1000000', 1) },
  });
  if (marker) {
    console.log('Демо-дані вже існують, пропускаю.');
    return;
  }

  console.log('Заповнення демо-даних...');
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const regionRows = await prisma.region.findMany();
  const regionId = new Map(regionRows.map((r) => [r.name, r.id]));
  const rid = (name: string) => {
    const id = regionId.get(name);
    if (!id) throw new Error(`Регіон не знайдено: ${name}`);
    return id;
  };

  // Послуги: тільки ті, що мають ціну (листя каталогу), згруповані за категорією
  const allServices = await prisma.service.findMany();
  const byId = new Map(allServices.map((s) => [s.id, s]));
  const rootOf = (id: string): string => {
    let cur = byId.get(id);
    while (cur?.parentId) cur = byId.get(cur.parentId);
    return cur?.id ?? id;
  };
  const servicesByCat: Record<Cat, { id: string; price: number }[]> = {
    funeral: [],
    care: [],
    monument: [],
  };
  for (const s of allServices) {
    if (!s.parentId || s.price == null) continue;
    const cat = ROOT_CAT[rootOf(s.id)];
    if (cat) servicesByCat[cat].push({ id: s.id, price: s.price });
  }

  // ----- Користувачі -----
  const userRows: Prisma.UserCreateManyInput[] = [];

  const customers = customerDefs.map(([name, email], i) => {
    const id = uid('e1000000', i + 1);
    userRows.push({
      id,
      email,
      name,
      passwordHash,
      status: UserStatus.active,
      roles: [Role.customer],
      activeMode: Role.customer,
      emailVerified: i !== 10,
      createdAt: daysAgo(int(150, 500)),
    });
    return { id, name, verified: i !== 10 };
  });

  interface Emp {
    userId: string;
    profileId: string;
    name: string;
    cats: Set<Cat>;
    regionIds: Set<string>;
    regionNames: string[];
    blocked: boolean;
    dual: boolean;
    kind: EmpDef['kind'];
  }

  const employees: Emp[] = employeeDefs.map((d, i) => {
    const userId = uid('e1000000', 101 + i);
    userRows.push({
      id: userId,
      email: d.email,
      name: d.name,
      passwordHash,
      status: d.blocked ? UserStatus.blocked : UserStatus.active,
      roles: d.dual ? [Role.customer, Role.employee] : [Role.employee],
      activeMode: Role.employee,
      emailVerified: true,
      createdAt: daysAgo(int(150, 500)),
    });
    const cats = new Set<Cat>(
      d.kind === 'mixed' ? ['funeral', 'care', 'monument'] : [d.kind],
    );
    return {
      userId,
      profileId: uid('e2000000', i + 1),
      name: d.name,
      cats,
      regionIds: new Set(d.regions.map(rid)),
      regionNames: d.regions,
      blocked: !!d.blocked,
      dual: !!d.dual,
      kind: d.kind,
    };
  });

  await prisma.user.createMany({ data: userRows, skipDuplicates: true });

  // ----- Профілі виконавців + портфоліо -----
  let mediaN = 0;
  for (let i = 0; i < employees.length; i++) {
    const e = employees[i];
    const def = employeeDefs[i];

    const spec: string[] = [];
    for (const cat of e.cats) {
      const pool = servicesByCat[cat];
      const n = e.kind === 'mixed' ? 3 : Math.min(pool.length, int(4, 6));
      spec.push(...pickMany(pool, n).map((s) => s.id));
    }

    await prisma.employeeProfile.create({
      data: {
        id: e.profileId,
        userId: e.userId,
        description: def.description,
        status: EmployeeStatus.available, // уточнюється наприкінці
        regions: { connect: [...e.regionIds].map((id) => ({ id })) },
        specialization: { connect: spec.map((id) => ({ id })) },
      },
    });

    const media: Prisma.EmployeeMediaCreateManyInput[] = [];
    const mediaCount = int(2, 5);
    for (let k = 0; k < mediaCount; k++) {
      mediaN++;
      const isVideo = k === mediaCount - 1 && chance(0.25);
      const id = uid('e3000000', mediaN);
      media.push({
        id,
        employeeId: e.profileId,
        // Заглушки: підмініть на реальні Cloudinary-посилання за потреби
        url: isVideo
          ? 'https://www.w3schools.com/html/mov_bbb.mp4'
          : `https://picsum.photos/seed/${id}/800/600`,
        publicId: `demo/${id}`,
        type: isVideo ? EmployeeMediaType.video : EmployeeMediaType.image,
        caption: chance(0.6)
          ? pick([
              'Виконана робота',
              'Готовий об’єкт',
              'Пам’ятник після встановлення',
              'Благоустрій ділянки',
              'Приклад нашої роботи',
            ])
          : null,
        createdAt: daysAgo(int(20, 300)),
      });
    }
    await prisma.employeeMedia.createMany({ data: media });
  }

  // ----- Куплені ділянки (для контрактів типу burial_plot) -----
  const cemeteryRows = await prisma.cemetery.findMany();
  const cemeteryById = new Map(cemeteryRows.map((c) => [c.id, c]));

  interface OwnedPlot {
    plotId: string;
    ownerId: string;
    regionName: string;
  }
  const ownedPlots: OwnedPlot[] = [];

  for (let k = 0; k < OWNED_PLOTS.length; k++) {
    const [cn, x, y, ci] = OWNED_PLOTS[k];
    const cem = cemeteryById.get(cemeteryId(cn));
    if (!cem) continue;
    const plot = await prisma.burialPlot.findUnique({
      where: {
        cemeteryId_positionX_positionY: {
          cemeteryId: cem.id,
          positionX: x,
          positionY: y,
        },
      },
    });
    if (!plot) continue;

    const owner = customers[ci];
    await prisma.burialPlot.update({
      where: { id: plot.id },
      data: {
        status: PlotStatus.sold,
        ownerId: owner.id,
        reservedById: null,
        reservedUntil: null,
      },
    });

    const credit = chance(0.5);
    const months = pick([6, 12, 24]);
    const down = credit ? Math.round((plot.price * 0.3) / 100) * 100 : null;
    await prisma.plotPurchase.create({
      data: {
        id: uid('ea000000', k + 1),
        plotId: plot.id,
        userId: owner.id,
        price: plot.price,
        paymentType: credit ? 'credit' : 'full',
        creditMonths: credit ? months : null,
        downPayment: down,
        monthlyPayment: credit
          ? Math.ceil((plot.price - (down ?? 0)) / months)
          : null,
        createdAt: daysAgo(int(30, 400)),
      },
    });

    ownedPlots.push({
      plotId: plot.id,
      ownerId: owner.id,
      regionName: CITY_REGION[cem.city],
    });
  }

  // ----- Контракти і пропозиції -----
  const statuses = shuffle<ContractStatus>([
    ...Array<ContractStatus>(14).fill(ContractStatus.open),
    ...Array<ContractStatus>(10).fill(ContractStatus.in_progress),
    ...Array<ContractStatus>(6).fill(ContractStatus.awaiting_confirmation),
    ...Array<ContractStatus>(26).fill(ContractStatus.completed),
    ...Array<ContractStatus>(8).fill(ContractStatus.cancelled),
  ]);

  // Хто може бути замовником: підтверджені клієнти + виконавці з двома ролями
  const customerPool = [
    ...customers.filter((c) => c.verified).map((c) => ({ id: c.id })),
    ...employees.filter((e) => e.dual).map((e) => ({ id: e.userId })),
  ];
  const coveredRegions = [...new Set(employees.flatMap((e) => e.regionNames))];

  interface CInfo {
    id: string;
    customerId: string;
    employeeProfileId: string | null;
    employeeUserId: string | null;
    status: ContractStatus;
    createdAt: Date;
    date: Date;
  }
  interface PInfo {
    id: string;
    contractId: string;
    customerId: string;
    employeeUserId: string;
    status: ProposalStatus;
    createdAt: Date;
  }
  const contracts: CInfo[] = [];
  const proposals: Prisma.ProposalCreateManyInput[] = [];
  const proposalInfos: PInfo[] = [];
  const notifications: Prisma.NotificationCreateManyInput[] = [];
  let proposalN = 0;
  let notifN = 0;

  const notify = (
    userId: string,
    type: NotificationType,
    payload: Prisma.InputJsonValue,
    at: Date,
    readChance?: number,
  ) => {
    const createdAt = past(at);
    const old = NOW.getTime() - createdAt.getTime() > 3 * DAY;
    const read = chance(readChance ?? (old ? 0.9 : 0.3));
    notifications.push({
      id: uid('e9000000', ++notifN),
      userId,
      type,
      payload,
      readAt: read ? past(addH(createdAt, int(1, 20))) : null,
      createdAt,
    });
  };

  for (let i = 0; i < statuses.length; i++) {
    const status = statuses[i];
    const contractId = uid('e4000000', i + 1);
    const cat = pick<Cat>([
      'funeral',
      'funeral',
      'care',
      'care',
      'monument',
      'monument',
      'monument',
    ]);

    // Місце та замовник
    let customerId = pick(customerPool).id;
    let regionName: string;
    let locationType: ContractLocationType;
    let burialPlotId: string | null = null;
    let address: string | null = null;

    if (ownedPlots.length && chance(0.25)) {
      const plot = pick(ownedPlots);
      customerId = plot.ownerId;
      regionName = plot.regionName;
      locationType = ContractLocationType.burial_plot;
      burialPlotId = plot.plotId;
    } else {
      regionName = pick(coveredRegions);
      const info = REGION_INFO[regionName];
      locationType = ContractLocationType.address;
      address = `${info.city}, ${pick(STREETS)}, ${int(1, 120)}`;
    }
    const regId = rid(regionName);

    // Послуги та бюджет
    const chosen = pickMany(servicesByCat[cat], int(1, 3));
    const sum = chosen.reduce((acc, s) => acc + s.price, 0);
    const budget = Math.max(1000, round100(sum * (0.9 + rnd() * 0.4)));

    // Дати
    let createdAt: Date;
    let date: Date;
    switch (status) {
      case ContractStatus.open:
        createdAt = daysAgo(int(1, 20));
        date = daysAhead(int(5, 45));
        break;
      case ContractStatus.in_progress:
        createdAt = daysAgo(int(10, 30));
        date = daysAhead(int(-3, 7));
        break;
      case ContractStatus.awaiting_confirmation:
        createdAt = daysAgo(int(20, 50));
        date = daysAgo(int(2, 8));
        break;
      case ContractStatus.completed:
        createdAt = daysAgo(int(40, 200));
        date = addD(createdAt, int(5, 25));
        break;
      default:
        createdAt = daysAgo(int(10, 150));
        date = addD(createdAt, int(7, 30));
    }

    // Кандидати у виконавці
    const active =
      status === ContractStatus.open ||
      status === ContractStatus.in_progress ||
      status === ContractStatus.awaiting_confirmation;
    const eligible = (e: Emp) =>
      e.userId !== customerId && (!active || !e.blocked);
    let cands = employees.filter(
      (e) => eligible(e) && e.cats.has(cat) && e.regionIds.has(regId),
    );
    if (cands.length < 2) {
      cands = employees.filter((e) => eligible(e) && e.cats.has(cat));
    }

    let propCount: number;
    if (status === ContractStatus.open) propCount = int(0, 4);
    else if (status === ContractStatus.cancelled)
      propCount = chance(0.3) ? 0 : int(1, 3);
    else propCount = int(2, 4);
    const chosenEmps = pickMany(cands, propCount);

    const hasWinner =
      status === ContractStatus.in_progress ||
      status === ContractStatus.awaiting_confirmation ||
      status === ContractStatus.completed;
    const winner = hasWinner ? chosenEmps[0] : undefined;
    if (hasWinner && !winner) {
      throw new Error(`Немає виконавця для контракту ${contractId}`);
    }

    await prisma.contract.create({
      data: {
        id: contractId,
        title: pick(CONTRACT_TEXT[cat].titles),
        description: pick(CONTRACT_TEXT[cat].descriptions),
        customerId,
        regionId: regId,
        locationType,
        positionX: null,
        positionY: null,
        address,
        burialPlotId,
        date,
        budget,
        createdAt,
        employeeId: winner?.profileId ?? null,
        status,
        serviceTypes: { connect: chosen.map((s) => ({ id: s.id })) },
      },
    });

    contracts.push({
      id: contractId,
      customerId,
      employeeProfileId: winner?.profileId ?? null,
      employeeUserId: winner?.userId ?? null,
      status,
      createdAt,
      date,
    });

    // Пропозиції
    let acceptedAt: Date | null = null;
    chosenEmps.forEach((e, idx) => {
      const id = uid('e5000000', ++proposalN);
      let pStatus: ProposalStatus;
      if (status === ContractStatus.open) {
        pStatus = chance(0.15)
          ? ProposalStatus.cancelled
          : ProposalStatus.pending;
      } else if (status === ContractStatus.cancelled) {
        pStatus = chance(0.5)
          ? ProposalStatus.rejected
          : ProposalStatus.cancelled;
      } else {
        pStatus = idx === 0 ? ProposalStatus.accepted : ProposalStatus.rejected;
      }
      const pCreated = past(addH(createdAt, int(1, 72)));
      proposals.push({
        id,
        contractId,
        employeeId: e.profileId,
        price: Math.max(500, round100(budget * (0.8 + rnd() * 0.35))),
        comment: pick(PROPOSAL_COMMENTS),
        status: pStatus,
        createdAt: pCreated,
      });
      proposalInfos.push({
        id,
        contractId,
        customerId,
        employeeUserId: e.userId,
        status: pStatus,
        createdAt: pCreated,
      });

      notify(
        customerId,
        NotificationType.proposal_received,
        { contractId, proposalId: id, employeeId: e.profileId },
        pCreated,
      );

      if (pStatus === ProposalStatus.accepted) {
        acceptedAt = past(addH(pCreated, int(2, 48)));
        notify(
          e.userId,
          NotificationType.proposal_accepted,
          { contractId, proposalId: id },
          acceptedAt,
        );
      } else if (pStatus === ProposalStatus.rejected) {
        notify(
          e.userId,
          NotificationType.proposal_rejected,
          { contractId, proposalId: id },
          past(addH(pCreated, int(24, 96))),
        );
      }
    });

    // Сповіщення про зміну статусу
    if (winner && acceptedAt) {
      const t1 = addH(acceptedAt, int(1, 12));
      notify(
        customerId,
        NotificationType.contract_status_changed,
        { contractId, status: ContractStatus.in_progress },
        t1,
      );
      if (
        status === ContractStatus.awaiting_confirmation ||
        status === ContractStatus.completed
      ) {
        const t2 = addH(date, int(2, 24));
        notify(
          customerId,
          NotificationType.contract_status_changed,
          { contractId, status: ContractStatus.awaiting_confirmation },
          t2,
        );
        if (status === ContractStatus.completed) {
          notify(
            winner.userId,
            NotificationType.contract_status_changed,
            { contractId, status: ContractStatus.completed },
            addH(t2, int(6, 72)),
          );
        }
      }
    }
    if (status === ContractStatus.cancelled) {
      for (const p of proposalInfos.filter(
        (p) => p.contractId === contractId,
      )) {
        notify(
          p.employeeUserId,
          NotificationType.contract_status_changed,
          { contractId, status: ContractStatus.cancelled },
          addD(createdAt, int(2, 10)),
        );
      }
    }
  }

  await prisma.proposal.createMany({ data: proposals });

  // ----- Відгуки -----
  const reviews: Prisma.ReviewCreateManyInput[] = [];
  let reviewN = 0;
  for (const c of contracts) {
    if (c.status !== ContractStatus.completed || !c.employeeProfileId) continue;
    if (!chance(0.85)) continue;
    const roll = rnd();
    const rating =
      roll < 0.5 ? 5 : roll < 0.8 ? 4 : roll < 0.92 ? 3 : roll < 0.97 ? 2 : 1;
    reviews.push({
      id: uid('e6000000', ++reviewN),
      contractId: c.id,
      employeeId: c.employeeProfileId,
      customerId: c.customerId,
      rating,
      text: pick(REVIEW_TEXTS[rating]),
      createdAt: past(addD(c.date, int(1, 10))),
    });
  }
  await prisma.review.createMany({ data: reviews });

  // ----- Рейтинги та статуси виконавців -----
  for (const e of employees) {
    const mine = reviews.filter((r) => r.employeeId === e.profileId);
    const avg = mine.length
      ? mine.reduce((s, r) => s + r.rating, 0) / mine.length
      : 0;
    const completed = contracts.filter(
      (c) =>
        c.employeeProfileId === e.profileId &&
        c.status === ContractStatus.completed,
    ).length;
    const busy = contracts.some(
      (c) =>
        c.employeeProfileId === e.profileId &&
        c.status === ContractStatus.in_progress,
    );
    const status = e.blocked
      ? EmployeeStatus.offline
      : busy
        ? EmployeeStatus.busy
        : chance(0.15)
          ? EmployeeStatus.offline
          : EmployeeStatus.available;
    await prisma.employeeProfile.update({
      where: { id: e.profileId },
      data: {
        rating: Math.round(avg * 100) / 100,
        reviewsCount: mine.length,
        completedContracts: completed,
        status,
      },
    });
  }

  // ----- Чати -----
  const seenPairs = new Set<string>();
  const messages: Prisma.MessageCreateManyInput[] = [];
  let convN = 0;
  let msgN = 0;

  for (const p of proposalInfos) {
    if (p.status === ProposalStatus.cancelled) continue;
    const key = `${p.customerId}|${p.employeeUserId}`;
    if (seenPairs.has(key)) continue;
    const mustTalk = p.status === ProposalStatus.accepted;
    if (!mustTalk && !chance(0.65)) continue;
    seenPairs.add(key);

    const convId = uid('e7000000', ++convN);
    const count = int(3, 8);
    let t = past(addH(p.createdAt, 0.5));
    const first = t;
    let lastMsgId = '';
    let lastSender = '';
    for (let m = 0; m < count; m++) {
      const fromCustomer = m % 2 === 0;
      const senderId = fromCustomer ? p.customerId : p.employeeUserId;
      lastMsgId = uid('e8000000', ++msgN);
      lastSender = senderId;
      messages.push({
        id: lastMsgId,
        conversationId: convId,
        senderId,
        text: pick(fromCustomer ? CUSTOMER_MSGS : EMPLOYEE_MSGS),
        createdAt: t,
      });
      t = past(new Date(t.getTime() + int(3, 180) * 60 * 1000));
    }
    const lastAt = messages[messages.length - 1].createdAt as Date;

    await prisma.conversation.create({
      data: {
        id: convId,
        customerId: p.customerId,
        employeeId: p.employeeUserId,
        createdAt: first,
        lastMessageAt: lastAt,
      },
    });

    const recipient =
      lastSender === p.customerId ? p.employeeUserId : p.customerId;
    notify(
      recipient,
      NotificationType.new_message,
      { conversationId: convId, messageId: lastMsgId },
      lastAt,
      0.4,
    );
  }

  await prisma.message.createMany({ data: messages });
  await prisma.notification.createMany({ data: notifications });

  // ----- Токени -----
  await prisma.userToken.createMany({
    data: [
      {
        id: uid('eb000000', 1),
        userId: customers[10].id,
        type: TokenType.email_verification,
        tokenHash: sha('demo-email-verification-token'),
        expiresAt: daysAhead(1),
      },
      {
        id: uid('eb000000', 2),
        userId: customers[9].id,
        type: TokenType.password_reset,
        tokenHash: sha('demo-password-reset-token'),
        expiresAt: daysAgo(10),
        usedAt: daysAgo(10),
        createdAt: daysAgo(11),
      },
    ],
    skipDuplicates: true,
  });

  const byStatus = statuses.reduce<Record<string, number>>((acc, s) => {
    acc[s] = (acc[s] ?? 0) + 1;
    return acc;
  }, {});
  console.log(
    `Демо-дані: ${customers.length} клієнтів, ${employees.length} виконавців, ` +
      `${contracts.length} контрактів (${JSON.stringify(byStatus)}), ` +
      `${proposals.length} пропозицій, ${reviews.length} відгуків, ` +
      `${convN} чатів, ${messages.length} повідомлень, ${notifications.length} сповіщень.`,
  );
  console.log(`Пароль усіх демо-акаунтів: ${DEMO_PASSWORD}`);
}
