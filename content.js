/* eslint-disable */
(function () {
  'use strict';

  const ALLOWED_PHONE_CODES = [
    '755',
    '550',
    '551',
    '552',
    '553',
    '554',
    '556',
    '557',
    '559',
    '770',
    '771',
    '772',
    '773',
    '774',
    '775',
    '776',
    '777',
    '778',
    '779',
    '220',
    '221',
    '222',
    '225',
    '227',
    '500',
    '501',
    '502',
    '504',
    '505',
    '507',
    '508',
    '509'
  ];

  const PIN_DIGIT_POOL = '567892450122345012345678923450123423450123450123456789234';

  const FIRST_NAMES = ['Александр', 'Мария', 'Дмитрий', 'Елена', 'Сергей', 'Анна', 'Иван', 'Ольга', 'Николай', 'Татьяна'];
  const MIDDLE_NAMES = ['Александрович', 'Ивановна', 'Дмитриевич', 'Сергеевна', 'Николаевич', 'Петровна', 'Иванович', 'Олеговна'];
  const LAST_NAMES = ['Иванов', 'Петрова', 'Смирнов', 'Кузнецова', 'Попов', 'Соколова', 'Лебедев', 'Новикова', 'Морозов', 'Волкова'];

  const FIXED = {
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
    ewallet: 'balance'
  };

  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const randomDigits = (length) => {
    let out = '';
    for (let i = 0; i < length; i++) out += Math.floor(Math.random() * 10);
    return out;
  };
  const pad = (n) => String(n).padStart(2, '0');

  function randomBirthDate() {
    const minAge = 19;
    const maxAge = 65;
    const now = new Date();
    const age = minAge + Math.floor(Math.random() * (maxAge - minAge + 1));
    const year = now.getFullYear() - age;
    const month = 1 + Math.floor(Math.random() * 12);
    const day = 1 + Math.floor(Math.random() * 28);
    return new Date(year, month - 1, day);
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
      а: 'a',
      б: 'b',
      в: 'v',
      г: 'g',
      д: 'd',
      е: 'e',
      ё: 'e',
      ж: 'zh',
      з: 'z',
      и: 'i',
      й: 'i',
      к: 'k',
      л: 'l',
      м: 'm',
      н: 'n',
      о: 'o',
      п: 'p',
      р: 'r',
      с: 's',
      т: 't',
      у: 'u',
      ф: 'f',
      х: 'h',
      ц: 'c',
      ч: 'ch',
      ш: 'sh',
      щ: 'sch',
      ъ: '',
      ы: 'y',
      ь: '',
      э: 'e',
      ю: 'yu',
      я: 'ya'
    };
    return str
      .toLowerCase()
      .split('')
      .map((ch) => (map[ch] !== undefined ? map[ch] : ch))
      .join('');
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

  const nativeInputSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  const nativeTextareaSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;

  function setReactValue(el, value) {
    const setter = el.tagName === 'TEXTAREA' ? nativeTextareaSetter : nativeInputSetter;
    setter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  const byTestId = (id) => document.querySelector(`[data-qa-selector="${id}"]`);

  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function waitFor(getEl, timeout = 4000, interval = 100) {
    return new Promise((resolve) => {
      const start = Date.now();
      const tick = () => {
        const el = getEl();
        if (el) return resolve(el);
        if (Date.now() - start >= timeout) return resolve(null);
        setTimeout(tick, interval);
      };
      tick();
    });
  }

  function fillElement(el, value) {
    if (!el) return false;
    el.focus();
    setReactValue(el, value);
    return true;
  }

  function fillInput(testId, value) {
    const container = byTestId(testId);
    if (!container) return false;
    const input = container.matches('input, textarea') ? container : container.querySelector('input, textarea');
    return fillElement(input, value);
  }

  async function selectOption(openFn, findOptionFn, attempts = 3) {
    for (let attempt = 0; attempt < attempts; attempt++) {
      if (!openFn()) return false;
      const option = await waitFor(findOptionFn, 1500);
      if (option) {
        option.click();
        await delay(150);
        return true;
      }
    }
    return false;
  }

  const optionByValue = (value) => document.querySelector(`[data-qa-selector="select-value-${value}"]`);

  async function fillSelect(containerTestId, optionValue) {
    const container = await waitFor(() => byTestId(containerTestId));
    if (!container) return false;
    return selectOption(
      () => {
        container.click();
        return true;
      },
      () => optionByValue(optionValue)
    );
  }

  function checkCheckbox(testId) {
    const container = byTestId(testId);
    if (!container) return false;
    const input = container.matches('input') ? container : container.querySelector('input[type="checkbox"], input');
    if (!input) return false;
    if (!input.checked) input.click();
    return true;
  }

  function clickTestId(testId) {
    const el = byTestId(testId);
    if (!el) return false;
    const target = el.matches('button, a, input') ? el : el.querySelector('button, a, input') || el;
    target.click();
    return true;
  }

  const isOffline = () => location.hostname.includes('offline');

  function inputsByPlaceholder(placeholder) {
    return Array.from(document.querySelectorAll('input, textarea')).filter((el) => el.placeholder === placeholder);
  }

  function fillByPlaceholder(placeholder, value, index = 0) {
    return fillElement(inputsByPlaceholder(placeholder)[index], value);
  }

  function fillPhoneOffline(value, index = 0) {
    const els = Array.from(document.querySelectorAll('input')).filter((el) => el.type === 'tel' || el.placeholder === '+996 (XXX) XXX-XXX');
    return fillElement(els[index], value);
  }

  function elementsByText(text) {
    const snapshot = document.evaluate(
      `//*[normalize-space(.)=${JSON.stringify(text)} or normalize-space(text())=${JSON.stringify(text)}]`,
      document,
      null,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      null
    );
    const result = [];
    for (let i = 0; i < snapshot.snapshotLength; i++) result.push(snapshot.snapshotItem(i));
    return result.filter((el) => !result.some((other) => other !== el && el.contains(other)));
  }

  function openSelectByTexts(placeholderTexts, index = 0) {
    for (const text of placeholderTexts) {
      const candidates = elementsByText(text);
      const el = candidates[index] || candidates[0];
      if (el) {
        (el.closest('.sf-select__container') || el).click();
        return true;
      }
    }
    return false;
  }

  async function offlineSelectByTestId(placeholderTexts, optionValue, index = 0) {
    return selectOption(
      () => openSelectByTexts(placeholderTexts, index),
      () => optionByValue(optionValue)
    );
  }

  async function offlineSelectByOptionText(placeholderTexts, optionText, index = 0) {
    return selectOption(
      () => openSelectByTexts(placeholderTexts, index),
      () => elementsByText(optionText)[0]
    );
  }

  function checkFirstCheckbox() {
    const cb = document.querySelector('input[type="checkbox"]');
    if (cb && !cb.checked) cb.click();
  }

  function clickButtonByText(text, className) {
    let btn = null;
    if (className) btn = Array.from(document.querySelectorAll('button.' + className)).find(isVisible);
    if (!btn) {
      btn = Array.from(document.querySelectorAll('button')).find((el) => isVisible(el) && (el.textContent || '').trim() === text);
    }
    if (!btn) return false;
    btn.click();
    return true;
  }

  const DOCUMENT_UPLOAD_PATH = '/web/private/client/document/upload';
  const DOCUMENT_TYPES = { front: '4', back: '5', selfie: '6' };

  const getApiBase = () => `${location.protocol}//api.${location.hostname}`;

  function getAuthToken() {
    const match = document.cookie.match(/(?:^|;\s*)auth\.token=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  }

  async function getImageBlob() {
    return await (await fetch(TEST_IMAGE_DATA_URL)).blob();
  }

  async function uploadDocuments() {
    const token = getAuthToken();
    if (!token) throw new Error('auth.token не найден в cookie');
    const imageBlob = await getImageBlob();
    for (const [name, type] of Object.entries(DOCUMENT_TYPES)) {
      const formData = new FormData();
      formData.append('document', imageBlob, 'test-image.jpg');
      formData.append('type', type);
      const response = await fetch(getApiBase() + DOCUMENT_UPLOAD_PATH, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token },
        body: formData,
        credentials: 'include'
      });
      if (!response.ok) throw new Error(`Загрузка "${name}" не удалась: ${response.status}`);
    }
    return true;
  }

  async function uploadDocumentsOffline() {
    const imageBlob = await getImageBlob();
    const inputIds = ['id_document_input_front', 'id_document_input_back', 'id_document_input_selfie'];
    for (const id of inputIds) {
      const container = byTestId(id);
      if (!container) continue;
      const input = container.matches('input[type="file"]') ? container : container.querySelector('input[type="file"]');
      if (!input) continue;
      const file = new File([imageBlob], 'test-image.jpg', { type: 'image/jpeg' });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      input.files = dataTransfer.files;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      await delay(600);
    }
    const submit = await waitFor(() => {
      const btn = byTestId('id_document_submit');
      return btn && !btn.classList.contains('disabled') ? btn : null;
    }, 8000);
    if (submit) submit.click();
    await delay(500);
    return true;
  }

  const OFFLINE_STEPS = {
    step1: {
      match: (path) => /\/client\/create/.test(path) || inputsByPlaceholder('Введите ИНН').length > 0,
      fill: async (c) => {
        fillByPlaceholder('Введите имя', c.firstName, 0);
        fillByPlaceholder('Введите фамилию', c.lastName);
        fillByPlaceholder('Введите отчество', c.middleName);
        fillByPlaceholder('Введите ИНН', c.pin);
        fillPhoneOffline(c.phone, 0);
        clickButtonByText('Отправить код', 'registration__code');
        await waitFor(() => inputsByPlaceholder('Введите СМС код')[0], 5000);
        fillByPlaceholder('Введите СМС код', c.smsCode);
        fillByPlaceholder('Введите адрес электронной почты', c.email);
        fillByPlaceholder('Введите серию и номер паспорта', c.passportNumber);
        fillByPlaceholder('Введите орган выдачи паспорта', c.passportAuthority);
        fillByPlaceholder('Введите дату выдачи паспорта', c.passportIssueDate);
        await offlineSelectByTestId(['Выберите область'], FIXED.region, 0);
        await offlineSelectByTestId(['Выберите район'], FIXED.district, 0);
        await offlineSelectByTestId(['Выберите город', 'Город'], FIXED.city, 0);
        fillByPlaceholder('Введите название улицы', FIXED.street, 0);
        fillByPlaceholder('Введите номер дома', FIXED.house, 0);
        fillByPlaceholder('Введите номер квартиры', FIXED.apartment, 0);
        checkFirstCheckbox();
        fillByPlaceholder('Введите место работы', FIXED.company);
        await offlineSelectByOptionText(['Введите должность'], 'Руководитель (дир., зам.дир.,)');
        fillByPlaceholder('Введите имя', c.contactName, 1);
        fillPhoneOffline(generatePhone(), 1);
      }
    },
    socialFund: {
      match: (path) => /social-fund/.test(path),
      fill: async (c) => {
        await uploadDocumentsOffline();
        const codeInput = Array.from(document.querySelectorAll('input')).find((el) => !['hidden', 'file', 'checkbox', 'radio'].includes(el.type) && el.offsetParent !== null);
        if (codeInput) {
          codeInput.focus();
          setReactValue(codeInput, c.socialFundCode);
        }
      }
    },
    application: {
      match: (path) => /application\/create/.test(path),
      fill: async (c) => {
        await offlineSelectByOptionText(['Выберите кошелек'], 'Balance', 0);
        fillPhoneOffline(c.walletNumber, 0);
        checkCheckbox('checkbox_accept_all');
      }
    }
  };

  const STEPS = {
    step1: {
      match: (path) => /registraciya|\/registration(\/step1)?$/.test(path),
      fill: async (c) => {
        fillInput('input_phone', '0' + c.phone);
        clickTestId('btn_get_sms');
        await waitFor(() => {
          const el = byTestId('input_sms_code');
          return el && isVisible(el) ? el : null;
        }, 5000);
        fillInput('input_sms_code', c.smsCode);
        fillInput('input_client_name', c.firstName);
        fillInput('input_client_surname', c.lastName);
        fillInput('input_client_middlename', c.middleName);
        fillInput('input_pin', c.pin);
        fillInput('input_email', c.email);
        fillInput('input_password_first', c.password);
        fillInput('input_repeat_password', c.password);
        checkCheckbox('checkbox_accept_all');
      }
    },
    step2: {
      match: (path) => /step2/.test(path),
      fill: async (c) => {
        fillInput('input_document_number', c.passportNumber);
        fillInput('input_document_registration_date', c.passportIssueDate);
        fillInput('input_passport_authority', c.passportAuthority);
        await fillSelect('select_primary_regions', FIXED.region);
        await fillSelect('select_primary_districts', FIXED.district);
        await fillSelect('select_primary_cities', FIXED.city);
        fillInput('input_primary_street', FIXED.street);
        fillInput('input_primary_house', FIXED.house);
        fillInput('input_primary_apartment', FIXED.apartment);
        checkCheckbox('checkbox_same_address');
        fillInput('input_contact_name', c.contactName);
        fillInput('input_contact_phone', c.contactPhone);
      }
    },
    step3: {
      match: (path) => /step3/.test(path),
      fill: async (c) => {
        fillInput('input_company_name', FIXED.company);
        await fillSelect('select_post_type', FIXED.position);
        fillInput('input_income', FIXED.income);
        fillInput('input_additional_income', FIXED.additionalIncome);
        await fillSelect('select_dependents', FIXED.dependents);
      }
    },
    step4: {
      match: (path) => /step4/.test(path),
      fill: async () => {
        await uploadDocuments();
        location.reload();
      }
    },
    step6: {
      match: (path) => /step6/.test(path),
      fill: async (c) => {
        await fillSelect('select_ewallet_type', FIXED.ewallet);
        fillInput('input_ewallet_number', '0' + c.walletNumber);
        checkCheckbox('checkbox_accept_all');
      }
    },
    socialFund: {
      match: (path) => /social-fund/.test(path),
      fill: (c) => {
        fillInput('input_sms_code', c.socialFundCode);
      }
    }
  };

  const isErpApplicationTodo = () => /\/applications\/todo\/\d+\/client-finish-manual-verification/.test(location.pathname);

  const isVisible = (el) => !!el && el.offsetParent !== null;

  function findClickableByText(text) {
    return Array.from(document.querySelectorAll('button, a, input[type="button"], input[type="submit"]')).find((el) => isVisible(el) && (el.textContent || el.value || '').trim() === text);
  }

  function findBootboxConfirm() {
    return Array.from(document.querySelectorAll('.modal button[data-bb-handler="confirm"], button[data-bb-handler="confirm"]')).find(isVisible);
  }

  function fireClick(el) {
    if (!el) return;
    const view = typeof unsafeWindow !== 'undefined' ? unsafeWindow : undefined;
    ['mousedown', 'mouseup', 'click'].forEach((type) => {
      const init = { bubbles: true, cancelable: true };
      if (view) init.view = view;
      el.dispatchEvent(new MouseEvent(type, init));
    });
  }

  function setErpControl(input) {
    if (!input) return false;
    if (input.type === 'checkbox') {
      if (!input.checked) input.click();
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
    if (input.type === 'radio') input.checked = true;
    fireClick(input);
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  async function clickRadioAndConfirm(radioSelector) {
    const radio = await waitFor(() => {
      const el = document.querySelector(radioSelector);
      return el && !el.disabled ? el : null;
    }, 10000);
    if (!radio) return false;
    setErpControl(radio);
    const confirmBtn = await waitFor(() => findBootboxConfirm(), 5000);
    if (confirmBtn) {
      fireClick(confirmBtn);
      await waitFor(() => (findBootboxConfirm() ? null : true), 3000);
      await delay(300);
    }
    return true;
  }

  function isApproveEnabled(el) {
    return isVisible(el) && !el.disabled && !el.classList.contains('disabled') && el.getAttribute('aria-disabled') !== 'true';
  }

  async function approveErpApplication() {
    await clickRadioAndConfirm('[name="documents_error"][value="1"]');
    await clickRadioAndConfirm('[name="name_match"][value="1"]');
    await clickRadioAndConfirm('[name="personal_id_match"][value="1"]');
    await clickRadioAndConfirm('[name="birthday_match"][value="1"]');
    await clickRadioAndConfirm('[name="doc_number_match"][value="1"]');
    await clickRadioAndConfirm('[name="selfie_match"][value="1"]');

    for (let attempt = 0; attempt < 15; attempt++) {
      const videoCheckbox = document.querySelector('input#clientVerificationVideoApproved');
      const identityCheckbox = document.querySelector('#clientConfirmedPersonalIdentity');
      if (isVisible(videoCheckbox)) {
        if (!videoCheckbox.checked) setErpControl(videoCheckbox);
      } else if (identityCheckbox && !identityCheckbox.checked) {
        setErpControl(identityCheckbox);
      }

      const approve = findClickableByText('Approve Application');
      if (isApproveEnabled(approve)) {
        fireClick(approve);
        const ok = await waitFor(() => findBootboxConfirm(), 2500);
        if (ok) fireClick(ok);
        const stillOpen = await waitFor(() => (isVisible(document.querySelector('[name="selfie_match"][value="1"]')) ? null : true), 2500);
        if (stillOpen) return true;
      }
      await delay(500);
    }
    return false;
  }

  function detectStep() {
    const path = location.pathname;

    if (isOffline()) {
      for (const key of Object.keys(OFFLINE_STEPS)) {
        if (OFFLINE_STEPS[key].match(path)) return OFFLINE_STEPS[key];
      }
      if (inputsByPlaceholder('Введите ИНН').length > 0) return OFFLINE_STEPS.step1;
      return null;
    }

    for (const key of Object.keys(STEPS)) {
      if (STEPS[key].match(path)) return STEPS[key];
    }
    return null;
  }

  const isErpPaymentAdd = () => /\/payments\/add/.test(location.pathname);

  function setValueNoBlur(el, value) {
    const setter = el.tagName === 'TEXTAREA' ? nativeTextareaSetter : nativeInputSetter;
    setter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('keyup', { bubbles: true }));
  }

  async function fillPaymentAdd() {
    const value = (await navigator.clipboard.readText()).trim();
    if (!value) throw new Error('Буфер обмена пуст');

    const payer = document.querySelector('#payerCode, input[name="payerCode"]');
    if (payer) {
      payer.focus();
      setValueNoBlur(payer, value);
      const suggestion = await waitFor(() => {
        return Array.from(document.querySelectorAll('.tt-suggestion'))
          .find((el) => isVisible(el) && (el.textContent || '').includes(value)) || null;
      }, 5000);
      if (suggestion) {
        suggestion.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        suggestion.click();
        await delay(150);
      }
    }

    const source = document.querySelector('select[name="source"]');
    if (source) {
      source.value = '7';
      source.dispatchEvent(new Event('change', { bubbles: true }));
    }

    const info = document.querySelector('textarea[name="paymentInfo"]');
    if (info) {
      info.focus();
      setReactValue(info, value);
    }
    return true;
  }

  const INCOMING_PAYMENT_CRON_IDS = [32, 25];

  async function runIncomingPaymentCrons() {
    for (const cronId of INCOMING_PAYMENT_CRON_IDS) {
      const response = await fetch(`/cron-jobs/run/${cronId}`, { credentials: 'include' });
      if (!response.ok) throw new Error(`Крон ${cronId} вернул ${response.status}`);
    }
  }

  const OUTGOING_CRON_IDS = [28, 33, 26];

  async function runOutgoingCrons() {
    for (const cronId of OUTGOING_CRON_IDS) {
      const response = await fetch(`/cron-jobs/run/${cronId}`, { credentials: 'include' });
      if (!response.ok) throw new Error(`Крон ${cronId} вернул ${response.status}`);
    }
  }

  const isErpHost = () => /^erp\./i.test(location.hostname);

  async function searchClientByInn(inn) {
    const response = await fetch(`/clients/search?searchTerm=${encodeURIComponent(inn)}%`, {
      headers: { 'x-requested-with': 'XMLHttpRequest' },
      credentials: 'include'
    });
    if (!response.ok) throw new Error(`Поиск клиента вернул ${response.status}`);
    const data = await response.json();
    const client = data && data.results && data.results[0];
    if (!client) throw new Error('Клиент по ИНН не найден');
    return client;
  }

  function todayDdMmYy() {
    const now = new Date();
    return `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${String(now.getFullYear()).slice(-2)}`;
  }

  async function createIncomingPaymentByInn(inn, amount) {
    const client = await searchClientByInn(inn);
    const payload = {
      clientId: client.clientId,
      applicationId: '',
      agreementId: '',
      accountEntryType: 1,
      isTest: 0,
      isReturn: 0,
      disabledAutoProcessing: 0,
      recipientFullName: '',
      recipientCode: '',
      payerFullName: client.payerFullName || client.clientName || '',
      payerCode: inn,
      source: 7,
      wallet: 'balance',
      amount: amount,
      currency: 'KGS',
      createdAt: todayDdMmYy(),
      paymentInfo: inn
    };
    const response = await fetch('/payments/add', {
      method: 'POST',
      body: new URLSearchParams(payload),
      credentials: 'include'
    });
    if (!response.ok) throw new Error(`Создание платежа вернуло ${response.status}`);
    await runIncomingPaymentCrons();
    return true;
  }

  function wirePaymentSaveButton() {
    const btn = document.querySelector('#save_btn');
    if (!btn || btn.dataset.cronWired) return;
    btn.dataset.cronWired = '1';
    btn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      const form = btn.closest('form') || document.querySelector('form');
      (async () => {
        try {
          if (form) {
            const body = new URLSearchParams(new FormData(form));
            const action = form.getAttribute('action') || location.pathname;
            const response = await fetch(action, { method: 'POST', body, credentials: 'include' });
            if (!response.ok) throw new Error(`Сохранение платежа вернуло ${response.status}`);
            await runIncomingPaymentCrons();
            toast('Платёж сохранён, кроны запущены');
            if (response.url) location.href = response.url;
          } else {
            await runIncomingPaymentCrons();
            toast('Кроны запущены');
          }
        } catch (err) {
          console.error('[Autofill] Ошибка сохранения/кронов:', err);
          toast('Ошибка: ' + (err && err.message ? err.message : err), true);
        }
      })();
    }, true);
  }

  function getAction() {
    const host = location.hostname;
    if (!/(^|\.)(doke|fino)\.kg$/i.test(host) && !host.includes('localhost') && !host.endsWith('.docker')) return null;
    if (isErpApplicationTodo()) {
      return { label: 'Апрув аппликации', run: approveErpApplication };
    }
    if (isErpPaymentAdd()) {
      return { label: 'Заполнить платёж', run: fillPaymentAdd };
    }
    const step = detectStep();
    if (step) {
      return { label: 'Заполнить шаг', run: () => step.fill(generateClient()) };
    }
    return null;
  }

  function runCurrentAction() {
    const action = getAction();
    if (!action) {
      toast('Действие недоступно на этой странице', true);
      return;
    }
    Promise.resolve(action.run())
      .then(() => toast('Готово'))
      .catch((err) => {
        console.error('[Autofill] Ошибка при выполнении действия:', err);
        toast('Ошибка: ' + (err && err.message ? err.message : err), true);
      });
  }

  function toast(message, isError) {
    const el = document.createElement('div');
    el.textContent = message;
    Object.assign(el.style, {
      position: 'fixed',
      bottom: '80px',
      right: '20px',
      zIndex: '2147483647',
      padding: '10px 16px',
      borderRadius: '8px',
      color: '#fff',
      fontFamily: 'sans-serif',
      fontSize: '13px',
      background: isError ? '#c0392b' : '#27ae60',
      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
      transition: 'opacity 0.3s'
    });
    document.body.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 300);
    }, 1800);
  }

  function injectButton() {
    let btn = document.getElementById('autofill-registration-btn');
    const action = getAction();
    if (!action) return;
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'autofill-registration-btn';
      Object.assign(btn.style, {
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: '2147483647',
        padding: '10px 18px',
        borderRadius: '24px',
        border: 'none',
        cursor: 'pointer',
        color: '#fff',
        fontFamily: 'sans-serif',
        fontSize: '14px',
        fontWeight: '600',
        background: '#2d6cdf',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
      });
      btn.addEventListener('click', runCurrentAction);
      document.body.appendChild(btn);
    }
    btn.textContent = action.label;
  }

  function removeButton() {
    const btn = document.getElementById('autofill-registration-btn');
    if (btn) btn.remove();
  }

  function injectPaymentPanel() {
    if (document.getElementById('erp-payment-panel')) return;
    const panel = document.createElement('div');
    panel.id = 'erp-payment-panel';
    Object.assign(panel.style, {
      position: 'fixed',
      bottom: '20px',
      left: '20px',
      zIndex: '2147483647',
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      padding: '12px',
      borderRadius: '10px',
      background: '#1f2d3d',
      boxShadow: '0 4px 12px rgba(0,0,0,0.35)',
      fontFamily: 'sans-serif',
      width: '200px'
    });

    const title = document.createElement('div');
    title.textContent = 'Создать платёж';
    Object.assign(title.style, { color: '#fff', fontSize: '13px', fontWeight: '600', marginBottom: '2px' });

    const innInput = document.createElement('input');
    innInput.type = 'text';
    innInput.placeholder = 'ИНН';
    const amountInput = document.createElement('input');
    amountInput.type = 'text';
    amountInput.placeholder = 'Сумма';
    [innInput, amountInput].forEach((input) => {
      Object.assign(input.style, {
        padding: '6px 8px',
        borderRadius: '6px',
        border: '1px solid #3a4a5d',
        fontSize: '13px',
        outline: 'none'
      });
    });

    const submit = document.createElement('button');
    submit.textContent = 'Создать платёж';
    Object.assign(submit.style, {
      padding: '8px',
      borderRadius: '6px',
      border: 'none',
      cursor: 'pointer',
      color: '#fff',
      fontSize: '13px',
      fontWeight: '600',
      background: '#2d6cdf'
    });

    submit.addEventListener('click', () => {
      const inn = innInput.value.trim();
      const amount = amountInput.value.trim();
      if (!inn || !amount) {
        toast('Укажите ИНН и сумму', true);
        return;
      }
      submit.disabled = true;
      submit.textContent = 'Создаём…';
      createIncomingPaymentByInn(inn, amount)
        .then(() => toast('Платёж создан, кроны запущены'))
        .catch((err) => {
          console.error('[Autofill] Ошибка создания платежа:', err);
          toast('Ошибка: ' + (err && err.message ? err.message : err), true);
        })
        .finally(() => {
          submit.disabled = false;
          submit.textContent = 'Создать платёж';
        });
    });

    const outgoingBtn = document.createElement('button');
    outgoingBtn.textContent = 'запуск outgoing крон';
    Object.assign(outgoingBtn.style, {
      padding: '8px',
      borderRadius: '6px',
      border: 'none',
      cursor: 'pointer',
      color: '#fff',
      fontSize: '13px',
      fontWeight: '600',
      background: '#8e44ad'
    });
    outgoingBtn.addEventListener('click', () => {
      outgoingBtn.disabled = true;
      outgoingBtn.textContent = 'Запускаем…';
      runOutgoingCrons()
        .then(() => toast('Outgoing кроны запущены'))
        .catch((err) => {
          console.error('[Autofill] Ошибка outgoing кронов:', err);
          toast('Ошибка: ' + (err && err.message ? err.message : err), true);
        })
        .finally(() => {
          outgoingBtn.disabled = false;
          outgoingBtn.textContent = 'запуск outgoing крон';
        });
    });

    panel.append(title, innInput, amountInput, submit, outgoingBtn);
    document.body.appendChild(panel);
  }

  function removePaymentPanel() {
    const panel = document.getElementById('erp-payment-panel');
    if (panel) panel.remove();
  }

  function syncButton() {
    if (getAction()) injectButton();
    else removeButton();
    if (isErpPaymentAdd()) wirePaymentSaveButton();
    if (isErpHost()) injectPaymentPanel();
    else removePaymentPanel();
  }

  setInterval(syncButton, 1000);
  syncButton();
})();
