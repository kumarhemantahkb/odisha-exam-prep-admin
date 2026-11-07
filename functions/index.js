const functions = require("firebase-functions");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");
const crypto = require("crypto");

// Initialize Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore();

// Load local config
let config = {
  razorpayKeyId: process.env.RAZORPAY_KEY_ID || "rzp_live_T3XkyfH49mwdl8",
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || "jUhkVBmQco0jib9oyAntDH11",
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || "odisha_prep_webhook_2026"
};

try {
  const localConfig = require("./config.json");
  config = { ...config, ...localConfig };
} catch (e) {
  // Use defaults / env vars
}

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// Main router for Razorpay APIs
const router = express.Router();

// 1. Health check
router.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "Odisha Exam Prep Razorpay 24x7 Cloud Sync",
    timestamp: new Date().toISOString()
  });
});

// Helper to automatically activate student's Premium Account in Firestore 'Users' collection
async function autoActivateUser(payment) {
  try {
    const rawEmail = (payment.email || "").toLowerCase().trim();
    const rawContact = (payment.contact || "").toString().replace(/[^0-9]/g, "").slice(-10);
    const amountInRs = Math.round((payment.amount || 0) / 100);

    let targetUid = null;

    // 1. Try finding user by email
    if (rawEmail) {
      const emailSnap = await db.collection("user").where("email", "==", rawEmail).limit(1).get();
      if (!emailSnap.empty) {
        targetUid = emailSnap.docs[0].id;
      }
    }

    // 2. If not found by email, try finding by phone number
    if (!targetUid && rawContact && rawContact.length === 10) {
      const phoneSnap = await db.collection("user").where("phoneNumber", "==", rawContact).limit(1).get();
      if (!phoneSnap.empty) {
        targetUid = phoneSnap.docs[0].id;
      }
    }

    if (!targetUid) {
      console.log(`[Auto-Activate] No matching user found for email: ${rawEmail}, phone: ${rawContact}`);
      return false;
    }

    // Determine plan based on amount paid (₹29 -> Monthly, ₹99 -> Half-Yearly)
    let planMonths = 1;
    let planTitle = "Monthly Pass";
    if (amountInRs >= 80) {
      planMonths = 6;
      planTitle = "Half-Yearly Pass";
    } else if (amountInRs >= 140) {
      planMonths = 12;
      planTitle = "Yearly Pass";
    }

    const now = new Date();
    const expiry = new Date(now.getTime() + planMonths * 30 * 24 * 60 * 60 * 1000);

    // Update Users collection to activate premium access
    await db.collection("Users").doc(targetUid).set({
      isPremium: true,
      amountPaid: amountInRs,
      paymentId: payment.id,
      lastPaymentId: payment.id,
      planTitle: planTitle,
      planMonths: planMonths,
      purchaseDate: admin.firestore.FieldValue.serverTimestamp(),
      premiumExpiry: admin.firestore.Timestamp.fromDate(expiry),
      activatedVia: "razorpay_webhook_auto"
    }, { merge: true });

    console.log(`[Auto-Activate] 🎉 Activated ${planTitle} for user UID: ${targetUid} (${rawEmail || rawContact})!`);
    return true;
  } catch (err) {
    console.error("[Auto-Activate Error]:", err.message);
    return false;
  }
}

