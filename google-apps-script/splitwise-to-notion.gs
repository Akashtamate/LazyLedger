// ============================================================
// SPLITWISE - NOTION SYNC SCRIPT
// Runs every hour. Fetches new expenses by Anup from Splitwise
// and creates Notion entries for review.
// ============================================================

// ── CONFIG ── Fill these in once ────────────────────────────

const CONFIG = {
  SPLITWISE_API_KEY:  "",
  SPLITWISE_GROUP_ID: "",
  ANUP_USER_ID:       "",

  NOTION_SECRET:      "",   // secret_xxx from notion.so/my-integrations
  NOTION_DATABASE_ID: "", // Update each month

  YOUR_EMAIL:         "",   // Where to send review notifications
};

// ── CATEGORIES (must match Notion exactly) ──────────────────
const CATEGORIES = [
  "Groceries and Veggies",
  "Outside food",
  "Rent",
  "Cook",
  "WiFi & Internet Bills",
  "Fuel",
  "Entertainment",
  "Skincare",
  "Others",
];

// ── KEYWORD - CATEGORY AUTO-DETECTION ───────────────────────
// If description contains any of these words, category is auto-assigned.
// Otherwise falls back to "⚠️ Needs Category"
const KEYWORD_MAP = {
  "blinkit":      "Groceries and Veggies",
  "swiggy instamart": "Groceries and Veggies",
  "zepto":        "Groceries and Veggies",
  "grocer":       "Groceries and Veggies",
  "vegetable":    "Groceries and Veggies",
  "sabzi":        "Groceries and Veggies",
  "swiggy":       "Outside food",
  "zomato":       "Outside food",
  "restaurant":   "Outside food",
  "dinner":       "Outside food",
  "lunch":        "Outside food",
  "breakfast":    "Outside food",
  "rent":         "Rent",
  "cook":         "Cook",
  "maid":         "Cook",
  "wifi":         "WiFi & Internet Bills",
  "internet":     "WiFi & Internet Bills",
  "broadband":    "WiFi & Internet Bills",
  "petrol":       "Fuel",
  "fuel":         "Fuel",
  "electricity":  "Others",
  "water":        "Others",
  "netflix":      "Entertainment",
  "spotify":      "Entertainment",
  "prime":        "Entertainment",
  "hotstar":      "Entertainment",
};

// ── MAIN FUNCTION ── Set this as the trigger ─────────────────
function syncSplitwiseToNotion() {
  const lastRunTime = getLastRunTime();
  const newExpenses = fetchAnupExpenses(lastRunTime);

  if (newExpenses.length === 0) {
    Logger.log("No new expenses from Anup since " + lastRunTime);
    return;
  }

  Logger.log("Found " + newExpenses.length + " new expense(s) from Anup");

  newExpenses.forEach(expense => {
    const notionPageUrl = createNotionEntry(expense);
    sendReviewNotification(expense, notionPageUrl);
  });

  setLastRunTime(new Date().toISOString());
}

// ── FETCH NEW EXPENSES FROM SPLITWISE ────────────────────────
function fetchAnupExpenses(since) {
  const url = `https://secure.splitwise.com/api/v3.0/get_expenses?group_id=${CONFIG.SPLITWISE_GROUP_ID}&limit=50`;

  const response = UrlFetchApp.fetch(url, {
    headers: { "Authorization": "Bearer " + CONFIG.SPLITWISE_API_KEY },
    muteHttpExceptions: true,
  });

  const data = JSON.parse(response.getContentText());

  if (!data.expenses) {
    Logger.log("Error fetching Splitwise expenses: " + response.getContentText());
    return [];
  }

  const sinceDate = since ? new Date(since) : new Date(Date.now() - 60 * 60 * 1000);

  return data.expenses.filter(exp => {
    if (exp.deleted_at) return false;                          // Skip deleted
    if (exp.payment) return false;                             // Skip settlements
    const createdBy = exp.created_by && exp.created_by.id;
    if (String(createdBy) !== String(CONFIG.ANUP_USER_ID)) return false; // Only Anup's
    const createdAt = new Date(exp.created_at);
    return createdAt > sinceDate;                              // Only new ones
  });
}

// ── DETECT CATEGORY FROM DESCRIPTION ─────────────────────────
function detectCategory(description) {
  if (!description) return null;
  const lower = description.toLowerCase();
  for (const [keyword, category] of Object.entries(KEYWORD_MAP)) {
    if (lower.includes(keyword)) return category;
  }
  return null;
}

