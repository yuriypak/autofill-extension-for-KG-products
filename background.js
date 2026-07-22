/* eslint-disable */
importScripts('generateData.js', 'image-data.js', 'iobb-data.js');

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const DOMAINS = { 'doke-kg': 'doke.kg', 'fino-kg': 'fino.kg' };
const STEP_URL = {
  step2: '/registration/step2',
  step3: '/registration/step3',
  step4: '/registration/step4',
  socialFund: '/social-fund',
  step6: '/registration/step6',
  consideration: '/ct/dd',
  signing: '/select-verification',
  createApplication: '/'
};

function bases(product, env) {
  const domain = DOMAINS[product];
  const dev = env === 'development';
  return {
    frontend: dev ? 'http://localhost:3000' : `https://${env}.${domain}`,
    api: dev ? `http://kong.${domain}.docker` : `https://api.${env}.${domain}`,
    erp: dev ? `http://erp.${domain}.docker` : `https://erp.${env}.${domain}`
  };
}

const TUNDUK_BY_STEP = { socialFund: true, step6: false, consideration: false, signing: false, createApplication: false };

async function setTundukSocialFund(erpBase, enabled) {
  const settings = [
    ['/tunduk_social_fund_group/tunduk_social_fund_enabled', String(Number(enabled))],
    ['/tunduk_social_fund_group/tunduk_social_fund_http_client_environment', 'STUB']
  ];
  for (const [path, value] of settings) {
    const res = await fetch(erpBase + '/settings/edit' + path, {
      method: 'POST',
      body: new URLSearchParams({ value }),
      credentials: 'include'
    });
    if (!res.ok) throw new Error('ERP setting ' + path + ' → ' + res.status + ' (log in to ERP)');
  }
}

const LIMIT_MODEL_ID = 16;
const LIMIT_DEFAULT = 20000;
const LIMIT_CONFIGURATOR_VERSION = 356;

async function updateLimitModel(erpBase, amount) {
  const body = new URLSearchParams();
  body.append('enabled', '1');
  body.append('title', 'KGScoreBasedLimitModel');
  body.append('mode', 'default');
  body.append('target[]', 'application');
  body.append('entryPoint[]', 'initial');
  body.append('defaultLimit', String(LIMIT_DEFAULT));
  body.append('simulated', '1');
  body.append('simulationResponse', JSON.stringify({ result: { max_loan_amount_limit: amount, without_insurance_segment: [true] } }));
  body.append('enabledConfiguratorVersion', String(LIMIT_CONFIGURATOR_VERSION));
  body.append('comment', 'Updated by autotests ');
  body.append('description', 'KG limit setup strategy');
  const res = await fetch(erpBase + '/internal-scoring/limits/edit/' + LIMIT_MODEL_ID, {
    method: 'POST',
    body,
    credentials: 'include'
  });
  if (!res.ok) throw new Error('Update limit → ' + res.status + ' (log in to ERP)');
}

function makeApi(apiBase) {
  let token = null;
  async function req(method, path, opts = {}) {
    const headers = {};
    if (opts.auth && token) headers['Authorization'] = 'Bearer ' + token;
    let body;
    if (opts.json !== undefined) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(opts.json);
    }
    const res = await fetch(apiBase + path, { method, headers, body });
    if (!res.ok) {
      let t = '';
      try {
        t = await res.text();
      } catch (e) {}
      throw new Error(`${method} ${path} → ${res.status} ${t.slice(0, 140)}`);
    }
    const ct = res.headers.get('content-type') || '';
    const text = await res.text();
    if (ct.includes('json') && text) return JSON.parse(text);
    return text;
  }
  return {
    req,
    setToken: (t) => {
      token = t;
    }
  };
}

async function imageBlob() {
  return await (await fetch(TEST_IMAGE_DATA_URL)).blob();
}

async function uploadPhotos(apiBase, token) {
  const blob = await imageBlob();
  for (const type of ['4', '5', '6']) {
    const fd = new FormData();
    fd.append('document', blob, 'test-image.jpg');
    fd.append('type', type);
    const res = await fetch(apiBase + '/web/private/client/document/upload', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token },
      body: fd
    });
    if (!res.ok) throw new Error('Photo upload ' + type + ' → ' + res.status);
  }
}

const ERP_API_TOKEN = 'letsgotothegrea1';