// 2. Razorpay Webhook Handler (24x7 Realtime Sync)
router.post("/webhook", async (req, res) => {
  try {
    const signature = req.headers["x-razorpay-signature"];
    const event = req.body?.event;
    const payment = req.body?.payload?.payment?.entity;

    console.log(`[Razorpay Webhook] Received event: ${event}`);

    // Signature verification (if webhook secret is configured)
    if (config.razorpayWebhookSecret && signature) {
      // Firebase functions provides req.rawBody Buffer
      const rawPayload = req.rawBody ? req.rawBody : (typeof req.body === "string" ? req.body : JSON.stringify(req.body));
      const expectedSignature = crypto
        .createHmac("sha256", config.razorpayWebhookSecret)
        .update(rawPayload)
        .digest("hex");

      if (signature !== expectedSignature) {
        console.warn("[Razorpay Webhook] ⚠️ Signature mismatch! Provided:", signature, "Expected:", expectedSignature);
        return res.status(400).send("Invalid signature");
      }
      console.log("[Razorpay Webhook] Signature verified successfully.");
    }

    if (!payment || !payment.id) {
      console.log("[Razorpay Webhook] No payment entity found in payload, acknowledging event.");
      return res.status(200).json({ status: "ignored_non_payment" });
    }

    const docRef = db.collection("razorpay_transactions").doc(payment.id);
    const isCaptured = payment.captured === true || payment.status === "captured";
    
    // Normalize and persist payment data to Firestore
    await docRef.set({
      id: payment.id,
      amount: (payment.amount || 0) / 100,
      rawAmount: payment.amount || 0,
      currency: payment.currency || "INR",
      status: payment.status || "unknown",
      order_id: payment.order_id || null,
      method: payment.method || null,
      description: payment.description || null,
      email: (payment.email || "").toLowerCase().trim() || null,
      contact: payment.contact || null,
      notes: payment.notes || {},
      created_at: payment.created_at || Math.floor(Date.now() / 1000),
      captured: isCaptured,
      error_code: payment.error_code || null,
      error_description: payment.error_description || null,
      updated_via: "webhook",
      webhook_event: event,
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    // 🔥 AUTOMATIC ACCOUNT ACTIVATION: If payment is captured, unlock student's app account!
    if (isCaptured) {
      await autoActivateUser(payment);
    }

    console.log(`[Razorpay Webhook] ✅ Firestore updated for payment ${payment.id} with status '${payment.status}'`);

    return res.status(200).json({ status: "success", paymentId: payment.id });
  } catch (err) {
    console.error("[Razorpay Webhook Error]:", err);
    return res.status(500).json({ error: err.message });
  }
});

// 3. 1-Click Payment Capture API (Cloud-native 24x7)
router.post("/capture", async (req, res) => {
  try {
    const { paymentId, amount } = req.body;
    if (!paymentId) {
      return res.status(400).json({ error: "paymentId is required" });
    }

    const authHeader = "Basic " + Buffer.from(`${config.razorpayKeyId}:${config.razorpayKeySecret}`).toString("base64");
    
    const bodyPayload = amount ? JSON.stringify({ amount: Number(amount), currency: "INR" }) : JSON.stringify({});

    const rzpRes = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}/capture`, {
      method: "POST",
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/json"
      },
      body: bodyPayload
    });

    const rzpData = await rzpRes.json();
    if (!rzpRes.ok) {
      return res.status(rzpRes.status).json({
        error: rzpData.error?.description || "Razorpay capture rejected"
      });
    }

    // Immediately update Firestore cache
    await db.collection("razorpay_transactions").doc(paymentId).set({
      status: "captured",
      captured: true,
      captured_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_via: "cloud_capture",
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    // 🔥 Automatically activate student's Premium Account in Users collection!
    await autoActivateUser(rzpData);

    return res.json({ success: true, payment: rzpData });
  } catch (err) {
    console.error("[Capture Error]:", err);
    return res.status(500).json({ error: err.message });
  }
});

// 4. Batch Payments Sync API
router.post("/sync", async (req, res) => {
  try {
    const count = Math.min(Number(req.body?.count) || 100, 100);
    const authHeader = "Basic " + Buffer.from(`${config.razorpayKeyId}:${config.razorpayKeySecret}`).toString("base64");

    const rzpRes = await fetch(`https://api.razorpay.com/v1/payments?count=${count}`, {
      headers: { "Authorization": authHeader }
    });

    const data = await rzpRes.json();
    if (!rzpRes.ok) {
      return res.status(rzpRes.status).json({
        error: data.error?.description || "Failed to fetch from Razorpay"
      });
    }

    const items = data.items || [];
    const batch = db.batch();

    items.forEach(p => {
      const docRef = db.collection("razorpay_transactions").doc(p.id);
      batch.set(docRef, {
        id: p.id,
        amount: (p.amount || 0) / 100,
        rawAmount: p.amount || 0,
        currency: p.currency || "INR",
        status: p.status || "unknown",
        order_id: p.order_id || null,
        method: p.method || null,
        description: p.description || null,
        email: (p.email || "").toLowerCase().trim() || null,
        contact: p.contact || null,
        notes: p.notes || {},
        created_at: p.created_at || Math.floor(Date.now() / 1000),
        captured: p.captured === true || p.status === "captured",
        error_code: p.error_code || null,
        error_description: p.error_description || null,
        synced_at: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    });

    await batch.commit();
    return res.json({ success: true, count: items.length });
  } catch (err) {
    console.error("[Sync Error]:", err);
    return res.status(500).json({ error: err.message });
  }
});

// Mount router under both prefixes to support direct function URLs and Hosting rewrites
app.use("/api/razorpay", router);
app.use("/", router);

// Export Cloud Function as 'api' (Region: us-central1 for full Firebase Hosting rewrite compatibility)
exports.api = functions.https.onRequest(app);
