# Getting safeComms Working on X (Twitter)

Use these official X links to get API access and credentials so the bot can run on X.

---

## 1. Sign up for the X API

**Developer portal (sign up / log in):**  
https://developer.x.com/en/portal/products/basic

- Create a developer account and a **Project** + **App**.
- Choose an access tier. For safeComms you need **read + write** and ideally **Communities** (see tier note below).
- Save every credential as soon as it’s shown; they are only displayed once.

**Getting access (overview):**  
https://developer.x.com/en/docs/twitter-api/getting-started/getting-access-to-the-twitter-api

---

## 2. Get your app credentials (API Key + Secret)

These are the “app” keys (Consumer Key / Consumer Secret in OAuth 1.0a).

**Where:** Developer portal → your Project → your App → **“Keys and tokens”** (or “Consumer Keys”).

**Docs:**  
https://developer.x.com/en/docs/authentication/oauth-1-0a/api-key-and-secret

- **API Key** → use as `X_API_KEY` in `.env`
- **API Key Secret** → use as `X_API_SECRET` in `.env`

---

## 3. Get user credentials (Access Token + Secret) for the bot account

The bot posts as **@Safe_Coms**. You need an **Access Token** and **Access Token Secret** for that account (OAuth 1.0a user context).

**If @Safe_Coms is the account that owns the App:**  
Developer portal → your App → **“Keys and tokens”** → **“Access Token and Secret”** → Generate.  
Use that Access Token and Access Token Secret.

**If @Safe_Coms is a different account:**  
You must use the 3-legged OAuth flow so that account authorizes your app:

**Docs (user access tokens):**  
https://developer.x.com/en/docs/authentication/oauth-1-0a/obtaining-user-access-tokens

- **Access Token** → `X_ACCESS_TOKEN`
- **Access Token Secret** → `X_ACCESS_TOKEN_SECRET`

---

## 4. Communities API (for reading community timelines)

safeComms reads **community timelines** and checks **community members** (for mod verification). Those are Communities endpoints.

**Communities API reference (endpoints):**  
https://developer.x.com/en/docs/twitter-api/communities

**Get Community Tweets:**  
https://developer.x.com/en/docs/twitter-api/communities/get-community-tweets

**Get Community Members (for mod check):**  
https://developer.x.com/en/docs/twitter-api/communities/get-community-members

**Important:** Communities are not available on every tier. They are often **Pro** or higher. In the developer portal, check your product’s “Endpoints” or “Features” to see if “Communities” is included for your tier. If not, you’ll need to upgrade to a tier that includes Communities, or use a different data source (e.g. user timeline) and adapt the ingestion layer.

---

## 5. Put credentials in safeComms

In your project root:

```bash
cp .env.example .env
```

Edit `.env` and set:

```env
X_API_KEY=your_api_key_here
X_API_SECRET=your_api_secret_here
X_ACCESS_TOKEN=your_access_token_here
X_ACCESS_TOKEN_SECRET=your_access_token_secret_here
```

Optional:

```env
OPENAI_API_KEY=your_openai_key_for_reply_polish
CRON_SECRET=random_string_for_cron_protection
```

Then:

```bash
npm run dev
```

The pipeline (ingestion → risk → replies) uses these to talk to X.

---

## 6. Quick reference – all links

| What | Link |
|------|------|
| Developer portal (sign up / manage apps) | https://developer.x.com/en/portal/products/basic |
| Getting access to the API | https://developer.x.com/en/docs/twitter-api/getting-started/getting-access-to-the-twitter-api |
| API Key and Secret | https://developer.x.com/en/docs/authentication/oauth-1-0a/api-key-and-secret |
| User Access Token (OAuth 1.0a) | https://developer.x.com/en/docs/authentication/oauth-1-0a/obtaining-user-access-tokens |
| X API v2 overview | https://developer.x.com/en/docs/twitter-api |
| Communities (overview) | https://developer.x.com/en/docs/twitter-api/communities |
| Get Community Tweets | https://developer.x.com/en/docs/twitter-api/communities/get-community-tweets |
| Get Community Members | https://developer.x.com/en/docs/twitter-api/communities/get-community-members |
| API reference index | https://developer.x.com/en/docs/twitter-api/api-reference-index |

---

## 7. How the bot uses these

1. **Ingestion:** Uses **OAuth 1.0a (user context)** with your four credentials to call **Get Community Tweets** for each activated community.
2. **Activation check:** Uses **Get Community Members** (or moderators endpoint) to verify the user who posted `@Safe_Coms activate` is a mod/admin.
3. **Replies and reports:** Uses the same user context to **post replies** and **post transparency report tweets** as @Safe_Coms.

So: same app + same bot user credentials everywhere; no extra APIs needed beyond the ones above.