async function getClientVerificationLimit(erpBase) {
  const res = await fetch(erpBase + '/api/settings/client_verification?token=' + ERP_API_TOKEN, { credentials: 'include' });
  if (!res.ok) throw new Error('Get verification limit → ' + res.status);
  const data = await res.json();
  return parseInt(data.data.client_verification_limit, 10);
}

async function uploadAndSendVideo(apiBase, token) {
  const chooseRes = await fetch(apiBase + '/web/private/client/verification/select?option=video', {
    headers: { Authorization: 'Bearer ' + token }
  });
  if (!chooseRes.ok) throw new Error('Select video verification → ' + chooseRes.status);
  const videoBlob = await (await fetch(chrome.runtime.getURL('test-video.webm'))).blob();
  const fd = new FormData();
  fd.append('8', videoBlob, 'blob');
  const res = await fetch(apiBase + '/web/private/client/document/video-file-upload', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token },
    body: fd
  });
  if (!res.ok) throw new Error('Video upload → ' + res.status);
}

async function runFlow(p, setStatus) {
  const { frontend, api: apiBase, erp } = bases(p.product, p.environment);
  await chrome.cookies.set({ url: frontend, name: 'qa-mode', value: 'true' });
  const c = generateClient();
  const api = makeApi(apiBase);
  const step = p.step;
  const need = (...s) => s.includes(step);
  const afterS3 = ['socialFund', 'step6', 'consideration', 'signing', 'createApplication'];
  const afterS6 = ['consideration', 'signing', 'createApplication'];

  if (step in TUNDUK_BY_STEP) {
    setStatus('Social fund setting (ERP)…');
    await setTundukSocialFund(erp, TUNDUK_BY_STEP[step]);
  }

  setStatus('Requesting SMS…');
  await api.req('POST', '/web/public/client/phone/sms-code', { json: { mobilePhone: { number: c.phone } } });

  setStatus('Creating client…');
  const created = await api.req('POST', '/web/public/client', {
    json: {
      language: FIXED.language,
      firstName: c.firstName,
      lastName: c.lastName,
      middleName: c.middleName,
      email: c.email,
      identificationNumber: c.pin,
      password: c.password,
      info: { mobilePhone: { number: c.phone }, phoneVerificationCode: c.smsCode },
      consents: { acceptAttorney: true }
    }
  });
  const token = created.Authorization;
  api.setToken(token);
  await chrome.cookies.set({ url: frontend, name: 'auth.token', value: token });

  if (!need('step2')) {
    setStatus('Step 2…');
    await api.req('PUT', '/web/private/client/complete-step-two', {
      auth: true,
      json: {
        documentNumber: c.passportNumber,
        documentRegistrationDate: c.passportIssueDate,
        documentIssuingAuthority: c.passportAuthority,
        info: {
          primaryAddress: {
            region: FIXED.region,
            street: FIXED.street,
            house: FIXED.house,
            apartment: FIXED.apartment,
            city: FIXED.city,
            district: FIXED.district
          }
        }
      }
    });
  }

  if (!need('step2', 'step3')) {
    setStatus('Step 3…');
    await api.req('PUT', '/web/private/client/complete-step-three', {
      auth: true,
      json: {
        info: {
          employment: { employerName: FIXED.employerName, employmentStatus: FIXED.employmentStatus },
          finance: {
            income: { amount: FIXED.income, currency: FIXED.currency },
            additionalIncome: { amount: FIXED.additionalIncome, currency: FIXED.currency },
            dependents: Number(FIXED.dependents)
          }
        }
      }
    });
  }

  if (need(...afterS3)) {
    setStatus('Uploading photos…');
    await uploadPhotos(apiBase, token);
  }

  if (need(...afterS6)) {
    const consents = {
      acceptAllConsents: true,
      acceptAttorney: true,
      acceptCreditCheck: true,
      acceptCreditShare: true,
      acceptSolvencyLimit: true,
      acceptLoanDefault: true
    };
    const wallet = { type: FIXED.walletType, number: '0' + c.walletNumber };

    setStatus('Step 6…');
    await api.req('PUT', '/web/private/client/complete-step-four', {
      auth: true,
      json: { consents, info: { wallet }, paymentMethod: 'wallet' }
    });

    setStatus('Updating limit (ERP)…');
    await updateLimitModel(erp, p.limitManual ? Number(p.limitManual) : p.amount);

    setStatus('Creating application…');
    await api.req('POST', '/web/private/client/application', {
      auth: true,
      json: {
        loanAmount: { amount: p.amount, currency: FIXED.currency },
        term: { value: p.term, unit: 'day' },
        iovation: { ioBB: typeof IOVATION_IOBB !== 'undefined' ? IOVATION_IOBB : '' },
        consents,
        code: c.smsCode,
        info: { wallet },
        paymentMethod: 'wallet'
      }
    });
  }

  if (need('signing', 'createApplication')) {
    setStatus('Waiting for DD status…');
    await waitForApplicationStatus(api, APPLICATION_STATUS_DD, setStatus);
    setStatus('Credit option…');
    await acceptCreditOption(api, p.creditOption);
  }

  if (need('createApplication')) {
    const clientVerificationLimit = await getClientVerificationLimit(erp);
    if (p.amount < clientVerificationLimit) {
      setStatus('Uploading video…');
      await uploadAndSendVideo(apiBase, token);
    } else {
      setStatus(`Video not required (amount ${p.amount} ≥ limit ${clientVerificationLimit})`);
    }
  }

  return { frontend, client: c };
}

