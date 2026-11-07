// Lightweight zero-dependency Local Development Server & Gemini Backend Proxy
// for Odisha Exam Prep Admin Panel
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { exec } = require('child_process');

let whatsappService = null;
try {
  whatsappService = require('./whatsapp-service.js');
} catch (e) {
  console.warn('WhatsApp service module notice:', e.message);
}

const PORT = process.env.PORT || 5000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const CONFIG_FILE = path.join(__dirname, 'backend-config.json');

// MIME types for static asset serving
const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.js': 'text/javascript; charset=UTF-8',
  '.mjs': 'text/javascript; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

// Load or initialize backend configuration
function loadBackendConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.warn('Could not read backend-config.json:', e.message);
  }
  return {
    geminiApiKey: process.env.GEMINI_API_KEY || "",
    model: "gemini-3.8-flash"
  };
}

function saveBackendConfig(config) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('Failed to save backend-config.json:', e.message);
    return false;
  }
}

// Convert title to a clean Firestore document ID / slug
function generateSlug(text) {
  if (!text) return "test_" + Date.now().toString().slice(-4);
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, '')
    .trim()
    .replace(/[\s-]+/g, '_')
    .slice(0, 32);
}

// High-CTR Odisha Competitive Exam SEO Title Generator (Built-in Algorithm)
function generateOfflineTitles({ roughTitle = "", examName = "", categoryName = "", testType = "", subjectName = "" }) {
  const currentYear = new Date().getFullYear();
  const baseSubject = subjectName && subjectName !== "All" ? subjectName : "";
  const rough = (roughTitle || "").trim();

  let baseExam = examName || categoryName || "Odisha Govt Exam";
  baseExam = baseExam.replace(/--.*--/g, '').trim();

  const suggestions = [];

  // Option 1: High CTR Exam Pattern
  let title1 = `${baseExam} ${currentYear} : Full Length Mock Test 01 (100% Exam Pattern)`;
  if (rough) title1 = `${baseExam} : ${rough} - Full Mock 01 (${currentYear})`;
  suggestions.push({
    type: "🔥 High CTR Mock",
    tag: "Most Popular",
    title: title1,
    slug: generateSlug(`${baseExam}_mock_01`),
    hook: "ପରୀକ୍ଷା ଢାଞ୍ଚା ଅନୁସାରେ ପ୍ରସ୍ତୁତ Full Length Test"
  });

  // Option 2: Target / Score Booster
  let title2 = `Target ${baseExam} : High Scoring Speed Test 01`;
  if (baseSubject) title2 = `${baseExam} : ${baseSubject} High Scoring Practice Test 01`;
  else if (rough) title2 = `Score Booster : ${baseExam} (${rough}) Practice 01`;
  suggestions.push({
    type: "🎯 Score Booster",
    tag: "High Scoring",
    title: title2,
    slug: generateSlug(`${baseExam}_speed_01`),
    hook: "କମ୍ ସମୟରେ ଅଧିକ ସ୍କୋର କରିବା ପାଇଁ ଅଭ୍ୟାସ ଟେଷ୍ଟ"
  });

  // Option 3: Topic / Subject Focused
  let topicName = baseSubject || rough || "General Studies & Aptitude";
  let title3 = `${baseExam} : ${topicName} Mastery Test (Top Expected MCQs)`;
  suggestions.push({
    type: "⚡ Subject Focus",
    tag: "Topic Wise",
    title: title3,
    slug: generateSlug(`${baseExam}_${topicName}_01`),
    hook: "ବିଷୟଭିତ୍ତିକ ସମ୍ପୂର୍ଣ୍ଣ ପ୍ରଶ୍ନୋତ୍ତର ସେଟ୍"
  });

  // Option 4: Previous Year Solved Paper Style
  let title4 = `${baseExam} Previous Year Question Paper (${currentYear - 1} Solved)`;
  if (testType === "Previous Year" || rough.toLowerCase().includes("pyq") || rough.toLowerCase().includes("previous")) {
    title4 = `${baseExam} Official PYQ Solved Paper (${currentYear - 1} Shift-1)`;
  }
  suggestions.push({
    type: "📜 Official PYQ",
    tag: "Previous Year",
    title: title4,
    slug: generateSlug(`${baseExam}_pyq_${currentYear - 1}`),
    hook: "ବିଗତ ବର୍ଷର ସଠିକ୍ ପ୍ରଶ୍ନ ଓ ଓଡ଼ିଆରେ ଉତ୍ତର ବିଶ୍ଳେଷଣ"
  });

  // Option 5: 100 Marks Selection Special
  let title5 = `Mission ${baseExam} ${currentYear} : Selection Special Test 01`;
  suggestions.push({
    type: "🏆 Selection Series",
    tag: "Exam Special",
    title: title5,
    slug: generateSlug(`${baseExam}_mission_${currentYear}`),
    hook: "ଅନ୍ତିମ ପର୍ଯ୍ୟାୟ ଚୟନ ପାଇଁ ସ୍ୱତନ୍ତ୍ର ଟେଷ୍ଟ"
  });

  return suggestions;
}

