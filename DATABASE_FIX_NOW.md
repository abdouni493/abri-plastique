# 🚀 Database Fix Required - Quick Reference

## Error You're Seeing
```
Erreur lors de l'enregistrement: invalid input value for enum achat_status: "dette"
```

## What This Means
The Supabase database's `achat_status` ENUM type doesn't have the new status values yet.

## ⚡ Quick Fix (2 minutes)

**File to Use:** `FIX_ACHAT_STATUS_ENUM.sql`

### Steps:
1. Open Supabase Dashboard: https://app.supabase.com
2. Go to **SQL Editor** → **New Query**
3. Copy ALL content from `FIX_ACHAT_STATUS_ENUM.sql`
4. Paste it in the SQL editor
5. Click **Execute**
6. ✅ Done! Refresh your app and test

---

## What Gets Added to Database

- ✅ New status: `payé` (Green) - Fully paid
- ✅ New status: `dette` (Red) - Partial payment

---

## Automatic Status Logic (Already in App)

When you save a purchase:
- Full payment (≥ Total) → Status = `payé` ✅
- Partial payment → Status = `dette` ✅
- No payment → Status = `brouillon` (draft)

---

## Files Created for You

1. **`FIX_ACHAT_STATUS_ENUM.sql`** - The migration script
2. **`FIX_ACHAT_STATUS_ENUM_GUIDE.md`** - Detailed guide

Just run the SQL and you're done! 🎉
