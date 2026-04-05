# Notion Database Schema

## Structure

One parent page ("Monthly Expenses") containing separate inline databases per month.
Each monthly database has the same schema.

---

## Properties

| Property | Type | Notes |
|---|---|---|
| `Description` | Title | The main text field. Free text. |
| `Date` | Date | ISO format `yyyy-MM-dd`. |
| `Amount` | Number | Rupee format. No commas. |
| `Category` | Multi-select | See options below. |
| `Payment Method` | Select | See options below. |

---

## Category Options

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

>  All values are case-sensitive. The API will reject any value not in this list.


---

## Payment Method Options

```
Phone Pe
CRED UPI
Credit Card
```

---

## Integration Setup

1. Go to notion.so/my-integrations → New Integration
2. Name: `Expense Tracker`
3. Capabilities: Read, Insert, Update content
4. Copy the **Internal Integration Secret** (`secret_xxx`)
5. For each monthly database:
   - Open the database in Notion
   - Click `...` → Connections → connect `Expense Tracker`

---

## Getting the Database ID

Open the database in your browser. The URL looks like:

```
https://www.notion.so/yourworkspace/DATABASE_ID?v=VIEW_ID
```

The `DATABASE_ID` is the 32-character string. Format it with hyphens:

```
xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

---

## Monthly Database IDs

Update this table at the start of each month:

| Month | Database ID |
|---|---|
| April 2026 | `` |
| May 2026 | *(add when created)* |
| June 2026 | *(add when created)* |

---

## Flatmate Expense Entries

Expenses synced from Splitwise (paid by flatmate) follow this convention:

- **Description:** Prefixed with `⚠️` if category needs review, always suffixed with `[ANUP]`
- **Category:** Auto-detected from keywords, or `Others` if ambiguous
- **Payment Method:** `Phone Pe` (placeholder — update if needed)

Example: `⚠️ Electricity bill [ANUP]`