// ── CREATE NOTION ENTRY ───────────────────────────────────────
function createNotionEntry(expense) {
  const description  = expense.description || "Expense from Anup";
  const amount       = parseFloat(expense.cost);
  const date         = expense.date ? expense.date.split("T")[0] : new Date().toISOString().split("T")[0];
  const autoCategory = detectCategory(description);
  const category     = autoCategory || "Others";
  const needsReview  = !autoCategory;

  const body = JSON.stringify({
    parent: { database_id: CONFIG.NOTION_DATABASE_ID },
    properties: {
      Description: {
        title: [{
          text: { content: needsReview ? "⚠️ " + description + " [ANUP]" : description + " [ANUP]" }
        }]
      },
      Amount:          { number: amount },
      Category:        { multi_select: [{ name: category }] },
      "Payment Method": { select: { name: "Phone Pe" } },  // Anup paid — adjust if needed
      Date:            { date: { start: date } },
    }
  });

  const response = UrlFetchApp.fetch("https://api.notion.com/v1/pages", {
    method: "post",
    headers: {
      "Authorization":  "Bearer " + CONFIG.NOTION_SECRET,
      "Content-Type":   "application/json",
      "Notion-Version": "2022-06-28",
    },
    payload: body,
    muteHttpExceptions: true,
  });

  const result = JSON.parse(response.getContentText());

  if (result.id) {
    Logger.log("Created Notion entry: " + result.url);
    return result.url;
  } else {
    Logger.log("Failed to create Notion entry: " + response.getContentText());
    return null;
  }
}

// ── SEND EMAIL NOTIFICATION ───────────────────────────────────
function sendReviewNotification(expense, notionUrl) {
  const description = expense.description || "Unknown expense";
  const amount      = expense.cost;
  const autoCategory = detectCategory(description);

  if (autoCategory) {
    // Auto-categorised — send a simple FYI
    GmailApp.sendEmail(
      CONFIG.YOUR_EMAIL,
      ` Anup added ₹${amount} — logged to Notion`,
      `Expense: ${description}\nAmount: ₹${amount}\nCategory: ${autoCategory} (auto-detected)\n\nNotion: ${notionUrl}`
    );
  } else {
    // Needs manual category — send a review request
    GmailApp.sendEmail(
      CONFIG.YOUR_EMAIL,
      `⚠️ Review needed: Anup added ₹${amount}`,
      `Expense: ${description}\nAmount: ₹${amount}\n\nThis expense needs a category. Open Notion to set it:\n${notionUrl}\n\nCategories to choose from:\n${CATEGORIES.join("\n")}`
    );
  }
}

// ── LAST RUN TIME (stored in Script Properties) ───────────────
function getLastRunTime() {
  const props = PropertiesService.getScriptProperties();
  return props.getProperty("LAST_RUN_TIME");
}

function setLastRunTime(isoString) {
  const props = PropertiesService.getScriptProperties();
  props.setProperty("LAST_RUN_TIME", isoString);
}

// ── MANUAL TEST FUNCTION ──────────────────────────────────────
// Run this once manually to verify everything works before setting the trigger.
function testScript() {
  Logger.log("Testing Splitwise connection...");

  const response = UrlFetchApp.fetch(
    `https://secure.splitwise.com/api/v3.0/get_expenses?group_id=${CONFIG.SPLITWISE_GROUP_ID}&limit=5`,
    { headers: { "Authorization": "Bearer " + CONFIG.SPLITWISE_API_KEY } }
  );

  const data = JSON.parse(response.getContentText());
  Logger.log("Splitwise OK — fetched " + (data.expenses ? data.expenses.length : 0) + " expenses");

  Logger.log("Testing Notion connection...");
  const notionTest = UrlFetchApp.fetch(
    `https://api.notion.com/v1/databases/${CONFIG.NOTION_DATABASE_ID}`,
    {
      headers: {
        "Authorization":  "Bearer " + CONFIG.NOTION_SECRET,
        "Notion-Version": "2022-06-28",
      }
    }
  );

  const notionData = JSON.parse(notionTest.getContentText());
  Logger.log("Notion OK — database: " + (notionData.title ? notionData.title[0].plain_text : "connected"));

  Logger.log("All connections verified ✓");
}
