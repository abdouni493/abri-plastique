# 🎯 Quick Start - Source Bon Search Feature

## ⚡ 30-Second Overview

**What:** Search for source documents while creating new bons  
**Where:** Bons de Livraison & Bons de Réception pages  
**Why:** Auto-populate products and details instantly  
**How:** Type document number or client name, select, done!

---

## 🚀 Quick Workflow

### Create Bon de Livraison from Bon de Commande

```
1️⃣ Create BC
   "Nouveau Bon" → Fill details → Save
   
2️⃣ Go to BL page
   Click "Bons de Livraison" in sidebar
   
3️⃣ Start new BL
   Click "Nouveau Bon" button
   → Search box appears at top
   
4️⃣ Search for BC
   Type "BC-2026-1234" or "TechPro"
   → Dropdown shows matching documents
   
5️⃣ Select BC
   Click on BC in dropdown
   → Form auto-fills with all products
   
6️⃣ Save
   Click "Enregistrer" button
   → Done! BL created from BC
```

### Create Bon de Réception from Bon de Livraison

Same process, but:
- Go to **Bons de Réception** page instead
- Search for **Bon de Livraison** instead
- Everything else is identical ✅

---

## 🎨 Visual Guide

### Step 1: Click "Nouveau Bon"
```
┌─────────────────────────────────────┐
│ Bons de Livraison                   │
│ ┌───────────────────┐               │
│ │ [+ Nouveau Bon] ← Click here      │
│ └───────────────────┘               │
└─────────────────────────────────────┘
```

### Step 2: Search Box Appears
```
┌───────────────────────────────────────────────┐
│ ➜ Rechercher et convertir un document source  │
│ 🔍 Rechercher un Bon de Commande...           │
│    ↑ Type here                                │
│ 💡 Sélectionnez pour auto-remplir le formulaire
└───────────────────────────────────────────────┘
```

### Step 3: Type to Search
```
🔍 BC-2026-1234
   ↓ Results appear:
   
┌─────────────────────────────────────────┐
│ 📄 BC-2026-1234                         │
│ SARL TechPro · 125,000.00 DA            │
│ 5 produits | brouillon          ← Click│
├─────────────────────────────────────────┤
│ 📄 BC-2026-5678                         │
│ EURL Design · 89,500.00 DA              │
│ 3 produits | confirme                   │
└─────────────────────────────────────────┘
```

### Step 4: Selection Confirmed
```
┌──────────────────────────────────────────────┐
│ ✅ Converti depuis BC-2026-1234              │
│ 5 produits · 125,000.00 DA         [✕]     │
└──────────────────────────────────────────────┘

Form auto-fills:
✅ Products: Laptop x2, Mouse x5, etc.
✅ Quantities: All copied
✅ Prices: All copied
✅ Client: SARL TechPro
✅ Totals: 125,000.00 DA
```

### Step 5: Edit if Needed
```
Optional: Change quantities or prices
Or keep as-is and proceed
```

### Step 6: Save
```
┌──────────────────────────┐
│ [Enregistrer] ← Click    │
└──────────────────────────┘
✅ BL-2026-9012 created and saved!
```

---

## 📋 Example Workflow

### Real-World Scenario

**Monday:**
```
Customer: SARL TechPro
Order: 2 Laptops + 5 Mice
Action: Create BC-2026-1234 and Save
```

**Wednesday (Partial Delivery):**
```
Action: Go to Bons de Livraison
        Click "Nouveau Bon"
        Search "BC-2026-1234"
        Select it → Form fills
        Edit: Change Laptop qty 2→1
        Save as BL-2026-5678
```

**Thursday (Rest of Delivery):**
```
Action: Go to Bons de Livraison
        Click "Nouveau Bon"
        Search "BC-2026-1234" again
        Select it → Form fills
        Edit: Change Laptop qty 2→1, Mouse qty 5→0
        Save as BL-2026-9999
```

**Friday (Receive Everything):**
```
Action: Go to Bons de Réception
        Click "Nouveau Bon"
        Search "BL-2026-5678"
        Select it → Form fills
        Verify quantities
        Save as BR-2026-1111
```

---

## 🔍 Search Tips

### Search by Document Number
```
Type: BC-2026
Result: All bons from 2026

Type: BC-2026-1234
Result: Exact bon number

Type: 1234
Result: Any bon with 1234 in number
```

### Search by Client/Supplier Name
```
Type: TechPro
Result: All docs from TechPro

Type: Tech
Result: All docs with "Tech" in name

Type: SARL
Result: All docs with "SARL" in name
```

### Search Combinations
```
Type: SARL TechPro
Result: Most specific match first

Type: 2026 Tech
Result: May not work - try one at a time
```

---

## ✨ Key Features