// Universal Question & Instruction Gap Formatter across all subjects
function formatQuestionTextWithGap(raw) {
  if (!raw || typeof raw !== 'string') return raw || '';
  
  // 1. Normalize linebreaks (convert literal '\n' string to actual newline)
  let text = raw.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n').replace(/\r\n/g, '\n').trim();

  // 2. Separate coded conditions: e.g. 'P * Q' means ... 'P / Q' means ...
  text = text.replace(/(')\s*(['][^']{1,25}[']\s*means\b)/gi, "$1\n$2");
  text = text.replace(/(")\s*(["][^"]{1,25}["]\s*means\b)/gi, "$1\n$2");

  // 3. Separate Statements and Conclusions blocks
  text = text.replace(/([^\n])\s*(Statements\s*:)/gi, "$1\n\n$2");
  text = text.replace(/([^\n])\s*(Conclusions\s*:)/gi, "$1\n\n$2");
  text = text.replace(/([^\n])\s*(\b[1-9]\s*[\.\)]\s*[A-Za-z])/g, "$1\n$2");
  text = text.replace(/([^\n])\s*(\b(?:I|II|III|IV|V|VI)\s*[\.\)]\s*[A-Za-z])/g, "$1\n$2");

  // 4. Direction / Instruction to Question gap (global match across standard question starters)
  const questionStarters = [
    'Which of the following',
    'Which one of the following',
    'Which equation',
    'Which statement',
    'Which option',
    'Which conclusion',
    'What is',
    'What will be',
    'What should',
    'What does',
    'How is',
    'How many',
    'How much',
    'Who among the following',
    'Who is',
    'Find the',
    'Calculate the',
    'Determine the',
    'Select the correct',
    'Choose the correct',
    'Identify the',
    'In which of the following',
    'When did',
    'Where is'
  ];

  const qStarterRegex = new RegExp('([.:\\\'\\\"\\?\\)])\\s+(' + questionStarters.join('|') + ')\\b', 'gi');
  text = text.replace(qStarterRegex, '$1\n\n$2');

  // 5. If question begins with "Read the following..." or "Direction..." or "Study the..."
  text = text.replace(/^(Read the following[^:\n]+:?|Direction\s*(?:\([^)]+\))?:?|Study the following[^:\n]+:?)\s*(?!\n)/i, "$1\n");

  // 6. For English vocabulary / analogy / grammar: "In the following question... Medicine : Patient..."
  text = text.replace(/^(In the following question[s]?,?[^.\n]+[.:])\s*([A-Za-z0-9])/i, "$1\n\n$2");

  // 7. Ensure clean spacing (no 3+ consecutive newlines)
  text = text.replace(/\n{3,}/g, '\n\n').trim();

  return text;
}

function sanitizeQuestionsList(list) {
  if (!Array.isArray(list)) return [];
  return list.map(q => {
    if (!q || typeof q !== 'object') return q;
    const qText = formatQuestionTextWithGap(q.questions || q.question || '');
    return {
      ...q,
      questions: qText,
      question: qText
    };
  });
}

