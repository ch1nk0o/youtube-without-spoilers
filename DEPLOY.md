# Setup: автоматический деплой в Chrome Web Store

Один раз настраиваешь — потом я запускаю `./deploy.sh` и всё едет.

Файл в `.gitignore` — секретов в репо не будет.

---

## Phase 1: Google Cloud Console (5 минут в браузере)

### 1.1 Создать проект
1. Открой https://console.cloud.google.com/
2. Сверху рядом с логотипом «Google Cloud» — селектор проекта → **New Project**
3. Name: `youtube-without-spoilers` → **Create**
4. Выбери созданный проект в селекторе

### 1.2 Включить Chrome Web Store API
1. Меню (☰) слева → **APIs & Services** → **Library**
2. В поиске: `Chrome Web Store API` → выбери его → **Enable**

### 1.3 Настроить OAuth consent screen
1. **APIs & Services** → **OAuth consent screen**
2. User type: **External** → Create
3. Заполни обязательные поля:
   - App name: `yt-spoilers-deploy`
   - User support email: твой gmail
   - Developer contact: твой gmail
4. **Save and Continue** → **Save and Continue** на всех остальных шагах (scopes и test users можно пропустить)
5. На главной странице consent screen → **Publishing status** → **Publish App** (без верификации, для собственного использования это ок)

### 1.4 Создать OAuth Client ID
1. **APIs & Services** → **Credentials**
2. **+ Create Credentials** → **OAuth client ID**
3. Application type: **Desktop app**
4. Name: `yt-spoilers-cli`
5. **Create**
6. В появившемся диалоге **скопируй**:
   - **Client ID** (выглядит как `123456789-abc...apps.googleusercontent.com`)
   - **Client Secret** (короткая строка, типа `GOCSPX-xxxxxxxxx`)

---

## Phase 2: Получить refresh token (3 минуты)

Через Google OAuth Playground:

1. Открой https://developers.google.com/oauthplayground
2. Жми ⚙ (шестерёнка) в правом верхнем углу → поставь галку **Use your own OAuth credentials**
3. Вставь свои **Client ID** и **Client Secret** → **Close**
4. В левой колонке "Step 1 Select & authorize APIs":
   - В поле «Input your own scopes» вставь: `https://www.googleapis.com/auth/chromewebstore`
   - **Authorize APIs**
5. Откроется консент-окно Google → выбери свой аккаунт (тот что админит расширение в Store)
6. Может вылезти warning «Google hasn't verified this app» → **Advanced** → **Go to yt-spoilers-deploy (unsafe)** → **Allow**
7. Вернёшься в Playground → "Step 2 Exchange authorization code for tokens" → **Exchange authorization code for tokens**
8. Скопируй **Refresh token** (длинная строка начинающаяся с `1//`)

---

## Phase 3: Заполнить .env

В корне проекта есть `.env.example`. Скопируй и заполни:

```bash
cp .env.example .env
```

Открой `.env` в любом редакторе, вставь:
- `GOOGLE_CLIENT_ID` — из Phase 1.4
- `GOOGLE_CLIENT_SECRET` — из Phase 1.4
- `GOOGLE_REFRESH_TOKEN` — из Phase 2 шаг 8
- `EXTENSION_ID` — уже заполнен (`ojjfhifaphohclopdncjpbhickpckjin`)

---

## Phase 4: Запуск

```bash
./deploy.sh
```

Что произойдёт:
1. Запустится `build-store-zip.sh` → соберёт zip из текущего `manifest.json`
2. Загрузит zip в Store через API (как «черновик»)
3. Отправит черновик на ревью

Версия в `manifest.json` должна быть **выше** текущей в Store, иначе API вернёт ошибку.

---

## Безопасность

- `.env` в `.gitignore` — секреты не в git
- Если refresh token утёк — в Google Cloud Console → Credentials → удали OAuth client → создай новый → пройди Phase 2 заново
- В OAuth client можно ограничить scope только до `chromewebstore` (уже сделано)
