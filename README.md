# Registration Autofill (KG) — Chrome extension

Расширение Chrome (Manifest V3) для ускорения ручного тестирования на doke.kg / fino.kg:

- **Popup «Client registration»** — регистрирует клиента до выбранного шага **через API** (клик по иконке расширения).
- **Content script** — автозаполнение шагов на странице, загрузка фото и видео, автозаполнение страниц кредит-опции, апрув аппликаций, восстановление пароля, работа с платежами и просрочкой в ERP.

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
- **ERP API token** — токен для ERP `/api/` вызовов (лимит верификации при регистрации, `endDate` займа в панели просрочки). Сохраняется в `chrome.storage.local`, **не хранится в коде**. Задай один раз.
- Кнопка **Register** — запускает цепочку.
- Кнопка **Apply limit only** — только обновляет лимит-модель в ERP (без регистрации).

После успеха показываются **PIN / Email / Password / Phone** и открывается страница нужного шага в новой фоновой вкладке

> Запросы к ERP (`erp.<env>`) идут с `credentials: 'include'` — нужно быть **залогиненным в ERP** в браузере.

---

## Content script (на странице)

### Автозаполнение регистрации

На поддерживаемой странице внизу справа появляется кнопка **«Fill step»**. По клику текущий шаг заполняется случайными валидными данными (ФИО, ПИН, телефон, паспорт, адрес, работа). SMS-код — `0000`, навигацию («Далее») жмёшь вручную. Во время выполнения кнопка блокируется и показывается индикатор загрузки (напр. **«Uploading video…»**).

Отдельно поддерживаются:

- **Загрузка фото** на `…/step4` — три документа (`4/5/6`) через `POST /web/private/client/document/upload`.
- **Загрузка видео** на `…/video-capture` — выбор видео-верификации + `POST /web/private/client/document/video-file-upload` (поле `8`, файл `test-video.webm`).
- **Страницы кредит-опции** — `…/ct/ins` (со страховкой), `…/ct/gr` (с поручителем), `…/ct/wo-ins` (без страховки)
### Апрув аппликации (ERP)

На `…/applications/todo/{id}/client-finish-manual-verification` кнопка становится **«Approve application»** и проходит весь флоу ручной верификации (подтверждение документов/совпадений, чекбоксы видео/идентичности, Approve Application + подтверждение в модалке).

### Заполнение платежа из буфера (ERP)

На `…/payments/add` кнопка **«Fill payment»**: читает буфер обмена, вставляет в `#payerCode` (выбирает подсказку typeahead), выставляет источник **E-wallet**, вставляет то же значение в `paymentInfo`. Клик по родной **Save** перехватывается: форма сохраняется через `fetch`, затем запускаются incoming-кроны.

### Панель платежей (ERP)

На ERP-хостах (`erp.*`) слева внизу — панель:

- поля **PIN** и **Amount** + кнопка **«Create payment»** — ищет клиента (`GET /clients/search`), создаёт входящий платёж (`POST /payments/add`, `source: E-wallet`, `wallet: balance`, `currency: KGS`) и запускает кроны `paymentsAutomatchIncoming`, `paymentIncoming`;
- кнопка **«Run outgoing crons»** — `exportHack`, `paymentsAutomatchOutgoing`, `paymentOutgoing`.

### Панель просрочки (ERP)

На ERP-хостах под панелью платежей — панель **«Set loan overdue»** (ввод клиента в просрочку):

- поля **Loan ID** и **Overdue days** + кнопка **«Run overdue cron»**;
- берёт `data.endDate` займа (`GET /api/loans/{loanId}?token=…`), прибавляет указанное число дней (формат `DD.MM.YYYY`);
- обновляет крону `dueDays` (id 29): `POST /cron-jobs/edit/29` с `action = invoices notify-due-days --current-date=<дата> --loan=<loanId> --force=1` и запускает её (`GET /cron-jobs/run/29`).

### Восстановление пароля (фронт)

На странице логина фронта (`…/login`, staging/локалка) слева внизу — панель **«Recover password»**:

- поле **Email** + кнопка **«Recover password»**;
- шлёт `POST /web/public/client/recover/password` (со stub-токеном reCAPTCHA);
- находит клиента в ERP по email (`GET /clients/searchByTerm?search=<email>`), читает временный пароль из коммуникаций (`GET /clients/communication/{clientId}`);
- вставляет email в `input_login`, код в `input_password`, жмёт `btn_submit`, затем на `…/profile/change-password` задаёт новый пароль `Test12345` и сохраняет;
- при `429` показывает **«Too many requests, please wait»**.

> Требуется быть залогиненным в ERP (запросы к коммуникациям идут через background service worker с `credentials: 'include'`).

---

## Файлы

- `manifest.json` — MV3: `action` (popup `registration.html`), `content_scripts`, `permissions`, `host_permissions`, `web_accessible_resources`, иконки.
- `registration.html` / `registration.js` — popup регистрации (API-цепочка).
- `content.js` — логика на странице (автозаполнение, фото/видео, кредит-опции, апрув, платежи, просрочка, восстановление пароля).
- `background.js` — service worker: API-цепочка регистрации, обновление лимит-модели, получение кода восстановления из ERP.
- `generateData.js` — общие константы и генерация данных клиента (используется content.js и registration.js).
- `image-data.js` — тестовое фото в base64 (`TEST_IMAGE_DATA_URL`).
- `iobb-data.js` — строка `IOVATION_IOBB` для `createApplication`.
- `test-image.jpg` / `test-video.webm` — исходные тестовые файлы.
- `icon-16.png` / `icon-48.png` / `icon-128.png` — иконка (флаг Кыргызстана).

## Разрешения

- `permissions`: `clipboardRead`, `cookies`, `tabs`, `storage`.
- `host_permissions`: `http://localhost/*`, `http://*.docker/*`, `https://*.doke.kg/*`, `https://*.fino.kg/*` — для кросс-доменных запросов из popup к `api.<env>` / `erp.<env>` и установки cookie.

## Поддерживаемые хосты

- `localhost`, `*.localhost` (любой порт)
- `*.docker` (напр. `erp.doke.kg.docker`, `erp.fino.kg.docker`)
- `*.doke.kg`, `*.fino.kg` (staging и т.п., включая `offline.*` и `erp.*`)