// Call Gemini API on backend
async function callGeminiBackend(contents, generationConfig = {}) {
  const config = loadBackendConfig();
  const apiKey = config.geminiApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('NO_API_KEY');
  }

  const models = [
    config.model || "gemini-3.8-flash",
    "gemini-3.5-flash",
    "gemini-3.1-flash-lite",
    "gemini-flash-latest",
    "gemini-2.5-flash"
  ];
  let lastErr = null;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify({ contents, generationConfig })
      });

      if (res.ok) {
        const data = await res.json();
        return { model, data };
      } else {
        const errJson = await res.json().catch(() => ({}));
        lastErr = new Error(errJson.error?.message || `HTTP ${res.status}`);
      }
    } catch (e) {
      lastErr = e;
    }
  }

  throw lastErr || new Error('All Gemini model endpoints failed');
}

// Request Helper to read JSON body
function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 50 * 1024 * 1024) { // 50MB max limit
        reject(new Error('Body too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

// ==========================================
// GOOGLE FIREBASE & RAZORPAY CLOUD SYNC ENGINE
// ==========================================
const SERVICE_ACCOUNT_FILE = path.join(__dirname, 'service-account.json');
let cachedGoogleAccessToken = null;
let googleTokenExpiresAt = 0;

async function getGoogleAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  if (cachedGoogleAccessToken && googleTokenExpiresAt > now + 60) {
    return cachedGoogleAccessToken;
  }
  if (!fs.existsSync(SERVICE_ACCOUNT_FILE)) {
    throw new Error('service-account.json not found');
  }
  const sa = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_FILE, 'utf8'));
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const claim = Buffer.from(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: sa.token_uri,
    exp: now + 3600,
    iat: now
  })).toString('base64url');
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(header + '.' + claim);
  const sig = sign.sign(sa.private_key, 'base64url');
  const jwt = header + '.' + claim + '.' + sig;

  const res = await fetch(sa.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=' + jwt
  });
  const data = await res.json();
  if (!data.access_token) {
    throw new Error('Failed to obtain Google OAuth access token: ' + (data.error_description || JSON.stringify(data)));
  }
  cachedGoogleAccessToken = data.access_token;
  googleTokenExpiresAt = now + (data.expires_in || 3600);
  return cachedGoogleAccessToken;
}

function toFirestoreFields(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) {
      fields[k] = { nullValue: null };
    } else if (typeof v === 'string') {
      fields[k] = { stringValue: v };
    } else if (typeof v === 'number') {
      if (Number.isInteger(v)) fields[k] = { integerValue: v.toString() };
      else fields[k] = { doubleValue: v };
    } else if (typeof v === 'boolean') {
      fields[k] = { booleanValue: v };
    } else if (typeof v === 'object') {
      fields[k] = { stringValue: JSON.stringify(v) };
    }
  }
  return fields;
}

async function syncRazorpayToFirestore(count = 100) {
  const config = loadBackendConfig();
  const keyId = config.razorpayKeyId || process.env.RAZORPAY_KEY_ID || "rzp_live_T3XkyfH49mwdl8";
  const keySecret = config.razorpayKeySecret || process.env.RAZORPAY_KEY_SECRET || "";

  if (!keySecret) {
    throw new Error("RAZORPAY_KEY_SECRET_MISSING");
  }

  const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
  const rzpRes = await fetch(`https://api.razorpay.com/v1/payments?count=${count}`, {
    headers: { 'Authorization': authHeader }
  });
  const rzpData = await rzpRes.json();
  if (!rzpRes.ok) {
    throw new Error(rzpData.error?.description || "Razorpay API error");
  }
  const items = rzpData.items || [];
  if (items.length === 0) return { count: 0, synced: 0, items: [] };

  const writes = items.map(p => {
    const docData = {
      id: p.id,
      amount: p.amount || 0,
      currency: p.currency || 'INR',
      status: p.status || 'unknown',
      order_id: p.order_id || '',
      method: p.method || 'online',
      contact: p.contact || '',
      email: p.email || '',
      error_code: p.error_code || '',
      error_description: p.error_description || p.error_reason || '',
      created_at: p.created_at || Math.floor(Date.now() / 1000),
      synced_at: Math.floor(Date.now() / 1000)
    };
    return {
      update: {
        name: `projects/odisha-exam-prep-7ee0b/databases/(default)/documents/razorpay_transactions/${p.id}`,
        fields: toFirestoreFields(docData)
      }
    };
  });

  const token = await getGoogleAccessToken();
  const commitUrl = 'https://firestore.googleapis.com/v1/projects/odisha-exam-prep-7ee0b/databases/(default)/documents:commit';
  const commitRes = await fetch(commitUrl, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ writes })
  });
  const commitData = await commitRes.json();
  if (!commitRes.ok) {
    throw new Error('Firestore commit error: ' + JSON.stringify(commitData));
  }
  return {
    success: true,
    count: items.length,
    synced: commitData.writeResults?.length || items.length,
    items
  };
}

