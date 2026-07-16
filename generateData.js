/* eslint-disable */
var ALLOWED_PHONE_CODES = ['755','550','551','552','553','554','556','557','559','770','771','772','773','774','775','776','777','778','779','220','221','222','225','227','500','501','502','504','505','507','508','509'];
var PIN_DIGIT_POOL = '567892450122345012345678923450123423450123450123456789234';
var FIRST_NAMES = ['Александр','Мария','Дмитрий','Елена','Сергей','Анна','Иван','Ольга','Николай','Татьяна'];
var MIDDLE_NAMES = ['Александрович','Ивановна','Дмитриевич','Сергеевна','Николаевич','Петровна','Иванович','Олеговна'];
var LAST_NAMES = ['Иванов','Петрова','Смирнов','Кузнецова','Попов','Соколова','Лебедев','Новикова','Морозов','Волкова'];
var FIXED = {
  password: 'Test12345',
  smsCode: '0000',
  socialFundCode: '000000',
  street: 'Манаса проспект',
  house: '1',
  apartment: '13',
  company: 'OOO',
  income: '50000',
  additionalIncome: '10000',
  contactName: 'Матвей',
  region: 'Баткенская область',
  district: 'Кадамжайский район',
  city: 'Айдаркен',
  position: 'director',
  dependents: '1',
  ewallet: 'balance',
  walletType: 'balance',
  employmentStatus: 'director',
  employerName: 'OOO',
  insuranceProvider: 'dordoi',
  currency: 'KGS',
  language: 'ru'
};

var pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
var randomDigits = (length) => {
  let out = '';
  for (let i = 0; i < length; i++) out += Math.floor(Math.random() * 10);
  return out;
};
var pad = (n) => String(n).padStart(2, '0');

function randomBirthDate() {
  const now = new Date();
  const age = 20 + Math.floor(Math.random() * 46);
  return new Date(now.getFullYear() - age, Math.floor(Math.random() * 12), 1 + Math.floor(Math.random() * 28));
}

function formatDdMmYyyy(date, sep) {
  return `${pad(date.getDate())}${sep}${pad(date.getMonth() + 1)}${sep}${date.getFullYear()}`;
}

function generatePin(birthDate) {
  const gender = pick(['1', '2']);
  const dob = formatDdMmYyyy(birthDate, '');
  let last = '';
  for (let i = 0; i < 5; i++) {
    last += PIN_DIGIT_POOL[Math.floor(Math.random() * (PIN_DIGIT_POOL.length - 1))];
  }
  return `${gender}${dob}${last}`;
}

function generatePhone() {
  return pick(ALLOWED_PHONE_CODES) + randomDigits(6);
}

function generatePassportNumber() {
  return 'AC' + randomDigits(7);
}

function generatePassportAuthority() {
  return 'МКК' + randomDigits(6);
}

function generatePassportIssueDate() {
  const now = new Date();
  const from = new Date(now.getFullYear() - 5, now.getMonth(), now.getDate()).getTime();
  const ts = from + Math.random() * (now.getTime() - from);
  return new Date(ts);
}

function translit(str) {
  const map = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'i',
    к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
    х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya'
  };
  return str.toLowerCase().split('').map((ch) => (map[ch] !== undefined ? map[ch] : ch)).join('');
}

function generateClient() {
  const firstName = pick(FIRST_NAMES);
  const middleName = pick(MIDDLE_NAMES);
  const lastName = pick(LAST_NAMES);
  const birthDate = randomBirthDate();
  const phone = generatePhone();
  return {
    firstName,
    middleName,
    lastName,
    birthDate,
    pin: generatePin(birthDate),
    phone,
    email: `${translit(firstName)}.${translit(lastName)}${randomDigits(5)}@gmail.com`,
    password: FIXED.password,
    smsCode: FIXED.smsCode,
    socialFundCode: FIXED.socialFundCode,
    passportNumber: generatePassportNumber(),
    passportAuthority: generatePassportAuthority(),
    passportIssueDate: formatDdMmYyyy(generatePassportIssueDate(), '.'),
    contactName: FIXED.contactName,
    contactPhone: '0' + generatePhone(),
    walletNumber: phone
  };
}
