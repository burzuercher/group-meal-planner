/**
 * INSTRUCTIONS TO RESET APP DATA FOR TESTING
 *
 * To test the new onboarding flow with profile images and party size,
 * you need to clear both local and Firebase data.
 */

console.log(`
╔════════════════════════════════════════════════════════════════╗
║          RESET APP DATA FOR TESTING ONBOARDING                 ║
╚════════════════════════════════════════════════════════════════╝

📱 STEP 1: Clear Local Data (AsyncStorage)

   Option A - Uninstall/Reinstall (Easiest):
   • Uninstall the app from your device/emulator
   • Run: npm start
   • Reinstall the app

   Option B - Clear App Data (Android):
   • Long press app icon → App Info → Storage → Clear Data

   Option C - Delete App (iOS):
   • Long press app icon → Remove App → Delete App
   • Reinstall from Expo Go

═══════════════════════════════════════════════════════════════

🔥 STEP 2: Clear Firebase Data

   1. Visit: https://console.firebase.google.com/
   2. Select project: "lifegroup-menu-planner"
   3. Click "Firestore Database" in left sidebar
   4. Click on "groups" collection
   5. Delete all documents inside (or delete the entire collection)

   Note: You can also delete specific group documents if you want
   to keep some test data

═══════════════════════════════════════════════════════════════

✨ STEP 3: Test New Onboarding

   After clearing both local and Firebase data:
   1. Launch the app
   2. You'll see the new onboarding flow:
      • Welcome screen
      • Enter name screen
      • NEW: Profile setup (image + party size)
      • Create/join group screen

   Test the new features:
   ✓ Upload a profile image (optional)
   ✓ Set default party size (adults + children)
   ✓ Create a new group
   ✓ Your profile image appears in attendance/reserved items
   ✓ Adjust attendance per menu

═══════════════════════════════════════════════════════════════
`);

// You could also add this utility function to your app for development
// Add a hidden button in GroupsScreen or create a dev menu
