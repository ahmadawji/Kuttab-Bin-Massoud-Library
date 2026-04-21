import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import multer from 'multer';
import { GoogleGenAI } from '@google/genai';
import cookieParser from 'cookie-parser';
import { google } from 'googleapis';

// The spreadsheet API logic will be moved to separate endpoints
async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(cookieParser());
  
  // Storage for multer array
  const upload = multer({ storage: multer.memoryStorage() });

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Helper to ensure dynamic host resolution
  function getRedirectUri(req: express.Request) {
    const host = req.headers['x-forwarded-host'] || req.get('host');
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    return `${protocol}://${host}/auth/callback`;
  }

  // Check if OAuth is configured
  app.get('/api/auth/status', (req, res) => {
    const isConfigured = !!(process.env.OAUTH_CLIENT_ID && process.env.OAUTH_CLIENT_SECRET);
    res.json({ configured: isConfigured });
  });

  // Get Auth URL
  app.get('/api/auth/url', (req, res) => {
    const origin = (req.query.origin as string) || getRedirectUri(req).replace('/auth/callback', '');
    const redirectUri = `${origin}/auth/callback`;
    const oauth2Client = new google.auth.OAuth2(
      process.env.OAUTH_CLIENT_ID,
      process.env.OAUTH_CLIENT_SECRET,
      redirectUri
    );

    const scopes = [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/spreadsheets'
    ];

    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      state: origin // Pass origin in state to use later in callback
    });

    res.json({ url });
  });

  // Auth callback
  app.get(['/auth/callback', '/auth/callback/'], async (req, res) => {
    const { code, state } = req.query;
    try {
      const origin = (state as string) || getRedirectUri(req).replace('/auth/callback', '');
      const redirectUri = `${origin}/auth/callback`;
      const oauth2Client = new google.auth.OAuth2(
        process.env.OAUTH_CLIENT_ID,
        process.env.OAUTH_CLIENT_SECRET,
        redirectUri
      );
      
      const { tokens } = await oauth2Client.getToken(code as string);
      
      // Store token in a secure HttpOnly cookie
      res.cookie('g_tokens', JSON.stringify(tokens), {
        secure: true,
        sameSite: 'none',
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
      });

      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Authentication successful. This window should close automatically.</p>
          </body>
        </html>
      `);
    } catch (e) {
      console.error(e);
      res.status(500).send('Authentication failed.');
    }
  });

  // Auth status for frontend
  app.get('/api/auth/me', async (req, res) => {
    try {
      const tokensStr = req.cookies.g_tokens;
      if (!tokensStr) return res.status(401).json({ error: 'Not authenticated' });
      
      const tokens = JSON.parse(tokensStr);
      const oauth2Client = new google.auth.OAuth2(process.env.OAUTH_CLIENT_ID, process.env.OAUTH_CLIENT_SECRET);
      oauth2Client.setCredentials(tokens);

      const oauth2 = google.oauth2({ auth: oauth2Client, version: 'v2' });
      const userInfo = await oauth2.userinfo.get();
      res.json(userInfo.data);
    } catch (e) {
      res.status(401).json({ error: 'Invalid tokens' });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('g_tokens', { secure: true, sameSite: 'none', httpOnly: true });
    res.json({ success: true });
  });

  // Get books from Google Sheets
  app.get('/api/books', async (req, res) => {
    try {
      const sheetId = req.query.sheetId || process.env.GOOGLE_SHEETS_ID;
      if (!sheetId) return res.status(400).json({ error: 'No Sheet ID provided' });

      const tokensStr = req.cookies.g_tokens;
      if (!tokensStr) return res.status(401).json({ error: 'Not authenticated' });
      
      const tokens = JSON.parse(tokensStr);
      const oauth2Client = new google.auth.OAuth2(process.env.OAUTH_CLIENT_ID, process.env.OAUTH_CLIENT_SECRET);
      oauth2Client.setCredentials(tokens);

      const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
      
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId as string,
        range: 'A2:G', // Removed Sheet1! to use default first sheet regardless of language
      });

      const rows = response.data.values || [];
      const books = rows.map((row, index) => ({
        id: index + 2, // Row number in sheet (used for update/delete)
        name: row[0] || '',
        author: row[1] || '',
        publisher: row[2] || '',
        investigator: row[3] || '',
        classification: row[4] || '',
        volumes: row[5] || '',
        notes: row[6] || ''
      }));

      res.json(books);
    } catch (error: any) {
      const googleErrorMsg = error?.response?.data?.error?.message;
      console.error("Sheets GET Error:", googleErrorMsg || error?.response?.data || error);
      res.status(500).json({ error: googleErrorMsg || error?.message || 'Failed to fetch from sheets.' });
    }
  });

  // Add Book
  app.post('/api/books', async (req, res) => {
    try {
      const sheetId = req.body.sheetId || process.env.GOOGLE_SHEETS_ID;
      if (!sheetId) return res.status(400).json({ error: 'No Sheet ID provided' });

      const tokensStr = req.cookies.g_tokens;
      if (!tokensStr) return res.status(401).json({ error: 'Not authenticated' });
      
      const tokens = JSON.parse(tokensStr);
      const oauth2Client = new google.auth.OAuth2(process.env.OAUTH_CLIENT_ID, process.env.OAUTH_CLIENT_SECRET);
      oauth2Client.setCredentials(tokens);

      const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
      
      const { name, author, publisher, investigator, classification, volumes, notes } = req.body.book;

      await sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: 'A:G',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[name, author, publisher, investigator, classification, volumes, notes]]
        }
      });

      res.json({ success: true });
    } catch (error: any) {
      const googleErrorMsg = error?.response?.data?.error?.message;
      console.error("Sheets POST Error:", googleErrorMsg || error?.response?.data || error);
      res.status(500).json({ error: googleErrorMsg || error?.message || 'Failed to add book.' });
    }
  });

  // Update Book
  app.put('/api/books/:rowId', async (req, res) => {
    try {
      const sheetId = req.body.sheetId || process.env.GOOGLE_SHEETS_ID;
      const rowId = req.params.rowId;
      if (!sheetId) return res.status(400).json({ error: 'No Sheet ID provided' });

      const tokensStr = req.cookies.g_tokens;
      if (!tokensStr) return res.status(401).json({ error: 'Not authenticated' });
      
      const tokens = JSON.parse(tokensStr);
      const oauth2Client = new google.auth.OAuth2(process.env.OAUTH_CLIENT_ID, process.env.OAUTH_CLIENT_SECRET);
      oauth2Client.setCredentials(tokens);

      const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
      
      const { name, author, publisher, investigator, classification, volumes, notes } = req.body.book;

      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `A${rowId}:G${rowId}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[name, author, publisher, investigator, classification, volumes, notes]]
        }
      });

      res.json({ success: true });
    } catch (error: any) {
      const googleErrorMsg = error?.response?.data?.error?.message;
      console.error("Sheets PUT Error:", googleErrorMsg || error?.response?.data || error);
      res.status(500).json({ error: googleErrorMsg || error?.message || 'Failed to update book.' });
    }
  });

  // Delete Book (Clear Row)
  app.delete('/api/books/:rowId', async (req, res) => {
    try {
      const sheetId = req.headers['x-sheet-id'] || process.env.GOOGLE_SHEETS_ID;
      const rowId = req.params.rowId;
      if (!sheetId) return res.status(400).json({ error: 'No Sheet ID provided' });

      const tokensStr = req.cookies.g_tokens;
      if (!tokensStr) return res.status(401).json({ error: 'Not authenticated' });
      
      const tokens = JSON.parse(tokensStr);
      const oauth2Client = new google.auth.OAuth2(process.env.OAUTH_CLIENT_ID, process.env.OAUTH_CLIENT_SECRET);
      oauth2Client.setCredentials(tokens);

      const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
      
      // We use clear instead of delete to avoid shifting rows and changing other row IDs
      await sheets.spreadsheets.values.clear({
        spreadsheetId: sheetId as string,
        range: `A${rowId}:G${rowId}`
      });

      res.json({ success: true });
    } catch (error: any) {
      const googleErrorMsg = error?.response?.data?.error?.message;
      console.error("Sheets DELETE Error:", googleErrorMsg || error?.response?.data || error);
      res.status(500).json({ error: googleErrorMsg || error?.message || 'Failed to delete book.' });
    }
  });

  // Example route for extracting book details from an image cover
  app.post('/api/books/extract', upload.single('cover'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No image provided' });
      }

      let currentGeminiKey = process.env.GEMINI_API_KEY;
      
      // Fallback: Check if user pasted it directly into .env.example
      try {
        const envExamplePath = path.join(process.cwd(), '.env.example');
        if (require('fs').existsSync(envExamplePath)) {
          const envExample = require('fs').readFileSync(envExamplePath, 'utf8');
          const match = envExample.match(/GEMINI_API_KEY=["']?(AIza[a-zA-Z0-9-_]+)["']?/);
          if (match && match[1]) {
            currentGeminiKey = match[1];
          }
        }
      } catch (e) {
        // Ignore read errors
      }

      if (!currentGeminiKey) {
        throw new Error('مفتاح الذكاء الاصطناعي (Gemini API Key) غير متوفر في النظام. الرجاء التحقق من قائمة Settings -> Secrets.');
      }

      // Initialize Gemini locally inside the request to ensure latest env var is used
      const ai = new GoogleGenAI({ apiKey: currentGeminiKey });

      const base64EncodeString = req.file.buffer.toString('base64');
      
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            inlineData: {
              mimeType: req.file.mimetype,
              data: base64EncodeString,
            },
          },
          "Extract the book details from this cover image. Focus on: Book Name, Author, Publisher, and Classification (e.g., History, Literature). If you can't determine something, leave it blank."
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: 'OBJECT',
            properties: {
              bookName: { type: 'STRING' },
              author: { type: 'STRING' },
              publisher: { type: 'STRING' },
              classification: { type: 'STRING' },
            },
          },
        },
      });

      const jsonStr = response.text?.trim();
      if (!jsonStr) {
        return res.status(500).json({ error: 'Failed to extract text' });
      }

      const extractedData = JSON.parse(jsonStr);
      res.json(extractedData);
    } catch (error: any) {
      console.error("Gemini Error:", error);
      
      const status = error.status || error?.response?.status;
      if (status === 429) {
        return res.status(429).json({ error: 'عفواً، لقد تجاوزت الحد المسموح به مجاناً من جوجل (Quota Exceeded)، أو أن مفتاحك لا يحتوي على خطة دفع نشطة.' });
      }
      
      if (error.message?.includes('API_KEY_INVALID') || status === 400) {
        return res.status(400).json({ error: 'مفتاح الذكاء الاصطناعي (API Key) غير صالح.' });
      }

      res.status(500).json({ error: error.message || 'Error parsing image' });
    }
  });

  // Integrate Vite as middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // Since Express v4 is installed (checked package.json), we use '*'
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
