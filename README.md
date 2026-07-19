# How We Built the Kuttab Library App

A 4-day beginner-friendly technical series.

This project is a full-stack Arabic library manager that:

- Uses React + TypeScript on the frontend.
- Uses Express + TypeScript on the backend.
- Stores books in Google Sheets instead of a traditional database.
- Supports Google OAuth login for secure editing.
- Supports guest mode for read-only browsing.
- Uses an AI vision model to extract book details from a cover image.

If you are learning full-stack development, this project is a great real-world example because it combines UI, authentication, API design, third-party integration, and production build strategy.

---

## Series Overview

- Day 1: Project architecture and frontend foundation
- Day 2: Authentication, Google Sheets CRUD, and state flow
- Day 3: AI image extraction, error handling, and production build
- Day 4: Deploying the app to Render (production hosting)

---

## Day 1: Foundation and Frontend Architecture

### 1) What we are building

We need a system to manage library books with Arabic-first UX.

Core user stories:

- As a user, I can view books.
- As an authenticated admin, I can add, edit, and delete books.
- As a guest, I can only browse (no write actions).
- As an admin, I can upload a book cover and auto-fill fields with AI.

### 2) Why this stack

The project uses Vite + React + TypeScript because it gives:

- Fast startup and hot updates in development.
- Type safety for data structures like `Book`.
- Clean component organization.

On the backend, Express is used because:

- OAuth and cookies are easier to control on a server.
- Sensitive tokens stay server-side.
- It can proxy and secure third-party API calls.

### 3) Frontend entry and app shell

The React app starts in `src/main.tsx` and renders `App` inside `StrictMode`.

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<App />
	</StrictMode>,
);
```

Then `App` controls major app states:

- `checking` backend config
- `configured` vs `unconfigured`
- authenticated user vs guest mode

This is a very important beginner concept:

Instead of rendering everything all the time, render based on **state gates**. Each gate decides which screen appears next.

```tsx
const [configStatus, setConfigStatus] = useState<
	"checking" | "configured" | "unconfigured"
>("checking");
const [user, setUser] = useState<any>(null);
const [isGuestMode, setIsGuestMode] = useState(false);

if (configStatus === "checking") {
	return <LoadingScreen />;
}
if (configStatus === "unconfigured") {
	return <SetupScreen />;
}
if (!user && !isGuestMode) {
	return <LoginScreen />;
}
return <LibraryManager isReadOnly={!user} />;
```

### 4) UI states as a finite flow

The app has a simple but powerful flow:

1. Check `/api/auth/status` to confirm server OAuth setup.
2. Check `/api/auth/me` to know if user is logged in.
3. If not configured: show setup instructions.
4. If configured but not logged in: show login screen or guest option.
5. If logged in or guest: show `LibraryManager`.

This pattern is close to a finite state machine. Beginners can think of it as:

`App state -> Allowed screen`

```text
checking      -> loading spinner
unconfigured  -> setup instructions
configured + anonymous -> login/guest screen
configured + user/guest -> library manager
```

### 5) Arabic-first design and theming

The page is RTL (`lang="ar" dir="rtl"`) and themed via CSS variables.

```html
<html lang="ar" dir="rtl">
```

```css
:root {
	--brand-bg: #f6f0e4;
	--brand-surface: #fffdf8;
	--brand-primary: #0f6b57;
	--brand-ink: #1f2a24;
}

body {
	background-color: var(--brand-bg);
	color: var(--brand-ink);
}
```

Why this matters:

- RTL support is not just text direction, it affects spacing and component alignment.
- CSS variables allow consistent branding across components.
- A shared design language keeps forms, buttons, and cards coherent.

### 6) Local persistence for better UX

The app stores:

- Guest mode in `localStorage`.
- Last used Sheet ID in `localStorage`.

This means refreshes do not destroy user context.

Important learning: persistence does not always require a backend database. Small UX state can live safely in browser storage.

```ts
// Save once user chooses guest mode
localStorage.setItem("guestMode", "true");

