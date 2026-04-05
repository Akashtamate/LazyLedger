# iPhone Shortcut - Complete Reference

## Trigger

- **Type:** Message Automation
- **Message contains:** `From HDFC Bank A/C *XXXX`  replace with your last 4 digits
- **From:** (leave blank - works with all HDFC sender IDs: AD-, JD-, VM-, etc.)
- **Run Immediately:** ON

---

## Pseudocode

```
WHEN message received containing "From HDFC Bank A/C *XXXX":

  1. MATCH regex Rs\.([0-9,]+(?:\.[0-9]{1,2})?) in Message Body
  2. GET group at index 1 from Matches -> RawAmount
  3. REPLACE "," with "" in RawAmount
  4. SET Amount = cleaned number
  5. CALCULATE Amount + 0 -> RawAmountNumber  (converts text to number)

  6. SET PaymentMethod = "Phone Pe"  <- default

  7. ASK "What was this expense for?" -> Description
  8. SHOW category list -> Category
  9. SHOW [Yes - Split with Anup / No - Just me] -> IsShared
  10. FORMAT current date as yyyy-MM-dd -> Today

  11. BUILD Notion JSON with all variables
  12. POST to https://api.notion.com/v1/pages

  13. IF IsShared contains "Yes":
        CALCULATE RawAmountNumber / 2 -> FinalAmount
        BUILD Splitwise JSON
        POST to https://secure.splitwise.com/api/v3.0/create_expense

  14. SHOW notification "Logged • Description  Category"
```

---

## Actions in Order (iOS 16.5)

| # | Action | Configuration |
|---|---|---|
| 1 | Match Text | Pattern: `Rs\.([0-9,]+(?:\.[0-9]{1,2})?)` · In: Message Body |
| 2 | Get Group At Index | Index: 1 · In: Matches |
| 3 | Set Variable | `RawAmount` = Text (output of step 2) |
| 4 | Replace Text | Find: `,` · Replace: *(empty)* · In: RawAmount |
| 5 | Set Variable | `Amount` = Updated Text |
| 6 | Calculate | `RawAmount + 0` |
| 7 | Set Variable | `RawAmountNumber` = Calculation Result |
| 8 | Text | `Phone Pe` |
| 9 | Set Variable | `PaymentMethod` = Text |
| 10 | Ask for Input | Type: Text · Question: "What was this expense for?" |
| 11 | Set Variable | `Description` = Provided Input |
| 12 | List | All categories (one per line) |
| 13 | Choose from List | Input: List |
| 14 | Set Variable | `Category` = Chosen Item |
| 15 | List | `Yes - Split with Anup` / `No - Just me` |
| 16 | Choose from List | Input: List |
| 17 | Set Variable | `IsShared` = Chosen Item |
| 18 | Current Date | - |
| 19 | Format Date | Format: Custom `yyyy-MM-dd` · Time: None · Input: Current Date |
| 20 | Set Variable | `Today` = Formatted Date |
| 21 | Text | Notion JSON body (see template below) |
| 22 | Set Variable | `NotionBody` = Text |
| 23 | Get Contents of URL | POST to Notion (see config below) |
| 24 | **If** | IsShared contains `Yes` |
| 25 | Calculate | `RawAmountNumber / 2` |
| 26 | Set Variable | `FinalAmount` = Calculation Result |
| 27 | Text | Splitwise JSON body (see template below) |
| 28 | Set Variable | `SplitwiseBody` = Text |
| 29 | Get Contents of URL | POST to Splitwise (see config below) |
| 30 | **Otherwise** | (empty) |
| 31 | **End If** | - |
| 32 | Show Notification | Title: `Logged` · Body: Description + Category |

---

## Category List (must match Notion exactly)

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

## Notion API Call (Action 23)

- **URL:** `https://api.notion.com/v1/pages`
- **Method:** POST
- **Request Body:** File -> `NotionBody` variable

**Headers:**
```
Authorization     Bearer YOUR_NOTION_SECRET
Content-Type      application/json
Notion-Version    2022-06-28
```

**Notion JSON body template** (Action 21 - Text action with inline variables):
```json
{
  "parent": { "database_id": "YOUR_DATABASE_ID" },
  "properties": {
    "Description": {
      "title": [{ "text": { "content": "[Description]" } }]
    },
    "Amount": { "number": [RawAmountNumber] },
    "Category": {
      "multi_select": [{ "name": "[Category]" }]
    },
    "Payment Method": {
      "select": { "name": "[PaymentMethod]" }
    },
    "Date": { "date": { "start": "[Today]" } }
  }
}
```

---

## Splitwise API Call (Action 29)

- **URL:** `https://secure.splitwise.com/api/v3.0/create_expense`
- **Method:** POST
- **Request Body:** File -> `SplitwiseBody` variable

**Headers:**
```
Authorization     Bearer YOUR_SPLITWISE_API_KEY
Content-Type      application/json
```

**Splitwise JSON body template** (Action 27 - Text action with inline variables):
```json
{
  "cost": "[RawAmountNumber]",
  "description": "[Description]",
  "currency_code": "INR",
  "group_id": YOUR_GROUP_ID,
  "users__0__user_id": YOUR_USER_ID,
  "users__0__paid_share": "[RawAmountNumber]",
  "users__0__owed_share": "[FinalAmount]",
  "users__1__user_id": FLATMATE_USER_ID,
  "users__1__paid_share": "0",
  "users__1__owed_share": "[FinalAmount]"
}
```

---

## Monthly Update

1. Create new Notion database for the month
2. Share it with your Notion integration
3. Get the new database ID from the URL
4. In the Shortcut: edit Action 21 (Notion JSON body) -> update `database_id`

---

## Troubleshooting

| Problem | Cause | Fix |
|---|---|---|
| Amount shows empty | Tested with play button (no real SMS) | Test with a real HDFC payment |
| Notion entry not created | Wrong database ID or category name mismatch | Check `database_id` and category spelling |
| Splitwise not updated | `IsShared` variable not matching "Yes" | Check the List items - must start with "Yes" |
| Shortcut doesn't fire | Trigger keyword wrong | Check your account number last 4 digits |
