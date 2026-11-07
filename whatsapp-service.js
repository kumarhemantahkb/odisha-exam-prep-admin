const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode');
const path = require('path');
const fs = require('fs');

const AUTH_DIR = path.join(__dirname, 'whatsapp_auth');

let sock = null;
let currentQr = null;
let currentQrDataUrl = null;
let connectionStatus = 'disconnected'; // 'disconnected' | 'connecting' | 'qr_ready' | 'connected'
let connectedPhone = null;
let isReconnecting = false;

// Ensure auth directory exists
if (!fs.existsSync(AUTH_DIR)) {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
}

async function initWhatsApp() {
  if (isReconnecting) return;
  isReconnecting = true;

  try {
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

    sock = makeWASocket({
      auth: state,
      logger: pino({ level: 'silent' }),
      printQRInTerminal: true, // also print in terminal if user opens it
      browser: ['Odisha Exam Prep', 'Chrome', '1.0.0']
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        currentQr = qr;
        connectionStatus = 'qr_ready';
        try {
          currentQrDataUrl = await qrcode.toDataURL(qr, { width: 300, margin: 2 });
          console.log('[WhatsApp Bot] 📲 New QR Code generated! Scan it in Admin Panel.');
        } catch (err) {
          console.error('[WhatsApp Bot] QR generation error:', err.message);
        }
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        console.log(`[WhatsApp Bot] Connection closed (status: ${statusCode}). Reconnect? ${shouldReconnect}`);

        connectionStatus = 'disconnected';
        currentQr = null;
        currentQrDataUrl = null;
        connectedPhone = null;
        isReconnecting = false;

        if (shouldReconnect) {
          setTimeout(() => initWhatsApp(), 4000);
        } else {
          console.log('[WhatsApp Bot] Device logged out. Clearing auth credentials.');
          try {
            fs.rmSync(AUTH_DIR, { recursive: true, force: true });
            fs.mkdirSync(AUTH_DIR, { recursive: true });
          } catch (e) {}
          setTimeout(() => initWhatsApp(), 2000);
        }
      } else if (connection === 'open') {
        connectionStatus = 'connected';
        currentQr = null;
        currentQrDataUrl = null;
        isReconnecting = false;

        const userJid = sock.user?.id || '';
        connectedPhone = userJid.split(':')[0] || userJid.split('@')[0];
        console.log(`[WhatsApp Bot] 🎉 WhatsApp Connected Successfully! (Active on: +${connectedPhone})`);
      }
    });

  } catch (err) {
    console.error('[WhatsApp Bot] Initialization error:', err.message);
    connectionStatus = 'disconnected';
    isReconnecting = false;
    setTimeout(() => initWhatsApp(), 5000);
  }
}

// Send a WhatsApp message to an Indian or international mobile number
async function sendMessage(phoneNumber, textMessage) {
  if (connectionStatus !== 'connected' || !sock) {
    return {
      success: false,
      error: 'WhatsApp bot is not connected. Please scan the QR code in Admin Panel.'
    };
  }

  try {
    const rawDigits = (phoneNumber || '').toString().replace(/[^0-9]/g, '');
    let cleanPhone = rawDigits;
    
    // Normalise 10-digit Indian numbers with 91 prefix
    if (cleanPhone.length === 10) {
      cleanPhone = '91' + cleanPhone;
    } else if (cleanPhone.length === 12 && cleanPhone.startsWith('91')) {
      // already good
    } else if (cleanPhone.length > 10 && cleanPhone.startsWith('0')) {
      cleanPhone = '91' + cleanPhone.slice(1);
    }

    if (cleanPhone.length < 10) {
      return { success: false, error: 'Invalid phone number' };
    }

    const jid = `${cleanPhone}@s.whatsapp.net`;
    const result = await sock.sendMessage(jid, { text: textMessage });

    return {
      success: true,
      messageId: result.key?.id || null,
      phone: cleanPhone
    };
  } catch (err) {
    console.error(`[WhatsApp Bot] Send error for ${phoneNumber}:`, err.message);
    return { success: false, error: err.message };
  }
}

// Get live status
function getStatus() {
  return {
    status: connectionStatus,
    phone: connectedPhone,
    qrDataUrl: currentQrDataUrl
  };
}

// Logout session
async function logout() {
  try {
    if (sock) {
      await sock.logout();
    }
  } catch (e) {}
  try {
    fs.rmSync(AUTH_DIR, { recursive: true, force: true });
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  } catch (e) {}
  connectionStatus = 'disconnected';
  connectedPhone = null;
  currentQr = null;
  currentQrDataUrl = null;
  setTimeout(() => initWhatsApp(), 1500);
  return { success: true };
}

module.exports = {
  initWhatsApp,
  sendMessage,
  getStatus,
  logout
};