// Restore on next page load
const isGuestMode = localStorage.getItem("guestMode") === "true";
```

### Day 1 recap

By the end of Day 1, you should understand:

- How frontend routes/screens can be controlled by state.
- How to structure React components by responsibility.
- Why localization + direction + theme tokens should be planned early.

---

## Day 2: OAuth + Google Sheets CRUD + Data Flow

### 1) Why Google Sheets as database

For small organizations, Google Sheets offers:

- Very low setup cost.
- Easy manual review and editing.
- Familiar interface for non-developers.

Tradeoff: you must carefully map rows and columns in code.

### 2) OAuth flow end-to-end

The backend provides OAuth endpoints:

- `GET /api/auth/status` -> Is OAuth configured?
- `GET /api/auth/url` -> Generate Google login URL.
- `GET /auth/callback` -> Exchange code for tokens.
- `GET /api/auth/me` -> Read user info from stored cookie.
- `POST /api/auth/logout` -> Clear auth cookie.

Tokens are stored in an HttpOnly cookie (`g_tokens`).

```ts
// server.ts (callback)
const { tokens } = await oauth2Client.getToken(code as string);

res.cookie("g_tokens", JSON.stringify(tokens), {
	secure: true,
	sameSite: "none",
	httpOnly: true,
	maxAge: 30 * 24 * 60 * 60 * 1000,
});
```

Auth URL generation example:

```ts
app.get("/api/auth/url", (req, res) => {
	const oauth2Client = new google.auth.OAuth2(
		process.env.OAUTH_CLIENT_ID,
		process.env.OAUTH_CLIENT_SECRET,
		`${origin}/auth/callback`,
	);

	const url = oauth2Client.generateAuthUrl({
		access_type: "offline",
		scope: [
			"https://www.googleapis.com/auth/userinfo.profile",
			"https://www.googleapis.com/auth/userinfo.email",
			"https://www.googleapis.com/auth/spreadsheets",
		],
		prompt: "consent",
	});

	res.json({ url });
});
```

Why HttpOnly matters:

- JavaScript in the browser cannot read HttpOnly cookies.
- This reduces token theft risk via frontend XSS.

### 3) OAuth popup reliability concept

The frontend login uses a popup, plus multiple completion signals:

- `postMessage` from popup to opener.
- `localStorage` event fallback.
- Polling `popup.closed` as final fallback.

This is an advanced real-world fix. In some deployments, opener messaging alone is unreliable due to browser isolation/security behavior.

```tsx
// App.tsx (simplified)
window.addEventListener("message", handleMessage);
window.addEventListener("storage", handleStorage);

popupCheckTimer = window.setInterval(() => {
	if (popup && popup.closed) {
		completeLogin();
	}
}, 700);
```

### 4) Book model and row mapping

`Book` is defined as a TypeScript interface. Backend maps sheet row cells `A..K` to object fields:

- `name`, `author`, `publisher`, `investigator`, `classification`, `volumes`, `edition`, `code`, `notes`, `coverType`, `dateInserted`

Concept to learn:

- Frontend and backend must agree on one contract.
- TypeScript interfaces on frontend should mirror backend payload shape.

```ts
export interface Book {
	id: number;
	name: string;
	author: string;
	publisher: string;
	investigator: string;
	classification: string;
	volumes: string;
	edition: string;
	code: string;
	notes: string;
	coverType: string;
	dateInserted: string;
}
```

### 5) CRUD endpoints for books

Backend book endpoints:

- `GET /api/books` -> read rows and map to books
- `POST /api/books` -> append a new row
- `PUT /api/books/:rowId` -> update exact row
- `DELETE /api/books/:rowId` -> clear row range

Notice delete behavior: row is cleared instead of removed.

Why? Removing a row shifts indexes and can break row-based IDs in UI. Clearing keeps positional consistency.

```ts
// GET books from sheet
app.get("/api/books", async (req, res) => {
	const response = await sheets.spreadsheets.values.get({
		spreadsheetId: sheetId,
		range: "A2:K",
	});

	const books = (response.data.values || []).map((row, index) => ({
		id: index + 2,
		name: row[0] || "",
		author: row[1] || "",
		// ...A..K mapping
	}));

	res.json(books);
});

