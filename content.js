/* eslint-disable */
(function () {
  'use strict';

  try {
    if (!/^erp\./i.test(location.hostname)) document.cookie = 'qa-mode=true;path=/';
  } catch (e) {}

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
    if (!token) throw new Error('auth.token not found in cookie');
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
      if (!response.ok) throw new Error(`Upload "${name}" failed: ${response.status}`);
    }
    return true;
  }

  async function uploadVideo() {
    const token = getAuthToken();
    if (!token) throw new Error('auth.token not found in cookie');
    const base = getApiBase();
    const chooseRes = await fetch(base + '/web/private/client/verification/select?option=video', {
      headers: { Authorization: 'Bearer ' + token },
      credentials: 'include'
    });
    if (!chooseRes.ok) throw new Error('Select video verification → ' + chooseRes.status);
    const videoBlob = await (await fetch(chrome.runtime.getURL('test-video.webm'))).blob();
    const formData = new FormData();
    formData.append('8', videoBlob, 'blob');
    const response = await fetch(base + '/web/private/client/document/video-file-upload', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token },
      body: formData,
      credentials: 'include'
    });
    if (!response.ok) throw new Error(`Video upload failed: ${response.status}`);
    return true;
  }

  const STUB_RECAPTCHA_TOKEN = 'qa-extension-stub-token';
  const RECOVERY_NEW_PASSWORD = 'Test12345';
  const CHANGE_PASSWORD_FLAG = 'qa-recover-change-pass';
  const getErpBase = () => `${location.protocol}//erp.${location.hostname}`;

  function fetchRecoveryCode(erpBase, email) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ action: 'getRecoveryCode', erpBase, email }, (res) => {
        if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
        if (!res || !res.ok) return reject(new Error(res && res.error ? res.error : 'No response from background'));
        resolve(res.code);
      });
    });
  }

  async function runPasswordRecovery(email) {
    const res = await fetch(getApiBase() + '/web/public/client/recover/password', {
      method: 'POST',
      headers: { 'content-type': 'application/json;charset=UTF-8' },
      body: JSON.stringify({ subject: email, token: STUB_RECAPTCHA_TOKEN }),
      credentials: 'include'
    });
    if (res.status === 429) throw new Error('Too many requests, please wait');
    const text = await res.text();
    let body = {};
    try {
      body = text ? JSON.parse(text) : {};
    } catch (e) {}
    if (!res.ok || (body.data && body.data.error)) {
      throw new Error('Recover request failed: ' + (body && body.message ? body.message : res.status));
    }
    const code = await fetchRecoveryCode(getErpBase(), email);
    const filledLogin = fillInput('input_login', email);
    const filledPassword = fillInput('input_password', code);
    if (filledLogin && filledPassword) {
      try {
        sessionStorage.setItem(CHANGE_PASSWORD_FLAG, '1');
      } catch (e) {}
      await delay(400);
      clickTestId('btn_submit');
    }
    return { code, submitted: filledLogin && filledPassword };
  }

  async function autoFillChangePassword() {
    if (!/\/profile\/change-password/.test(location.pathname)) return;
    let pending;
    try {
      pending = sessionStorage.getItem(CHANGE_PASSWORD_FLAG);
    } catch (e) {}
    if (pending !== '1') return;
    const newField = byTestId('input_new_password');
    const repeatField = byTestId('input_repeat_password');
    if (!newField || !repeatField) return;
    try {
      sessionStorage.removeItem(CHANGE_PASSWORD_FLAG);
    } catch (e) {}
    fillInput('input_new_password', RECOVERY_NEW_PASSWORD);
    fillInput('input_repeat_password', RECOVERY_NEW_PASSWORD);
    await delay(500);
    clickTestId('btn_submit');
    toast('New password set: ' + RECOVERY_NEW_PASSWORD);
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
    videoCapture: {
      match: (path) => /video-capture/.test(path),
      loadingLabel: 'Uploading video…',
      fill: async () => {
        await uploadVideo();
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
    },
    creditOptionInsurance: {
      match: (path) => /\/ct\/ins$/.test(path),
      fill: async (c) => {
        clickTestId('btn_get_sms');
        await waitFor(() => {
          const el = byTestId('input_sms_code');
          return el && isVisible(el) ? el : null;
        }, 5000);
        fillInput('input_sms_code', c.smsCode);
        checkCheckbox('checkbox_accept_attorney_agreement');
        checkCheckbox('checkbox_accept_insurance_agreement');
        checkCheckbox('checkbox_accept_insurance_policy');
        checkCheckbox('checkbox_accept_insurance_processing');
        checkCheckbox('checkbox_accept_solvency_consent');
        checkCheckbox('checkbox_accept_loan_default_acknowledgement');
      }
    },
    creditOptionGuarantor: {
      match: (path) => /\/ct\/gr$/.test(path),
      fill: async (c) => {
        clickTestId('btn_get_sms');
        await waitFor(() => {
          const el = byTestId('input_sms_code');
          return el && isVisible(el) ? el : null;
        }, 5000);
        fillInput('input_sms_code', c.smsCode);
        checkCheckbox('checkbox_accept_attorney_agreement');
        checkCheckbox('checkbox_accept_solvency_consent');
        checkCheckbox('checkbox_accept_loan_default_acknowledgement');
      }
    },
    creditOptionWithoutInsurance: {
      match: (path) => /\/ct\/wo-ins$/.test(path),
      fill: async (c) => {
        clickTestId('btn_get_sms');
        await waitFor(() => {
          const el = byTestId('input_sms_code');
          return el && isVisible(el) ? el : null;
        }, 5000);
        fillInput('input_sms_code', c.smsCode);
        checkCheckbox('checkbox_accept_solvency_consent');
        checkCheckbox('checkbox_accept_attorney_agreement');
        checkCheckbox('checkbox_accept_loan_default_acknowledgement');
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
        return Array.from(document.querySelectorAll('.tt-suggestion')).find((el) => isVisible(el) && (el.textContent || '').includes(value)) || null;
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
      if (!response.ok) throw new Error(`Cron ${cronId} returned ${response.status}`);
    }
  }

  const OUTGOING_CRON_IDS = [28, 33, 26];

  async function runOutgoingCrons() {
    for (const cronId of OUTGOING_CRON_IDS) {
      const response = await fetch(`/cron-jobs/run/${cronId}`, { credentials: 'include' });
      if (!response.ok) throw new Error(`Cron ${cronId} returned ${response.status}`);
    }
  }

  function getErpApiToken() {
    return new Promise((resolve) => {
      chrome.storage.local.get('erpApiToken', (res) => resolve((res && res.erpApiToken) || ''));
    });
  }
  const DUE_DAYS_CRON_ID = 29;

  function isoToDdMmYyyyPlusDays(isoDate, days) {
    const datePart = String(isoDate).slice(0, 10);
    const [y, m, d] = datePart.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() + Number(days));
    const dd = String(dt.getUTCDate()).padStart(2, '0');
    const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
    return `${dd}.${mm}.${dt.getUTCFullYear()}`;
  }

  async function getLoanEndDate(loanId) {
    const token = await getErpApiToken();
    if (!token) throw new Error('ERP API token not set (open the extension popup and save it)');
    const res = await fetch(`/api/loans/${encodeURIComponent(loanId)}?token=${encodeURIComponent(token)}`, { credentials: 'include' });
    if (!res.ok) throw new Error(`Loan ${loanId} request → ${res.status}`);
    const data = await res.json();
    const endDate = data && data.data && data.data.endDate;
    if (!endDate) throw new Error('endDate not found for loan ' + loanId);
    return endDate;
  }

  async function setLoanOverdue(loanId, days) {
    const endDate = await getLoanEndDate(loanId);
    const currentDate = isoToDdMmYyyyPlusDays(endDate, days);
    const body = new URLSearchParams({
      title: 'Invoices: notify due days',
      action: `invoices notify-due-days --current-date=${currentDate} --loan=${loanId} --force=1`,
      cronExpr: '*/10 * * * *',
      isEnabled: '1'
    });
    const editRes = await fetch(`/cron-jobs/edit/${DUE_DAYS_CRON_ID}`, { method: 'POST', body, credentials: 'include' });
    if (!editRes.ok) throw new Error(`Cron edit → ${editRes.status}`);
    const runRes = await fetch(`/cron-jobs/run/${DUE_DAYS_CRON_ID}`, { credentials: 'include' });
    if (!runRes.ok) throw new Error(`Cron run → ${runRes.status}`);
    return currentDate;
  }

  const isErpHost = () => /^erp\./i.test(location.hostname);

  async function searchClientByInn(inn) {
    const response = await fetch(`/clients/search?searchTerm=${encodeURIComponent(inn)}%`, {
      headers: { 'x-requested-with': 'XMLHttpRequest' },
      credentials: 'include'
    });
    if (!response.ok) throw new Error(`Client search returned ${response.status}`);
    const data = await response.json();
    const client = data && data.results && data.results[0];
    if (!client) throw new Error('Client not found by PIN');
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
    if (!response.ok) throw new Error(`Payment creation returned ${response.status}`);
    await runIncomingPaymentCrons();
    return true;
  }

  function wirePaymentSaveButton() {
    const btn = document.querySelector('#save_btn');
    if (!btn || btn.dataset.cronWired) return;
    btn.dataset.cronWired = '1';
    btn.addEventListener(
      'click',
      (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        const form = btn.closest('form') || document.querySelector('form');
        (async () => {
          try {
            if (form) {
              const body = new URLSearchParams(new FormData(form));
              const action = form.getAttribute('action') || location.pathname;
              const response = await fetch(action, { method: 'POST', body, credentials: 'include' });
              if (!response.ok) throw new Error(`Payment save returned ${response.status}`);
              await runIncomingPaymentCrons();
              toast('Payment saved, crons started');
              if (response.url) location.href = response.url;
            } else {
              await runIncomingPaymentCrons();
              toast('Crons started');
            }
          } catch (err) {
            console.error('[Autofill] Save/cron error:', err);
            toast('Error: ' + (err && err.message ? err.message : err), true);
          }
        })();
      },
      true
    );
  }

  const BLOCKED_HOSTS = ['doke.kg', 'fino.kg', 'erp.doke.kg', 'erp.fino.kg'];

  function getAction() {
    const host = location.hostname;
    if (BLOCKED_HOSTS.includes(host)) return null;
    const isLocal = host.includes('localhost') || host.endsWith('.docker');
    const isKgProduct = /(^|\.)(doke|fino)\.kg$/i.test(host);
    if (!isLocal && !isKgProduct) return null;
    if (isKgProduct && !/(^|\.)staging\d*\.(doke|fino)\.kg$/i.test(host)) return null;
    if (isErpApplicationTodo()) {
      return { label: 'Approve application', run: approveErpApplication };
    }
    if (isErpPaymentAdd()) {
      return { label: 'Fill payment', run: fillPaymentAdd };
    }
    const step = detectStep();
    if (step) {
      return {
        label: 'Fill step',
        loadingLabel: step.loadingLabel || 'Filling…',
        run: () => step.fill(generateClient())
      };
    }
    return null;
  }

  function runCurrentAction() {
    const action = getAction();
    if (!action) {
      toast('Action not available on this page', true);
      return;
    }
    const btn = document.getElementById('autofill-registration-btn');
    const prevLabel = btn ? btn.textContent : '';
    if (btn) {
      btn.disabled = true;
      btn.style.opacity = '0.6';
      btn.style.cursor = 'default';
      btn.textContent = action.loadingLabel || 'Working…';
    }
    const loader = toast(action.loadingLabel || 'Working…', false, true);
    Promise.resolve(action.run())
      .then(() => {
        loader.remove();
        toast('Done');
      })
      .catch((err) => {
        console.error('[Autofill] Action error:', err);
        loader.remove();
        toast('Error: ' + (err && err.message ? err.message : err), true);
      })
      .finally(() => {
        if (btn) {
          btn.disabled = false;
          btn.style.opacity = '1';
          btn.style.cursor = 'pointer';
          btn.textContent = prevLabel;
        }
      });
  }

  function toast(message, isError, persist) {
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
      background: isError ? '#c0392b' : persist ? '#2d6cdf' : '#27ae60',
      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
      transition: 'opacity 0.3s'
    });
    document.body.appendChild(el);
    if (persist) return el;
    setTimeout(() => {
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 300);
    }, 1800);
    return el;
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
      bottom: '190px',
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
    title.textContent = 'Create incoming payment';
    Object.assign(title.style, { color: '#fff', fontSize: '13px', fontWeight: '600', marginBottom: '2px' });

    const innInput = document.createElement('input');
    innInput.type = 'text';
    innInput.placeholder = 'PIN';
    const amountInput = document.createElement('input');
    amountInput.type = 'text';
    amountInput.placeholder = 'Amount';
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
    submit.textContent = 'Create payment';
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
        toast('Enter PIN and amount', true);
        return;
      }
      submit.disabled = true;
      submit.textContent = 'Creating…';
      createIncomingPaymentByInn(inn, amount)
        .then(() => toast('Payment created, crons started'))
        .catch((err) => {
          console.error('[Autofill] Payment creation error:', err);
          toast('Error: ' + (err && err.message ? err.message : err), true);
        })
        .finally(() => {
          submit.disabled = false;
          submit.textContent = 'Create incoming payment';
        });
    });

    const outgoingBtn = document.createElement('button');
    outgoingBtn.textContent = 'Run outgoing crons';
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
      outgoingBtn.textContent = 'Running…';
      runOutgoingCrons()
        .then(() => toast('Outgoing crons started'))
        .catch((err) => {
          console.error('[Autofill] Outgoing cron error:', err);
          toast('Error: ' + (err && err.message ? err.message : err), true);
        })
        .finally(() => {
          outgoingBtn.disabled = false;
          outgoingBtn.textContent = 'Run outgoing crons';
        });
    });

    panel.append(title, innInput, amountInput, submit, outgoingBtn);
    document.body.appendChild(panel);
  }

  function removePaymentPanel() {
    const panel = document.getElementById('erp-payment-panel');
    if (panel) panel.remove();
  }

  function injectOverduePanel() {
    if (document.getElementById('erp-overdue-panel')) return;
    const panel = document.createElement('div');
    panel.id = 'erp-overdue-panel';
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
    title.textContent = 'Set loan overdue';
    Object.assign(title.style, { color: '#fff', fontSize: '13px', fontWeight: '600', marginBottom: '2px' });

    const loanInput = document.createElement('input');
    loanInput.type = 'text';
    loanInput.placeholder = 'Loan ID';
    const daysInput = document.createElement('input');
    daysInput.type = 'text';
    daysInput.placeholder = 'Overdue days';
    [loanInput, daysInput].forEach((input) => {
      Object.assign(input.style, {
        padding: '6px 8px',
        borderRadius: '6px',
        border: '1px solid #3a4a5d',
        fontSize: '13px',
        outline: 'none'
      });
    });

    const submit = document.createElement('button');
    submit.textContent = 'Run overdue cron';
    Object.assign(submit.style, {
      padding: '8px',
      borderRadius: '6px',
      border: 'none',
      cursor: 'pointer',
      color: '#fff',
      fontSize: '13px',
      fontWeight: '600',
      background: '#d35400'
    });

    submit.addEventListener('click', () => {
      const loanId = loanInput.value.trim();
      const days = daysInput.value.trim();
      if (!loanId || !days) {
        toast('Enter Loan ID and days', true);
        return;
      }
      submit.disabled = true;
      submit.textContent = 'Running…';
      setLoanOverdue(loanId, days)
        .then((currentDate) => toast('Overdue cron started (date ' + currentDate + ')'))
        .catch((err) => {
          console.error('[Autofill] Overdue cron error:', err);
          toast('Error: ' + (err && err.message ? err.message : err), true);
        })
        .finally(() => {
          submit.disabled = false;
          submit.textContent = 'Run overdue cron';
        });
    });

    panel.append(title, loanInput, daysInput, submit);
    document.body.appendChild(panel);
  }

  function removeOverduePanel() {
    const panel = document.getElementById('erp-overdue-panel');
    if (panel) panel.remove();
  }

  function isRecoveryHost() {
    const host = location.hostname;
    if (isErpHost()) return false;
    const isLocal = host.includes('localhost') || host.endsWith('.docker');
    const isKgProduct = /(^|\.)(doke|fino)\.kg$/i.test(host);
    if (!isLocal && !isKgProduct) return false;
    if (isKgProduct && !/(^|\.)staging\d*\.(doke|fino)\.kg$/i.test(host)) return false;
    return /\/login/.test(location.pathname);
  }

  function injectRecoveryPanel() {
    if (document.getElementById('password-recovery-panel')) return;
    const panel = document.createElement('div');
    panel.id = 'password-recovery-panel';
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
      width: '220px'
    });

    const title = document.createElement('div');
    Object.assign(title.style, { color: '#fff', fontSize: '13px', fontWeight: '600', marginBottom: '2px' });

    const emailInput = document.createElement('input');
    emailInput.type = 'email';
    emailInput.placeholder = 'Email';
    Object.assign(emailInput.style, {
      padding: '6px 8px',
      borderRadius: '6px',
      border: '1px solid #3a4a5d',
      fontSize: '13px',
      outline: 'none'
    });

    const submit = document.createElement('button');
    submit.textContent = 'Recover password';
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
      const email = emailInput.value.trim();
      if (!email) {
        toast('Enter email', true);
        return;
      }
      submit.disabled = true;
      submit.style.opacity = '0.6';
      submit.textContent = 'Recovering…';
      const loader = toast('Recovering password…', false, true);
      runPasswordRecovery(email)
        .then(({ code, submitted }) => {
          loader.remove();
          toast(submitted ? 'Code ' + code + ' entered, submitting…' : 'Code: ' + code + ' (login form not found)');
        })
        .catch((err) => {
          loader.remove();
          console.error('[Autofill] Password recovery error:', err);
          toast('Error: ' + (err && err.message ? err.message : err), true);
        })
        .finally(() => {
          submit.disabled = false;
          submit.style.opacity = '1';
          submit.textContent = 'Recover password';
        });
    });

    panel.append(title, emailInput, submit);
    document.body.appendChild(panel);
  }

  function removeRecoveryPanel() {
    const panel = document.getElementById('password-recovery-panel');
    if (panel) panel.remove();
  }

  function syncButton() {
    if (getAction()) injectButton();
    else removeButton();
    if (isErpPaymentAdd()) wirePaymentSaveButton();
    if (isErpHost()) injectPaymentPanel();
    else removePaymentPanel();
    if (isErpHost()) injectOverduePanel();
    else removeOverduePanel();
    if (isRecoveryHost()) injectRecoveryPanel();
    else removeRecoveryPanel();
    autoFillChangePassword();
  }

  setInterval(syncButton, 1000);
  syncButton();
})();
