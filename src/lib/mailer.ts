import nodemailer from 'nodemailer';

// Using generic 'gmail' service which automatically configures host, port, and security
export const mailer = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS, // This must be an App Password for Gmail
  },
});

export const sendEmailOTP = async (to: string, otp: string) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn("⚠️ SMTP credentials not found in environment variables. Email OTP skipped.");
    return false;
  }

  try {
    const info = await mailer.sendMail({
      from: `"Atul Residency" <${process.env.SMTP_USER}>`,
      to,
      subject: 'Your Login OTP - Atul Residency',
      text: `Your One-Time Password (OTP) is: ${otp}. It will expire in 10 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px;">
          <h2 style="color: #0D9488; text-align: center;">Atul Residency</h2>
          <p style="color: #374151; font-size: 16px;">Hello,</p>
          <p style="color: #374151; font-size: 16px;">Your One-Time Password (OTP) for login/password reset is:</p>
          <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; text-align: center; margin: 24px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #111827;">${otp}</span>
          </div>
          <p style="color: #6b7280; font-size: 14px;">This code is valid for 10 minutes. Please do not share it with anyone.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="color: #9ca3af; font-size: 12px; text-align: center;">If you didn't request this code, you can safely ignore this email.</p>
        </div>
      `,
    });
    console.log(`[Email] OTP sent to ${to}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error("[Email Error]", error);
    return false;
  }
};
