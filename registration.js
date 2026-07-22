/* eslint-disable */
'use strict';

const setStatus = (t) => {
  document.getElementById('status').textContent = t;
};

function showCreds(client) {
  if (!client) return;
  document.getElementById('cred-pin').textContent = client.pin;
  document.getElementById('cred-email').textContent = client.email;
  document.getElementById('cred-password').textContent = client.password;
  document.getElementById('cred-phone').textContent = client.phone;
  document.getElementById('creds').style.display = 'block';
}

chrome.storage.local.get(['lastStatus', 'creds'], (st) => {
  if (st.lastStatus) setStatus(st.lastStatus);
  if (st.creds) showCreds(st.creds);
});

chrome.runtime.onMessage.addListener((msg) => {
  if (!msg) return;
  if (msg.type === 'status') setStatus(msg.text);
  else if (msg.type === 'done') {
    showCreds(msg.client);
    setStatus('Done. Opened in a new tab.');
  } else if (msg.type === 'error') setStatus('Error: ' + msg.message);
});

document.getElementById('run').addEventListener('click', () => {
  const params = {
    product: document.getElementById('product').value,
    environment: document.getElementById('environment').value,
    step: document.getElementById('step').value,
    creditOption: document.getElementById('creditOption').value,
    amount: Number(document.getElementById('amount').value),
    term: Number(document.getElementById('term').value),
    limitManual: document.getElementById('limitManual').value.trim()
  };
  if (!params.environment) {
    setStatus('Select environment');
    return;
  }
  document.getElementById('creds').style.display = 'none';
  setStatus('Started… (runs in background)');
  chrome.runtime.sendMessage({ action: 'register', params });
});

document.getElementById('applyLimit').addEventListener('click', () => {
  const params = {
    product: document.getElementById('product').value,
    environment: document.getElementById('environment').value,
    amount: Number(document.getElementById('amount').value),
    limitManual: document.getElementById('limitManual').value.trim()
  };
  if (!params.environment) {
    setStatus('Select environment');
    return;
  }
  setStatus('Updating limit (ERP)…');
  chrome.runtime.sendMessage({ action: 'applyLimit', params });
});

const amountEl = document.getElementById('amount');
const termEl = document.getElementById('term');
amountEl.addEventListener('input', () => {
  document.getElementById('amount-val').textContent = amountEl.value;
});
termEl.addEventListener('input', () => {
  document.getElementById('term-val').textContent = termEl.value;
});

const stepEl = document.getElementById('step');
function syncCreditOptionVisibility() {
  const show = stepEl.value === 'signing' || stepEl.value === 'createApplication';
  document.getElementById('creditOptionRow').style.display = show ? 'block' : 'none';
  const showAmount = stepEl.value === 'consideration' || stepEl.value === 'signing' || stepEl.value === 'createApplication';
  document.getElementById('amountTermRow').style.display = showAmount ? 'block' : 'none';
}
stepEl.addEventListener('change', syncCreditOptionVisibility);
syncCreditOptionVisibility();