const APPLICATION_STATUS_DD = 25;

async function waitForApplicationStatus(api, statusId, setStatus, attempts = 30, interval = 2000) {
  for (let attempt = 0; attempt < attempts; attempt++) {
    let current;
    try {
      const res = await api.req('GET', '/web/private/client/application/actual', { auth: true });
      current = res && res.data ? res.data.status : undefined;
    } catch (err) {
      current = undefined;
    }
    if (current === statusId) return;
    setStatus(`Waiting for status ${statusId}… current: ${current} (attempt ${attempt + 1})`);
    await delay(interval);
  }
  throw new Error(`Application did not reach status ${statusId} in time`);
}

async function acceptCreditOption(api, creditOption) {
  const doAccept = () => {
    if (creditOption === 'withInsurance') {
      return api.req('POST', '/web/private/client/active-application-insurance/accept', {
        auth: true,
        json: {
          acceptInsurance: true,
          acceptInsurancePolicy: true,
          acceptSolvencyLimit: true,
          acceptLoanDefault: true,
          insuranceProvider: FIXED.insuranceProvider
        }
      });
    }
    if (creditOption === 'withoutInsurance') {
      return api.req('POST', '/web/private/client/active-application-without-insurance/accept', {
        auth: true,
        json: { acceptAttorney: true, acceptSolvencyLimit: true, acceptLoanDefault: true }
      });
    }
    return api.req('POST', '/web/private/client/active-application-with-guarantor/accept', {
      auth: true,
      json: { acceptAttorney: true, acceptSolvencyLimit: true, acceptLoanDefault: true }
    });
  };

  await doAccept();
}

function pushStatus(text) {
  chrome.storage.local.set({ lastStatus: text });
  chrome.runtime.sendMessage({ type: 'status', text }).catch(() => {});
}

async function handleRegister(params) {
  chrome.storage.local.set({ running: true, creds: null, lastStatus: 'Started…' });
  try {
    const { frontend, client } = await runFlow(params, pushStatus);
    chrome.storage.local.set({ running: false, creds: client });
    chrome.runtime.sendMessage({ type: 'done', client, frontend, step: params.step }).catch(() => {});
    chrome.tabs.create({ url: frontend + STEP_URL[params.step], active: false });
    pushStatus('Done. Opened in a new tab.');
  } catch (err) {
    const message = err && err.message ? err.message : String(err);
    chrome.storage.local.set({ running: false });
    pushStatus('Error: ' + message);
    chrome.runtime.sendMessage({ type: 'error', message }).catch(() => {});
  }
}

async function handleApplyLimit(params) {
  try {
    const { erp } = bases(params.product, params.environment);
    pushStatus('Updating limit (ERP)…');
    await updateLimitModel(erp, params.limitManual ? Number(params.limitManual) : params.amount);
    pushStatus('Limit applied: ' + (params.limitManual || params.amount));
  } catch (err) {
    const message = err && err.message ? err.message : String(err);
    pushStatus('Error: ' + message);
  }
}

chrome.runtime.onMessage.addListener((msg) => {
  if (!msg) return;
  if (msg.action === 'register') handleRegister(msg.params);
  else if (msg.action === 'applyLimit') handleApplyLimit(msg.params);
});