// Main HTTP Server
const server = http.createServer(async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-razorpay-key-id, x-razorpay-key-secret');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  // ==========================================
  // BACKEND API ROUTES (/api/...)
  // ==========================================

  // 1. Get/Set Backend Config
  if (pathname === '/api/config') {
    if (req.method === 'GET') {
      const config = loadBackendConfig();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        hasKey: Boolean(config.geminiApiKey),
        model: config.model || "gemini-3.8-flash",
        razorpayKeyId: config.razorpayKeyId || "rzp_live_T3XkyfH49mwdl8",
        hasRazorpaySecret: Boolean(config.razorpayKeySecret)
      }));
    } else if (req.method === 'POST') {
      try {
        const body = await readJsonBody(req);
        const current = loadBackendConfig();
        if (body.geminiApiKey !== undefined) current.geminiApiKey = body.geminiApiKey.trim();
        if (body.model) current.model = body.model;
        if (body.razorpayKeyId !== undefined) current.razorpayKeyId = body.razorpayKeyId.trim();
        if (body.razorpayKeySecret !== undefined) current.razorpayKeySecret = body.razorpayKeySecret.trim();
        saveBackendConfig(current);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: true }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: err.message }));
      }
    }
  }

  // 1b. Razorpay Payments API Proxy
  if (pathname === '/api/razorpay/payments' && req.method === 'GET') {
    const config = loadBackendConfig();
    let keyId = req.headers['x-razorpay-key-id'] || config.razorpayKeyId || process.env.RAZORPAY_KEY_ID || "rzp_live_T3XkyfH49mwdl8";
    let keySecret = req.headers['x-razorpay-key-secret'] || config.razorpayKeySecret || process.env.RAZORPAY_KEY_SECRET || "";

    // Also support Authorization header
    if ((!keyId || !keySecret) && req.headers['authorization'] && req.headers['authorization'].startsWith('Basic ')) {
      try {
        const decoded = Buffer.from(req.headers['authorization'].split(' ')[1], 'base64').toString('utf8');
        const [u, p] = decoded.split(':');
        if (u) keyId = u;
        if (p) keySecret = p;
      } catch (e) {}
    }

    if (!keySecret) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: "RAZORPAY_KEY_SECRET_MISSING" }));
    }

    const count = parsedUrl.searchParams.get('count') || '100';
    try {
      const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
      const rzpRes = await fetch(`https://api.razorpay.com/v1/payments?count=${count}`, {
        headers: { 'Authorization': authHeader }
      });
      const data = await rzpRes.json();
      res.writeHead(rzpRes.status, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(data));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: err.message }));
    }
  }

  // 1c. Razorpay to Firestore Cloud Sync API
  if (pathname === '/api/razorpay/sync' && (req.method === 'GET' || req.method === 'POST')) {
    try {
      const count = parseInt(parsedUrl.searchParams.get('count') || '100', 10);
      const result = await syncRazorpayToFirestore(count);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(result));
    } catch (err) {
      console.error('Razorpay sync error:', err.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: err.message }));
    }
  }

