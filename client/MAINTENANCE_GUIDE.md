# 🔧 Maintenance Mode Guide

## Overview
This guide explains how to enable and disable maintenance mode for ACETRACK. When enabled, all users will see a maintenance page instead of the normal application.

---

## 📁 File Locations

### 1. **Maintenance Configuration**
**Location:** `client/src/config/maintenance.ts`

This is the **main control file** where you toggle maintenance mode on/off.

```typescript
export const MAINTENANCE_MODE = false  // Set to true to enable
```

### 2. **Maintenance Page Component**
**Location:** `client/src/app/maintenance/page.tsx`

This is the actual maintenance page that users will see. You can customize the design, text, and styling here.

### 3. **Maintenance Wrapper Component**
**Location:** `client/src/components/MaintenanceWrapper.tsx`

This component checks the maintenance mode and shows the maintenance page if enabled.

### 4. **Layout Integration**
**Location:** `client/src/app/layout.tsx`

The layout file includes the MaintenanceWrapper, which intercepts all pages when maintenance mode is active.

---

## 🚀 How to Use

### **To Enable Maintenance Mode:**

1. Open `client/src/config/maintenance.ts`
2. Change `MAINTENANCE_MODE` from `false` to `true`:
   ```typescript
   export const MAINTENANCE_MODE = true
   ```
3. Save the file
4. The app will now show the maintenance page to all users

### **To Disable Maintenance Mode (Return to Normal):**

1. Open `client/src/config/maintenance.ts`
2. Change `MAINTENANCE_MODE` from `true` to `false`:
   ```typescript
   export const MAINTENANCE_MODE = false
   ```
3. Save the file
4. The app will return to normal operation

---

## 💡 Use Cases

### **Scenario 1: Deploy Maintenance While Editing**
1. **Before deploying:** Set `MAINTENANCE_MODE = true` in `maintenance.ts`
2. **Deploy to production** - users will see maintenance page
3. **Edit your main pages** locally with `MAINTENANCE_MODE = false`
4. **When ready:** Set `MAINTENANCE_MODE = false` and deploy again

### **Scenario 2: Scheduled Maintenance**
1. Set `MAINTENANCE_MODE = true` before maintenance window
2. Perform updates/backups
3. Set `MAINTENANCE_MODE = false` when done

---

## 🎨 Customizing the Maintenance Page

To change the design or text, edit:
- **File:** `client/src/app/maintenance/page.tsx`
- You can modify:
  - Text content
  - Colors and styling
  - Icons
  - Animations
  - Layout

---

## ⚠️ Important Notes

1. **All routes are affected** - When maintenance mode is enabled, ALL pages show the maintenance page (including login, dashboard, etc.)

2. **No authentication bypass** - Even logged-in users will see the maintenance page

3. **Quick toggle** - You can enable/disable instantly by changing one boolean value

4. **Development vs Production** - The same config file works in both environments. Make sure to set it correctly before deploying.

---

## 🔍 Testing

1. **Test locally:**
   - Set `MAINTENANCE_MODE = true`
   - Run `npm run dev`
   - Visit any route - you should see the maintenance page

2. **Test normal mode:**
   - Set `MAINTENANCE_MODE = false`
   - Refresh - you should see the normal app

---

## 📝 Quick Reference

| Action | File | Change |
|--------|------|--------|
| Enable Maintenance | `client/src/config/maintenance.ts` | `MAINTENANCE_MODE = true` |
| Disable Maintenance | `client/src/config/maintenance.ts` | `MAINTENANCE_MODE = false` |
| Customize Design | `client/src/app/maintenance/page.tsx` | Edit component code |

---

**That's it!** You now have full control over maintenance mode. 🎉

