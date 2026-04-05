# 🪙 paisa-pilot

> Automate your personal expense tracking — from HDFC SMS to Notion + Splitwise, in under 10 seconds.

Built for the Indian UPI/HDFC ecosystem. No third-party apps, no subscriptions, no servers. Just your phone, Google Apps Script, and a Notion database.

---

## What it does

**When you pay:**
HDFC SMS arrives → iPhone Shortcut fires automatically -> you confirm description, category, and whether it's shared (10 seconds) → entry created in Notion + Splitwise updated if shared.

**When your flatmate pays:**
They log to Splitwise → Google Apps Script polls every hour -> Notion entry auto-created -> you get an email to set the category.

---

## Stack

| Component | Tool | Cost |
|---|---|---|
| SMS trigger | iPhone Shortcuts (iOS 16.5+) | Free |
| Expense database | Notion API | Free |
| Shared expense tracking | Splitwise API | Free |
| Flatmate sync | Google Apps Script | Free |
| Notifications | Gmail | Free |

**Total cost: ₹0/month**

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    FLOW 1: YOU PAY                   │
│                                                      │
│  HDFC SMS → iPhone Shortcut → [10-sec prompt]        │
│                ↓                    ↓                │
│           Notion DB           Splitwise              │
│         (always)           (if shared)               │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                 FLOW 2: FLATMATE PAYS                │
│                                                      │
│  Flatmate → Splitwise → Google Apps Script           │
│                         (polls hourly via API)       │
│                              ↓                       │
│                         Notion DB                    │
│                    + Email notification              │
└─────────────────────────────────────────────────────┘
```

---

## Prerequisites

- iPhone with iOS 16.5+ and Shortcuts app
- HDFC Bank account (SMS alerts enabled)
- Notion account (free tier)
- Splitwise account (free tier)
- Google account (for Apps Script)

---

## Setup Guide

### 1. Notion Setup

1. Go to [notion.so/my-integrations](https://notion.so/my-integrations)
2. Create a new integration → name it `Expense Tracker`
3. Copy the **Internal Integration Secret** (`secret_xxx...`)
4. Create your monthly expense database with these properties:

| Property | Type | Options |
|---|---|---|
| Description | Title | — |
| Date | Date | — |
| Amount | Number | Rupee format |
| Category | Multi-select | See category list below |
| Payment Method | Select | Phone Pe, CRED UPI, Credit Card |

5. Share the database with your integration (... menu → Connections)
6. Copy the **Database ID** from the URL (32-character string after the last `/`)

**Category list:**
```
Groceries and Veggies
Outside food
Rent
Cook
WiFi & Internet Bills
Fuel
Entertainment
Skincare
Transportation
Others
```

---

### 2. Splitwise Setup

1. Go to [secure.splitwise.com/apps/new](https://secure.splitwise.com/apps/new)
2. Register a new app → name it `Expense Tracker` → URL: `https://localhost`
3. Click **Create API key** → copy the key

Get your IDs via terminal:
```bash
# Your user ID
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://secure.splitwise.com/api/v3.0/get_current_user

# Your group ID + flatmate's user ID
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://secure.splitwise.com/api/v3.0/get_groups
```

---

### 3. iPhone Shortcut Setup

See [`shortcut/reference.md`](shortcut/reference.md) for the complete step-by-step guide.

**Trigger:** Message containing `From HDFC Bank A/C *XXXX` (your last 4 digits)

---

### 4. Google Apps Script Setup

1. Go to [script.google.com](https://script.google.com) → New Project
2. Paste the contents of [`google-apps-script/splitwise-to-notion.gs`](google-apps-script/splitwise-to-notion.gs)
3. Fill in your credentials in the `CONFIG` object at the top
4. Run `testScript` first to verify all connections
5. Set up a trigger: `syncSplitwiseToNotion` → Time-driven → Every hour

---

## Configuration

All credentials go in the `CONFIG` object in `splitwise-to-notion.gs`:

```javascript
const CONFIG = {
  SPLITWISE_API_KEY:  "your_splitwise_api_key",
  SPLITWISE_GROUP_ID: "your_group_id",
  ANUP_USER_ID:       "flatmate_user_id",
  NOTION_SECRET:      "secret_xxx",
  NOTION_DATABASE_ID: "your_database_id",
  YOUR_EMAIL:         "your@email.com",
};
```

---

## Monthly Maintenance (30 seconds)

At the start of each month:
- [ ] Create new monthly Notion database
- [ ] Share it with your Notion integration
- [ ] Copy the new database ID
- [ ] Update `database_id` in the Shortcut (Notion JSON body action)
- [ ] Update `NOTION_DATABASE_ID` in the Apps Script CONFIG

---

## How the Flatmate Sync Works

The Google Apps Script:
1. Calls `GET /api/v3.0/get_expenses?group_id=YOUR_GROUP_ID`
2. Filters for expenses created by your flatmate since the last run
3. Auto-detects category from description keywords (Blinkit → Groceries, Zomato → Outside food, etc.)
4. Creates a Notion entry — with `⚠️ [FLATMATE]` prefix if category is ambiguous
5. Emails you with a direct link to review

---

## Keyword → Category Mapping

Extend this in the `KEYWORD_MAP` object in the script:

| Keyword | Category |
|---|---|
| blinkit, zepto, swiggy instamart | Groceries and Veggies |
| swiggy, zomato, restaurant | Outside food |
| rent | Rent |
| cook, maid | Cook |
| wifi, internet, broadband | WiFi & Internet Bills |
| petrol, fuel | Fuel |
| netflix, spotify, prime | Entertainment |

---

## Security Notes

- Never commit your API keys to the repo
- Regenerate Splitwise API key periodically
- Notion integration secret is scoped only to databases you explicitly share with it
- Google Apps Script runs under your Google account with minimal permissions (URL fetch + Gmail)

---

## License

MIT — use it, fork it, improve it.
