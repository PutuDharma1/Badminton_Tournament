# Mock Data Layer - Quick Reference

## 🎯 Overview
The app now has a complete mock data layer that simulates the backend without requiring a real API. This allows full frontend development and testing.

## 🔧 How It Works

The mock data system automatically activates when:
```
VITE_USE_MOCK_DATA=true
```

in your `.env` file (already configured).

## 👥 Test Accounts

You can login with these pre-configured accounts:

### Committee Account
- **Email:** `committee@test.com`
- **Password:** `password`
- **Use for:** Creating tournaments, managing players, starting round-robin

### Player Account
- **Email:** `player@test.com`
- **Password:** `password`
- **Use for:** Viewing tournaments, registering for events, checking matches

### Referee Account
- **Email:** `referee@test.com`
- **Password:** `password`
- **Use for:** Viewing assigned matches, picking matches, entering scores

## 📦 Mock Data Included

- **5 Users** (1 Committee, 1 Referee, 3 Players)
- **2 Tournaments** (1 Draft, 1 Ongoing)
- **4 Participants** (including offline player)
- **2 Categories** (Men's and Women's)
- **2 Matches** (1 Ongoing, 1 Scheduled)

## 🔄 Switching to Real API

When your backend is ready:

1. Update `.env`:
   ```
   VITE_USE_MOCK_DATA=false
   VITE_API_BASE_URL=http://localhost:5000
   ```

2. Restart dev server

That's it! All API calls will automatically route to your real backend.

## 🚀 Next Steps

Now you can build:
- Committee Dashboard
- Tournament Management UI
- Player Management
- Match Scheduling
- Profile Pages

All features will work with realistic data without needing the backend!
