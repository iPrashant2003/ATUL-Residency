import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/* ─── Live DB context fetcher ─── */
async function getDbContext() {
  try {
    const [tenantCount, vacantRooms, pendingPayments, openMaintenance] = await Promise.all([
      prisma.tenant.count({ where: { isActive: true } }),
      prisma.room.count({ where: { isOccupied: false } }),
      prisma.payment.count({ where: { status: "PENDING" } }),
      prisma.maintenanceRequest.count({ where: { status: "OPEN" } }),
    ]);
    return { tenantCount, vacantRooms, pendingPayments, openMaintenance };
  } catch {
    return { tenantCount: 0, vacantRooms: 0, pendingPayments: 0, openMaintenance: 0 };
  }
}

/* ─── Smart local chatbot (keyword-based, no API needed) ─── */
function getLocalReply(message: string, db: Awaited<ReturnType<typeof getDbContext>>): string {
  const msg = message.toLowerCase().trim();

  // Greetings
  if (/^(hi|hello|hey|namaste|good\s*(morning|afternoon|evening)|yo|hola|sup)/.test(msg)) {
    return `👋 Hello! Welcome to **Atul Residency**.\n\nI'm AtulBot — your advanced smart assistant. I can help you with:\n\n• 💰 Rent payments & UPI\n• 🧾 Invoices & Bills\n• 🔧 Maintenance & Repairs\n• 🏠 Room & Tower info\n• 📊 Live property stats\n\nHow can I help you today?`;
  }

  // Small talk / Bot info
  if (/how are you|who are you|what are you|what can you do/.test(msg)) {
    return `🤖 I'm **AtulBot**, the AI backbone of Atul Residency! I'm here 24/7 to assist renters and admins with property management, payments, and any questions you might have. I'm operating at 100% capacity! 🚀`;
  }

  // Thank you
  if (/thank|thanks|dhanyavaad|shukriya|awesome|great|good job/.test(msg)) {
    return `😊 You're very welcome! I'm always here if you need anything else. Have a wonderful day! 🙏`;
  }

  // Rent payment / how to pay
  if (/how.*(pay|rent)|pay.*rent|rent.*pay|payment.*method|upi.*id|qr.*code/.test(msg)) {
    return `💰 **How to Pay Rent:**\n\n1️⃣ **UPI / Google Pay / PhonePe**\n   UPI ID: **atultiwari123321@oksbi**\n\n2️⃣ **QR Code** — Available in your Renter Dashboard & on invoices.\n\n3️⃣ **Bank Transfer** — Contact admin for details.\n\n📱 After payment, please upload the screenshot in the **Payments** section for quick approval!`;
  }

  // Invoices & Bills
  if (/invoice|bill|receipt|pdf|download/.test(msg)) {
    return `🧾 **Invoices & Bills:**\n\nYour monthly rent and electricity bills are generated automatically. You can view and download them as PDF files directly from the **Payments** or **Rent Tracker** page. If you've paid, the invoice will reflect a green **PAID** status! ✅`;
  }

  // UPI ID specifically
  if (/upi|gpay|phonepe|google.*pay|phone.*pe|paytm/.test(msg)) {
    return `📱 **UPI Payment Details:**\n\nUPI ID: **atultiwari123321@oksbi**\n\nYou can use Google Pay, PhonePe, Paytm, or any UPI app. Don't forget to grab a screenshot of your successful transaction! ✅`;
  }

  // Due date
  if (/due.*date|when.*rent.*due|last.*date|rent.*deadline|kab.*tak|penalty|late.*fee/.test(msg)) {
    return `📅 **Rent Due Date & Penalties:**\n\nRent is generated and due on the **1st of every month**. Please pay before the **5th** to avoid late fees.\n\n⚠️ Late payments may attract a penalty fee added to your next bill. Pay early and stay stress-free! 😊`;
  }

  // Maintenance
  if (/maintenance|repair|fix|plumb|electric|broken|leak|clean|issue|problem/.test(msg)) {
    return `🔧 **Maintenance Requests:**\n\nNeed something fixed?\n1. Go to **Maintenance** in your dashboard\n2. Click **New Request**\n3. Describe the issue & attach a photo\n4. Submit!\n\nAdmin will be notified instantly. Currently, there are **${db.openMaintenance}** open requests being handled. 🛠️`;
  }

  // Room info / vacant
  if (/room|vacant|available|tower|bhk|floor|book/.test(msg)) {
    return `🏠 **Room & Tower Info:**\n\nAtul Residency features two premium blocks: **Tower A** (19 rooms) and **Tower B** (15 rooms).\n\n• **Vacant Rooms:** ${db.vacantRooms}\n• **Active Renters:** ${db.tenantCount}\n\nLooking to book a room? Please contact the admin directly! 📞`;
  }

  // Stats / overview
  if (/stats|overview|status|how.*many|kitne|count|dashboard/.test(msg)) {
    return `📊 **Live Property Stats:**\n\n🏠 Active Renters: **${db.tenantCount}**\n🚪 Vacant Rooms: **${db.vacantRooms}**\n💳 Pending Payments: **${db.pendingPayments}**\n🔧 Open Maintenance: **${db.openMaintenance}**\n\nEverything is updating in real-time! 🔄`;
  }

  // Contact admin
  if (/contact|admin|call|phone|whatsapp|number|help.*line|manager|owner/.test(msg)) {
    return `📞 **Contact Admin:**\n\n• **WhatsApp/Call:** +91 6392651108\n• **Email:** atultiwari123321@gmail.com\n\nAdmins are available from 9 AM to 8 PM. In case of emergencies, please call directly! 🚨`;
  }

  // Password / login
  if (/password|login|sign.*in|forgot|reset|credential|account|profile/.test(msg)) {
    return `🔐 **Account & Login Help:**\n\nIf you forgot your password, contact the admin to **reset your credentials**. They will generate a secure, one-time password for you.\n\nOnce logged in, you can securely change your password from your **Profile** page.`;
  }

  // Atul Residency info
  if (/atul|residency|about|property|building|location|address/.test(msg)) {
    return `🏢 **About Atul Residency:**\n\nAtul Residency is a premium residential property offering:\n\n• 🏗️ **2 Towers** (34 Rooms total)\n• 💰 Transparent digital rent management\n• 🔧 Rapid maintenance support\n• 📱 Smart AI & WhatsApp notifications\n\nDesigned for modern, comfortable living! ✨`;
  }

  // Bye
  if (/bye|goodbye|see.*you|tata|alvida|cya|later/.test(msg)) {
    return `👋 Goodbye! Have a fantastic day ahead. I'm always here if you need me! 😊🏠`;
  }

  // Fallback
  return `🤔 I'm not quite sure about that. Try asking me about:\n\n• 💰 **Rent & UPI** (e.g. "What's the UPI ID?")\n• 🧾 **Invoices** (e.g. "How to download bill?")\n• 🔧 **Maintenance** (e.g. "Raise an issue")\n• 🏠 **Rooms** (e.g. "Are there vacant rooms?")\n• 📞 **Contact** (e.g. "Admin number")`;
}