| Feature | How It Works |
|---------|-------------|
| **Auto-Complete** | Results show as you type |
| **Smart Dropdown** | Shows up to 8 best matches |
| **Fast Selection** | Click to instantly populate |
| **Auto-Fill** | Products, prices, totals, client all auto-fill |
| **Editable** | Change any auto-filled value |
| **Reversible** | Click X to clear and restart |
| **Persistent** | Data saved automatically |

---

## ⚡ Keyboard Shortcuts

```
Tab        → Move to next field after search
Enter      → Select first result (if available)
Esc        → Close dropdown / Clear search
Arrow Up   → Scroll up in results
Arrow Down → Scroll down in results
```

---

## ❌ Common Issues & Quick Fixes

### Issue: Search box not showing
```
✓ Make sure you clicked "Nouveau Bon" (not Convert button)
✓ Make sure you're on BL or BR page (not BC page)
✓ Refresh page if needed
```

### Issue: Can't find source document
```
✓ Make sure source document is SAVED (not just in form)
✓ Check you're typing correct number/name
✓ Try searching by different criteria
✓ Refresh page: Press F5
```

### Issue: Wrong document selected
```
✓ Click X button on confirmation card
✓ Search again for correct document
✓ Select correct one this time
```

### Issue: Form didn't auto-fill
```
✓ Check if document was actually selected (card should show)
✓ Refresh page and try again
✓ Check browser console for errors (F12)
```

---

## 🎯 When to Use Each Method

### Use "Search" Button When:
- Creating from multiple possible source bons
- Want to verify source before auto-filling
- Need flexible document selection
- Building complex multi-step workflows

### Use "Convert" Button When:
- Quick, simple creation
- Just converted from the source document page
- Don't need to edit before saving

---

## 💾 Data Backup

### Your Data is Saved
```
✅ Automatically in browser when you:
   - Click "Enregistrer"
   - Delete a document
   - Close the browser

✅ Where it's stored:
   - Browser's localStorage
   - Unique per browser
   - Survives refresh
```

### To Backup Your Data
```
1. Export from browser dev tools (F12)
2. Or periodically screenshot your documents
3. Or manually note important numbers
```

---

## 📞 Need Help?

### Quick Reference
- **Full Guide:** See `SOURCE_BON_SEARCH_GUIDE.md`
- **Code Details:** See `CODE_REFERENCE.md`
- **Troubleshooting:** See SOURCE_BON_SEARCH_GUIDE.md → Troubleshooting

### Common Questions

**Q: How many source documents can I search?**
```
A: Unlimited! You can search all saved bons of that type.
   Dropdown shows 8 best matches, scroll for more.
```

**Q: Can I use on mobile?**
```
A: Yes! Touch the search box, type on keyboard, select result.
   Works on tablets and phones too.
```

**Q: Will data sync across browsers?**
```
A: No, each browser has separate storage.
   Use Export to move between browsers.
```

**Q: What if I clear browser cache?**
```
A: All stored data will be deleted.
   Save documents elsewhere for backup.
```

---

## ✅ Success Checklist

After using the feature, verify:

- ✅ Search box appeared when you clicked "Nouveau Bon"
- ✅ You could type and see matching documents
- ✅ You selected a document
- ✅ Form auto-filled with products
- ✅ Quantities and prices are correct
- ✅ Client/Supplier information is correct
- ✅ You edited if needed
- ✅ You clicked "Enregistrer"
- ✅ New document was created
- ✅ You can see it in the list

If any ❌ failed, check Troubleshooting section above.

---

## 🎓 Learning Path

1. **Start here:** This Quick Start guide (you are here)
2. **Then read:** SOURCE_BON_SEARCH_GUIDE.md for full details
3. **Advanced:** CODE_REFERENCE.md for technical details
4. **Expert:** TECHNICAL_ARCHITECTURE.md for system design

---

## 📊 Feature Summary

```
┌─────────────────────────────────────────────┐
│         SOURCE BON SEARCH FEATURE            │
├─────────────────────────────────────────────┤
│ Status:     ✅ Production Ready             │
│ Location:   Bons de Livraison & Réception   │
│ Function:   Search & auto-populate forms    │
│ Speed:      Instant auto-fill              │
│ Ease:       Very easy to use               │
│ Data:       Auto-saved                      │
│ Browser:    Works offline                   │
└─────────────────────────────────────────────┘
```

---

## 🎉 You're All Set!

Start using the Source Bon Search feature now:

1. Create a Bon de Commande ✅
2. Go to Bons de Livraison ✅
3. Click "Nouveau Bon" ✅
4. Search for your BC ✅
5. Watch it auto-fill ✅
6. Save ✅

**That's it! Enjoy the feature!** 🚀

---

**Quick Start Version:** 1.0.0  
**Last Updated:** May 4, 2026  
**Status:** ✅ Ready to Use