// DELETE book row safely by clearing cells instead of deleting row
app.delete("/api/books/:rowId", async (req, res) => {
	await sheets.spreadsheets.values.clear({
		spreadsheetId: sheetId,
		range: `A${req.params.rowId}:K${req.params.rowId}`,
	});
	res.json({ success: true });
});
```

### 6) Guest mode authorization model

The app supports two data access paths:

- Authenticated path: OAuth tokens allow read/write.
- Guest path: optional API key allows read-only access.

This separation is excellent for beginners to learn role-aware UX:

- UI hides action buttons in read-only mode.
- Backend still enforces auth for write endpoints.
- Never depend on frontend-only restrictions for security.

```tsx
{isReadOnly ? (
	<span>وضع الزائر (عرض فقط)</span>
) : (
	<button onClick={() => setIsModalOpen(true)}>إضافة كتاب</button>
)}
```

### 7) Search, filtering, and pagination

Frontend performs:

- Client-side filtering by multiple fields.
- Sort by newest `dateInserted`.
- Pagination (`itemsPerPage = 20`).

This is enough for small-to-medium datasets and keeps code simple.

```ts
const filteredBooks = books
	.filter((b) =>
		b.name.includes(searchQuery) ||
		b.author.includes(searchQuery) ||
		b.classification.includes(searchQuery),
	)
	.sort(
		(a, b) =>
			new Date(b.dateInserted).getTime() - new Date(a.dateInserted).getTime(),
	);

const itemsPerPage = 20;
const startIndex = (currentPage - 1) * itemsPerPage;
const paginatedBooks = filteredBooks.slice(startIndex, startIndex + itemsPerPage);
```

### Day 2 recap

By the end of Day 2, you should understand:

- Complete OAuth flow with secure cookie usage.
- How to integrate a spreadsheet as storage.
- How to design full-stack CRUD with clear data contracts.
- Why authorization must be enforced both in backend and UI behavior.

---

## Day 3: AI Cover Extraction + Error Handling + Production Build

### 1) AI extraction feature goal

In `BookFormModal`, user can upload/scan a cover image.

Frontend sends multipart form data to:

- `POST /api/books/extract`

Backend uses `multer` memory storage to receive file bytes, converts image to base64, then calls OpenRouter with a vision-capable model.

```tsx
// BookFormModal.tsx (frontend)
const formDataPayload = new FormData();
formDataPayload.append("cover", file);

const res = await fetch("/api/books/extract", {
	method: "POST",
	body: formDataPayload,
});

const data = await res.json();
setFormData((prev) => ({
	...prev,
	name: data.name || prev.name,
	author: data.author || prev.author,
}));
```

### 2) Prompt design for structured extraction

The backend prompt asks AI to output strict JSON with fields matching the book form.

Critical prompt engineering ideas used here:

- Clear schema definition.
- Rules for nulls and unreadable text.
- No extra text around JSON.
- Preserve original Arabic text.

This reduces parsing errors and post-processing complexity.

```ts
// server.ts prompt strategy (conceptual)
const promptRules = [
	"Return valid JSON only",
	"Preserve original Arabic text",
	"Use null for missing/illegible fields",
	"Do not add extra commentary",
];
```

### 3) Streaming response handling

OpenRouter returns streamed chunks. Backend concatenates chunks into one response string, then extracts JSON and parses it.

Concept to learn:

- Streams improve latency and UX for AI calls.
- But you still need defensive parsing before `JSON.parse`.

```ts
const stream = await openrouter.chat.send({
	chatRequest: { model: "google/gemini-3-flash-preview", messages, stream: true },
});

