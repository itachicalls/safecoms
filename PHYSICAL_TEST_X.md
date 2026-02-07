# Physically Test safeComms on X Communities

## 1. Port change

safeComms now runs on **port 3001** (not 3000) to avoid conflicts with other projects.

```powershell
cd c:\Users\smyde\cursor\safecomms
npm run dev
```

Open **http://localhost:3001**

---

## 2. Get your X Community ID

1. Go to X and open the community you want to test with.
2. Check the URL. It may look like:
   - `https://x.com/i/communities/12345678`
   - Or the ID might be in a different format.
3. The **Community ID** is the numeric part (e.g. `12345678`).

If you can't find it in the URL, some X Community pages show the ID in the page source or in developer tools. The ID is usually a long numeric string.

---

## 3. Add the community in the dashboard

1. Go to **http://localhost:3001/dashboard**
2. Open the **COMMUNITIES** tab.
3. In **ADD COMMUNITY FOR TESTING**:
   - Enter your Community ID.
   - Optionally enter a name.
   - Click **Add & activate**.

---

## 4. Run the pipeline

1. Stay on the dashboard.
2. In the **OVERVIEW** tab, find the **PIPELINE** panel.
3. Click **Run pipeline now**.

The pipeline will:
- Ingest posts from your activated community (via X API).
- Assess each post for risk.
- If risk ≥ 0.75, post a reply as the bot and store the flag.
- Store mod alerts and log-only items.

---

## 5. Check results

- **COMMUNITIES** tab: Community should show as active.
- **FLAGS** tab: Any risky posts that were flagged will appear here.
- On X: If the bot posted, you’ll see a reply on the original post.

---

## Notes

- **X API Communities**: Your X API tier must include Communities access. If it doesn’t, ingestion will return 0 posts and no flags. Basic tier may not include Communities; Pro often does.
- **Bot account**: The Access Token in `.env` must be for the account that will post (e.g. @Safe_Coms or @IShortBTC). That account must be able to post in the community.
- **First run**: If nothing appears, check the browser console and terminal for errors. The X API may return errors if Communities aren’t available on your tier.