/* ─── Gemini API path (used when API key is available) ─── */
async function getGeminiReply(message: string, history: any[], apiKey: string, dbContext: string): Promise<string> {
  const systemInstruction = `You are AtulBot, a helpful and friendly AI assistant for Atul Residency, a premium residential property management system in India.
Your role is to assist renters and admins with questions about:
- Rent payments (how to pay, UPI ID, due dates)
- Room and tower information
- Maintenance requests
- How to use the renter/admin portal
- General property policies

${dbContext}

Rules:
- Be concise, friendly, and professional. Use emojis where appropriate.
- Answer only questions relevant to Atul Residency.
- If asked something unrelated, politely redirect to property management topics.
- For sensitive info (Aadhaar, banking details), advise the user to contact the admin directly.
- Keep responses under 150 words unless a detailed explanation is genuinely needed.`;

  const formattedHistory = (history || []).map((msg: { role: string; content: string }) => ({
    role: msg.role === "user" ? "user" : "model",
    parts: [{ text: msg.content }],
  }));

  const requestBody = {
    system_instruction: { parts: [{ text: systemInstruction }] },
    contents: [
      ...formattedHistory,
      { role: "user", parts: [{ text: message }] },
    ],
    generationConfig: { temperature: 0.7, maxOutputTokens: 512 },
  };

  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    }
  );

  if (!geminiRes.ok) {
    console.error("[Gemini API Error]", await geminiRes.json());
    return "Sorry, I'm having trouble connecting. Please try again!";
  }

  const geminiData = await geminiRes.json();
  return geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "I couldn't generate a response. Please try again.";
}

/* ─── Main handler ─── */
export async function POST(req: NextRequest) {
  try {
    const { message, history } = await req.json();
    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const db = await getDbContext();
    const apiKey = process.env.GEMINI_API_KEY;

    let reply: string;

    if (apiKey) {
      // Premium: use Gemini AI
      const dbContext = `\n[Live System Data]\n- Active Renters: ${db.tenantCount}\n- Vacant Rooms: ${db.vacantRooms}\n- Pending Payment Approvals: ${db.pendingPayments}\n- Open Maintenance Requests: ${db.openMaintenance}\n- UPI ID for rent: atultiwari123321@oksbi\n- WhatsApp for support: +91 6392651108\n`;
      reply = await getGeminiReply(message, history, apiKey, dbContext);
    } else {
      // Free: smart local chatbot
      reply = getLocalReply(message, db);
    }

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("[chat route]", err);
    return NextResponse.json({ reply: "An error occurred. Please try again!" }, { status: 200 });
  }
}