let fullResponse = "";
for await (const chunk of stream) {
	const content = chunk.choices[0]?.delta?.content;
	if (content) fullResponse += content;
}

const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
const extractedData = JSON.parse(jsonMatch ? jsonMatch[0] : fullResponse);
```

### 4) Practical AI error handling

The backend handles multiple error categories:

- Missing API key.
- Rate limits (`429`).
- Bad requests (`400`).
- Other provider errors (`4xx`/`5xx`).

It also inspects vendor-specific metadata for clearer messages.

This is production-minded behavior. Beginners often only return `500`, which makes debugging difficult.

```ts
if (statusCode === 429) {
	return res.status(429).json({
		error: "الخدمة مزدحمة الآن. حاول مرة أخرى بعد قليل.",
	});
}

if (statusCode === 400) {
	return res.status(400).json({
		error: "تعذر معالجة الصورة. تحقق من نوع الملف وجودته.",
	});
}
```

### 5) Build and runtime strategy

Scripts show a hybrid build approach:

- `vite build` for frontend bundle
- `esbuild` for `server.ts` into CommonJS output

At runtime:

- Dev mode: Express mounts Vite middleware.
- Production: Express serves static files from `dist` and falls back to `index.html` for SPA routing.

This unifies frontend and backend behind one server process.

```json
{
	"scripts": {
		"dev": "tsx server.ts",
		"build": "vite build && esbuild server.ts --bundle --platform=node --target=node18 --outfile=dist/server.cjs --format=cjs --external:express --external:vite",
		"start": "node dist/server.cjs"
	}
}
```

### 6) Environment variables you need

Typical `.env` keys for this app:

```env
OAUTH_CLIENT_ID=...
OAUTH_CLIENT_SECRET=...
GOOGLE_SHEETS_ID=...
GOOGLE_API_KEY=...            # optional for guest read-only access
OPENROUTER_API_KEY=...
```

Learning point:

- Separate secrets and configuration from source code.
- Validate required env vars at startup where possible.

### Day 3 recap

By the end of Day 3, you should understand:

- How to wire AI-powered OCR/extraction into a form workflow.
- How to design reliable backend error responses.
- How to package a full-stack TypeScript app for production.

---

## Day 4: Deploying This App to Render

This day explains how to put this exact project online using Render.

### 1) Understand what gets deployed

This project is a single Node web service in production:

- Express serves API routes.
- Express also serves the built frontend from `dist`.

That means on Render you only need one Web Service, not separate frontend/backend services.

### 2) Prepare the server for Render port binding

Render provides the port via `process.env.PORT`.

In `server.ts`, use:

```ts
const PORT = Number(process.env.PORT || 3001);
```

```ts
app.listen(PORT, "0.0.0.0", () => {
	console.log(`Server running on http://localhost:${PORT}`);
});
```

Why this is required:

- Locally, `3001` is fine.
- In Render, hardcoding a port can cause health check failures because the platform expects your app to listen on the assigned port.

### 3) Push project to GitHub

Render usually deploys from a Git repository.

Basic flow:

1. Create a GitHub repository.
2. Push this project.
3. Confirm `package.json` scripts are available:
	 - `npm run build`
	 - `npm start`

This project already has suitable scripts for Render-style deployment.

### 4) Create Web Service on Render

In Render dashboard:

1. Click New + -> Web Service.
2. Connect your GitHub repo.
3. Configure:
	 - Environment: `Node`
	 - Build Command: `npm install && npm run build`
	 - Start Command: `npm start`
4. Choose region and instance type.
5. Create the service.

Render will build and assign a URL like:

`https://your-service-name.onrender.com`

Example Render configuration values:

```yaml
Environment: Node
Build Command: npm install && npm run build
Start Command: npm start
Auto-Deploy: Yes
```