async function autoActivateUserInFirestore(payment, token) {
  try {
    const rawEmail = (payment.email || "").toLowerCase().trim();
    const rawContact = (payment.contact || "").toString().replace(/[^0-9]/g, "").slice(-10);
    const amountInRs = Math.round((payment.amount || 0) / 100);

    let targetUid = null;
    const projectId = "odisha-exam-prep-7ee0b";
    const userQueryUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;
    
    let filterField = rawEmail ? "email" : (rawContact ? "phoneNumber" : null);
    let filterVal = rawEmail || rawContact;
    
    if (filterField && filterVal) {
      const qRes = await fetch(userQueryUrl, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          structuredQuery: {
            from: [{ collectionId: "user" }],
            where: {
              fieldFilter: {
                field: { fieldPath: filterField },
                op: "EQUAL",
                value: { stringValue: filterVal }
              }
            },
            limit: 1
          }
        })
      });
      const qData = await qRes.json();
      if (Array.isArray(qData) && qData[0]?.document?.name) {
        const docPath = qData[0].document.name;
        targetUid = docPath.split("/").pop();
      }
    }

    if (targetUid) {
      let planMonths = amountInRs >= 80 ? 6 : (amountInRs >= 140 ? 12 : 1);
      let planTitle = amountInRs >= 80 ? "Half-Yearly Pass" : (amountInRs >= 140 ? "Yearly Pass" : "Monthly Pass");
      const now = new Date();
      const expiry = new Date(now.getTime() + planMonths * 30 * 24 * 60 * 60 * 1000);

      const updateUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/Users/${targetUid}?updateMask.fieldPaths=isPremium&updateMask.fieldPaths=amountPaid&updateMask.fieldPaths=planTitle&updateMask.fieldPaths=planMonths&updateMask.fieldPaths=purchaseDate&updateMask.fieldPaths=premiumExpiry&updateMask.fieldPaths=paymentId&updateMask.fieldPaths=lastPaymentId`;

      const fields = {
        isPremium: { booleanValue: true },
        amountPaid: { integerValue: String(amountInRs) },
        planTitle: { stringValue: planTitle },
        planMonths: { integerValue: String(planMonths) },
        paymentId: { stringValue: payment.id },
        lastPaymentId: { stringValue: payment.id },
        purchaseDate: { timestampValue: now.toISOString() },
        premiumExpiry: { timestampValue: expiry.toISOString() }
      };

      await fetch(updateUrl, {
        method: "PATCH",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ fields })
      });
      console.log(`[Auto-Activate] 🎉 Activated ${planTitle} in Users/${targetUid} for ${filterVal}!`);
    }
  } catch (e) {
    console.warn("[Auto-Activate Notice]:", e.message);
  }
}

  // 1d. Razorpay Payment Capture Endpoint (Convert Authorized -> Captured)
  if (pathname === '/api/razorpay/capture' && req.method === 'POST') {
    try {
      const body = await readJsonBody(req);
      const { paymentId, amount, currency = 'INR' } = body;
      if (!paymentId) throw new Error('paymentId is required');

      const config = loadBackendConfig();
      const keyId = config.razorpayKeyId || process.env.RAZORPAY_KEY_ID || "rzp_live_T3XkyfH49mwdl8";
      const keySecret = config.razorpayKeySecret || process.env.RAZORPAY_KEY_SECRET || "";

      if (!keySecret) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: "RAZORPAY_KEY_SECRET_MISSING" }));
      }

      const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
      const capturePayload = { currency };
      if (amount) capturePayload.amount = Math.round(Number(amount));

      const rzpRes = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}/capture`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(capturePayload)
      });
      const data = await rzpRes.json();
      if (!rzpRes.ok) {
        throw new Error(data.error?.description || data.error?.message || `HTTP ${rzpRes.status}`);
      }

      // Update in Firestore Cloud immediately
      try {
        const token = await getGoogleAccessToken();
        const docUrl = `https://firestore.googleapis.com/v1/projects/odisha-exam-prep-7ee0b/databases/(default)/documents/razorpay_transactions/${paymentId}?updateMask.fieldPaths=status&updateMask.fieldPaths=synced_at`;
        const updatedFields = toFirestoreFields({
          status: 'captured',
          synced_at: Math.floor(Date.now() / 1000)
        });
        await fetch(docUrl, {
          method: 'PATCH',
          headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ fields: updatedFields })
        });

        // Auto-activate user account in Users collection
        await autoActivateUserInFirestore(data, token);
      } catch (e) {
        console.warn('Firestore capture sync notice:', e.message);
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: true, payment: data }));
    } catch (err) {
      console.error('Razorpay capture error:', err.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: err.message }));
    }
  }

  // ==========================================
  // WHATSAPP QR AUTO-SENDER ENDPOINTS
  // ==========================================
  if (pathname === '/api/whatsapp/status' && req.method === 'GET') {
    if (!whatsappService) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ status: 'unavailable', error: 'WhatsApp service not initialized' }));
    }
    const status = whatsappService.getStatus();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: true, ...status }));
  }

  if (pathname === '/api/whatsapp/send' && req.method === 'POST') {
    if (!whatsappService) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: 'WhatsApp service not available' }));
    }
    try {
      const body = await readJsonBody(req);
      const { phone, message } = body;
      if (!phone || !message) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: false, error: 'Phone and message are required' }));
      }
      const sendResult = await whatsappService.sendMessage(phone, message);
      res.writeHead(sendResult.success ? 200 : 400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(sendResult));
    } catch (err) {
      console.error('WhatsApp send error:', err.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: err.message }));
    }
  }

  if (pathname === '/api/whatsapp/logout' && req.method === 'POST') {
    if (!whatsappService) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: true }));
    }
    try {
      const logoutRes = await whatsappService.logout();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(logoutRes));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: err.message }));
    }
  }

  // 2. SEO Title Suggestions Backend Endpoint
  if (pathname === '/api/gemini/suggest-titles' && req.method === 'POST') {
    try {
      const body = await readJsonBody(req);
      const { roughTitle = "", examName = "", categoryName = "", testType = "", subjectName = "" } = body;
      const currentYear = new Date().getFullYear();

      const prompt = `You are an SEO and test series expert for "Odisha Exam Prep", an app for Odisha exams (OSSSC, OSSC, OPSC, Teaching, Banking).
Generate 5 high-CTR, SEO-friendly test titles for competitive exams in Odisha.
Inputs:
- Keywords / Rough Title: "${roughTitle || 'Not provided'}"
- Exam: "${examName || 'Odisha Govt Exam'}"
- Category: "${categoryName || 'Competitive Exams'}"
- Test Type: "${testType || 'Mock Test'}"
- Subject: "${subjectName || 'General'}"
- Year: ${currentYear}

Rules:
1. Make titles attractive, clear, keyword-rich for mobile app students.
2. Provide a clean document slug (lowercase alphanumeric underscores, max 25 chars).
3. Provide a 1-line catchy Odia hook (ଓଡ଼ିଆ ଧାଡ଼ି).
4. Output STRICTLY as a valid JSON array of 5 objects with keys: "type", "tag", "title", "slug", "hook". No markdown fences.`;

      let suggestions = null;
      let source = "gemini";
      let modelUsed = "";

      try {
        const { model, data } = await callGeminiBackend(
          [{ parts: [{ text: prompt }] }],
          { temperature: 0.7, responseMimeType: "application/json" }
        );
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
        const cleanJson = text.replace(/^```json/i, '').replace(/```$/i, '').trim();
        suggestions = JSON.parse(cleanJson);
        modelUsed = model;
      } catch (geminiErr) {
        // Fallback to built-in algorithm
        console.warn('Backend Gemini API call failed, using built-in SEO engine:', geminiErr.message);
        suggestions = generateOfflineTitles({ roughTitle, examName, categoryName, testType, subjectName });
        source = "builtin_seo_engine";
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        source,
        model: modelUsed,
        suggestions
      }));
    } catch (err) {
      console.error('Error in /api/gemini/suggest-titles:', err);
      // Even on error, always return valid fallback titles so frontend never breaks
      const fallback = generateOfflineTitles({});
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ source: "fallback", suggestions: fallback }));
    }
  }

  // 3. AI Question Generation Backend Endpoint
  if (pathname === '/api/gemini/generate-questions' && req.method === 'POST') {
    try {
      const body = await readJsonBody(req);
      const { promptText } = body;
      if (!promptText) throw new Error('Missing promptText');

      const { model, data } = await callGeminiBackend(
        [{ parts: [{ text: promptText }] }],
        { responseMimeType: "application/json" }
      );

      let text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "[]";
      if (text.startsWith("```json")) text = text.replace(/^```json/, "").replace(/```$/, "").trim();
      else if (text.startsWith("```")) text = text.replace(/^```/, "").replace(/```$/, "").trim();

      const rawQuestions = JSON.parse(text);
      const questions = sanitizeQuestionsList(rawQuestions);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: true, model, questions }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: err.message }));
    }
  }

  // 4. Multimodal OCR Extractor Backend Endpoint
  if (pathname === '/api/gemini/extract-questions' && req.method === 'POST') {
    try {
      const body = await readJsonBody(req);
      const { promptText, base64File, fileMimeType } = body;

      const { model, data } = await callGeminiBackend(
        [{
          parts: [
            { text: promptText },
            { inlineData: { mimeType: fileMimeType, data: base64File } }
          ]
        }],
        { responseMimeType: "application/json" }
      );

      let text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "[]";
      if (text.startsWith("```json")) text = text.replace(/^```json/, "").replace(/```$/, "").trim();
      else if (text.startsWith("```")) text = text.replace(/^```/, "").replace(/```$/, "").trim();

      const rawQuestions = JSON.parse(text);
      const questions = sanitizeQuestionsList(rawQuestions);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: true, model, questions }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: err.message }));
    }
  }

  // 5. AI Text Formatter Backend Endpoint
  if (pathname === '/api/gemini/format-text' && req.method === 'POST') {
    try {
      const body = await readJsonBody(req);
      const { promptText } = body;

      const { model, data } = await callGeminiBackend(
        [{ parts: [{ text: promptText }] }],
        { responseMimeType: "application/json" }
      );

      let text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "[]";
      if (text.startsWith("```json")) text = text.replace(/^```json/, "").replace(/```$/, "").trim();
      else if (text.startsWith("```")) text = text.replace(/^```/, "").replace(/```$/, "").trim();

      const rawQuestions = JSON.parse(text);
      const questions = sanitizeQuestionsList(rawQuestions);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: true, model, questions }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: err.message }));
    }
  }

  // ==========================================
  // STATIC ASSET SERVING (/public/...)
  // ==========================================
  if (pathname === '/' || pathname === '') {
    pathname = '/index.html';
  }

  let safePath = path.normalize(path.join(PUBLIC_DIR, pathname));

  if (!safePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    return res.end('403 Forbidden');
  }

  if (!path.extname(safePath) && fs.existsSync(safePath + '.html')) {
    safePath += '.html';
  }

  fs.stat(safePath, (err, stats) => {
    if (err || !stats.isFile()) {
      const notFoundPath = path.join(PUBLIC_DIR, '404.html');
      if (fs.existsSync(notFoundPath)) {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=UTF-8' });
        return fs.createReadStream(notFoundPath).pipe(res);
      }
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('404 Not Found');
    }

    const ext = path.extname(safePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache'
    });

    fs.createReadStream(safePath).pipe(res);
  });
});

