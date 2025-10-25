# Firebase Cloud Functions - Lifegroup Meal Planner

This directory contains Firebase Cloud Functions for the Lifegroup Meal Planner app.

## Functions

### `generateMenuImage`

A v2 callable function that generates menu images using Gemini AI.

**Features:**
- Group membership validation
- Image caching to avoid duplicate generations
- Budget tracking ($25 cap)
- Secure API key storage
- Automatic image upload to Firebase Storage

## Setup

### 1. Install Dependencies

```bash
cd functions
npm install
```

### 2. Configure Gemini API Key

For Firebase Functions v2, set the Gemini API key using a `.env` file:

Create `functions/.env`:
```
GEMINI_API_KEY=your_actual_api_key_here
```

**Important**: The `.env` file is gitignored for security. Make sure to set this on any machine where you deploy.

Get your Gemini API key from: https://aistudio.google.com/app/apikey

**For Production**: Consider using Google Cloud Secret Manager for enhanced security:
```bash
firebase functions:secrets:set GEMINI_API_KEY
```

### 3. Build the Functions

```bash
npm run build
```

### 4. Test Locally (Optional)

Run the Firebase emulator suite:

```bash
npm run serve
```

Then update `src/services/firebase.ts` to uncomment the emulator connection line:
```typescript
connectFunctionsEmulator(functions, 'localhost', 5001);
```

### 5. Deploy to Production

```bash
npm run deploy
```

Or deploy all Firebase services at once from the project root:
```bash
firebase deploy
```

## Function Details

### `generateMenuImage(data, context)`

**Parameters:**
- `menuTitle: string` - The menu name/title
- `groupId: string` - The group ID to validate membership
- `userName: string` - The user requesting the image

**Returns:**
```typescript
{
  imageUrl: string | null;  // Generated/cached image URL
  cached: boolean;          // Whether image was from cache
  budgetExceeded: boolean;  // Whether budget cap was reached
  error?: string;           // Error message if generation failed
}
```

**Security:**
- Validates that `userName` is a member of `groupId` before generating
- API key is never exposed to the client
- Budget tracking prevents excessive API usage

## Development

### Project Structure

```
functions/
├── src/
│   └── index.ts          # Main function definitions
├── lib/                  # Compiled JavaScript (gitignored)
├── node_modules/         # Dependencies (gitignored)
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
└── .gitignore           # Git ignore rules
```

### TypeScript

This project uses TypeScript with strict mode enabled. Run the compiler in watch mode during development:

```bash
npm run build:watch
```

### Logs

View function logs:

```bash
npm run logs
```

Or via Firebase Console: https://console.firebase.google.com/ → Functions → Logs

## Troubleshooting

### "Gemini API key not configured" error

Make sure you've set the `GEMINI_API_KEY` environment variable as described in Setup step 2.

### Budget cap reached

If the budget cap ($25) is reached, the function will return `budgetExceeded: true`. To reset:

1. Go to Firestore in Firebase Console
2. Navigate to `globalStats/imageGeneration`
3. Update or delete the document

### Group membership validation failing

Ensure:
1. The `groupId` exists in Firestore
2. The `userName` matches a member in the group's `members` array
3. Member names are stored consistently (case-sensitive)