### 5) Add environment variables in Render

In Render service settings, add the same variables your app uses:

```env
OAUTH_CLIENT_ID=...
OAUTH_CLIENT_SECRET=...
GOOGLE_SHEETS_ID=...
GOOGLE_API_KEY=...            # optional for guest read-only mode
OPENROUTER_API_KEY=...
NODE_ENV=production
```

Important:

- Never commit `.env` to Git.
- Keep secrets only in Render Environment settings.

### 6) Update Google OAuth for production domain

Your OAuth app must allow Render callback URL.

In Google Cloud Console -> Credentials -> OAuth Client:

1. Add Authorized redirect URI:
	 - `https://your-service-name.onrender.com/auth/callback`
2. Keep local dev redirect too if needed:
	 - `http://localhost:3001/auth/callback`

If this is not configured, login will fail after Google redirects back.

```text
Authorized Redirect URIs
- http://localhost:3001/auth/callback
- https://your-service-name.onrender.com/auth/callback
```

### 7) Verify cookie and HTTPS behavior

The app stores tokens using secure cookies (`secure: true`, `sameSite: none`).

That works correctly on Render because Render uses HTTPS. This is one reason deployment is safer than running plain HTTP in production.

### 8) Post-deploy smoke test checklist

After first successful deploy, test in this order:

1. Open `/api/health` -> should return `{ status: "ok" }`.
2. Open app homepage -> UI loads.
3. Click Google login -> auth completes and returns to app.
4. Confirm `/api/auth/me` returns user profile when logged in.
5. Fetch books from sheet.
6. Add/edit/delete a book.
7. Upload a cover image and confirm AI extraction works.

```bash
# quick checks
curl https://your-service-name.onrender.com/api/health
```

### 9) Common Render deployment issues and fixes

- Issue: App deploys but health check fails.
	Fix: Ensure server listens on `process.env.PORT`.

- Issue: OAuth succeeds on Google but app says auth failed.
	Fix: Check authorized redirect URI exactly matches Render domain and path.

- Issue: Guest mode cannot read books.
	Fix: Add `GOOGLE_API_KEY` or make sheet readable with link.

- Issue: AI extraction returns provider errors.
	Fix: Verify `OPENROUTER_API_KEY`, monitor rate limits, and inspect backend error logs.

### Day 4 recap

By the end of Day 4, you should understand:

- How to deploy a full-stack Vite + Express app as one Render Web Service.
- How to configure build/start commands and environment secrets.
- How to correctly wire OAuth callback URLs for production.
- How to troubleshoot the first wave of deployment issues.

---

## Full Architecture (Mental Model)

Use this simple mental map:

1. Browser renders React UI.
2. UI calls Express API routes.
3. Express handles auth/session and talks to external services.
4. Google Sheets stores structured book rows.
5. OpenRouter model enriches input by extracting metadata from images.

This is the key full-stack principle:

- Frontend handles interaction and rendering.
- Backend handles trust boundaries and integrations.
- External services provide storage and intelligence.

---

## What Beginners Should Build Next

After understanding this project, try these upgrades:

1. Add input validation with a shared schema (for example, Zod) on both frontend and backend.
2. Add a small audit log sheet for create/update/delete tracking.
3. Add optimistic UI updates for faster perceived performance.
4. Add automated tests for API routes and component states.
5. Add role levels (viewer/editor/admin) instead of only guest/authenticated.

---

## Final Takeaway

This app is a strong beginner-to-intermediate blueprint because it teaches practical engineering decisions, not only syntax.

You learn how to:

- Build UI state flows that match real user journeys.
- Keep tokens secure with backend-managed cookies.
- Use Google Sheets as an operational datastore.
- Integrate AI safely with strict output contracts.
- Ship with a production-ready build pipeline.

If you can rebuild this project from scratch while explaining each choice, you are already thinking like a full-stack engineer.