server.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log('===========================================================');
  console.log(`🚀 Odisha Exam Prep Admin Server & Gemini Backend Active!`);
  console.log(`🌐 Local URL: ${url}`);
  console.log(`📂 Public Dir: ${PUBLIC_DIR}`);
  console.log(`💳 Razorpay Cloud Sync: ${url}/api/razorpay/sync`);
  console.log(`📱 WhatsApp Auto-Sender: ${url}/api/whatsapp/*`);
  console.log(`🤖 Gemini Backend Proxy: ${url}/api/gemini/*`);
  console.log('===========================================================');

  // Initialize WhatsApp QR Auto-Sender Bot
  if (whatsappService) {
    console.log(`[WhatsApp Bot] Initializing WhatsApp QR Multi-Device Client...`);
    whatsappService.initWhatsApp();
  }

  // Initial Cloud Sync in Background
  setTimeout(() => {
    syncRazorpayToFirestore(100)
      .then(res => console.log(`[Auto-Sync] Synced ${res.synced} payments to Firestore Cloud.`))
      .catch(e => console.warn(`[Auto-Sync Notice] ${e.message}`));
  }, 2000);

  // Periodic Auto-Sync every 10 minutes
  setInterval(() => {
    syncRazorpayToFirestore(100)
      .then(res => console.log(`[Auto-Sync] Refreshed ${res.synced} payments to Firestore Cloud.`))
      .catch(e => console.warn(`[Auto-Sync Interval Notice] ${e.message}`));
  }, 10 * 60 * 1000);
});
