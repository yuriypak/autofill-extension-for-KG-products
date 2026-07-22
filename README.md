# Registration Autofill (KG) — Chrome extension

Расширение Chrome (Manifest V3) для ускорения ручного тестирования на doke.kg / fino.kg:

- **Popup «Client registration»** — регистрирует клиента до выбранного шага **через API** (клик по иконке расширения).
- **Content script** — автозаполнение шагов на странице, загрузка фото, апрув аппликаций, работа с платежами в ERP.

## Установка (режим разработчика)

1. Открой `chrome://extensions/`.
2. Включи **Developer mode** (правый верхний угол).
3. Нажми **Load unpacked** и выбери папку `tools/extension/`.

---

## Popup: регистрация клиента до шага (клик по иконке)

Форма (файлы `registration.html` / `registration.js`):

- **Product** — `doke-kg` / `fino-kg`.
- **Environment** — `staging`…`staging6` / `development (localhost)`.
- **Register up to step** — `Step 2`, `Step 3`, `Step 4 (Biometry)`, `Social fund`, `Step 6`,
  `Consideration type`, `Signing agreement`, `Create application`.
- **Credit option** (только для `Signing agreement` / `Create application`) — With / Without insurance / With guarantor.
- **Loan amount** и **Term** (слайдеры; показываются только для `Consideration type` / `Signing agreement` / `Create application`) — сумма 2000–70000 (шаг 500), срок 15–30 дней.
- **Update limit model (optional)** — ручной лимит; если не задан, используется сумма займа при обновлении лимит-модели.
- Кнопка **Register** — запускает цепочку.
- Кнопка **Apply limit only** — только обновляет лимит-модель в ERP (без регистрации).

После успеха показываются **PIN / Email / Password / Phone** и открывается страница нужного шага в новой фоновой вкладке

> Запросы к ERP (`erp.<env>`) идут с `credentials: 'include'` — нужно быть **залогиненным в ERP** в браузере.

---

## Content script (на странице)

### Автозаполнение регистрации

На поддерживаемой странице внизу справа появляется кнопка **«Fill step»**. По клику текущий шаг заполняется случайными валидными данными (ФИО, ПИН, телефон, паспорт, адрес, работа). SMS-код — `0000`, навигацию («Далее») жмёшь вручную.

### Апрув аппликации (ERP)

На `…/applications/todo/{id}/client-finish-manual-verification` кнопка становится **«Approve application»** и проходит весь флоу ручной верификации (подтверждение документов/совпадений, чекбоксы видео/идентичности, Approve Application + подтверждение в модалке).

### Заполнение платежа из буфера (ERP)

На `…/payments/add` кнопка **«Fill payment»**: читает буфер обмена, вставляет в `#payerCode` (выбирает подсказку typeahead), выставляет источник **E-wallet**, вставляет то же значение в `paymentInfo`. Клик по родной **Save** перехватывается: форма сохраняется через `fetch`, затем запускаются incoming-кроны.

### Панель платежей (ERP)

На ERP-хостах (`erp.*`) слева внизу — панель:

- поля **PIN** и **Amount** + кнопка **«Create payment»** — ищет клиента (`GET /clients/search`), создаёт входящий платёж (`POST /payments/add`, `source: E-wallet`, `wallet: balance`, `currency: KGS`) и запускает кроны `paymentsAutomatchIncoming`, `paymentIncoming`;
- кнопка **«Run outgoing crons»** — `exportHack`, `paymentsAutomatchOutgoing`, `paymentOutgoing`.

---

## Файлы

- `manifest.json` — MV3: `action` (popup `registration.html`), `content_scripts`, `permissions`, `host_permissions`, `web_accessible_resources`, иконки.
- `registration.html` / `registration.js` — popup регистрации (API-цепочка).
- `content.js` — логика на странице (автозаполнение, фото, апрув, платежи, панель).
- `generateData.js` — общие константы и генерация данных клиента (используется content.js и registration.js).
- `image-data.js` — тестовое фото в base64 (`TEST_IMAGE_DATA_URL`).
- `iobb-data.js` — строка `IOVATION_IOBB` для `createApplication`.
- `test-image.jpg` / `test-video.webm` — исходные тестовые файлы.
- `icon-16.png` / `icon-48.png` / `icon-128.png` — иконка (флаг Кыргызстана).

## Разрешения

- `permissions`: `clipboardRead`, `cookies`, `tabs`.
- `host_permissions`: `http://localhost/*`, `http://*.docker/*`, `https://*.doke.kg/*`, `https://*.fino.kg/*` — для кросс-доменных запросов из popup к `api.<env>` / `erp.<env>` и установки cookie.

## Поддерживаемые хосты

- `localhost`, `*.localhost` (любой порт)
- `*.docker` (напр. `erp.doke.kg.docker`, `erp.fino.kg.docker`)
- `*.doke.kg`, `*.fino.kg` (staging и т.п., включая `offline.*` и `erp.*`)
