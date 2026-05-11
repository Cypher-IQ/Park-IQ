const nodemailer = require('nodemailer');

let transporter;

const ensureTransporter = async () => {
  if (transporter) return transporter;
  await initTransporter();
  return transporter;
};

const initTransporter = async () => {
  try {
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    } else {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      console.log('[EmailService] ⚠️  Test mode (Ethereal). Preview URLs logged after each email.');
    }
    console.log('[EmailService] ✅ Email transporter initialized.');
  } catch (error) {
    console.error('[EmailService] ❌ Failed to initialize transporter:', error);
  }
};

initTransporter();

// EMAIL TEMPLATES
const emailTemplates = {
  bookingConfirmation: (bookingData) => ({
    subject: `🚗 Booking Confirmed - ${bookingData.bookingId}`,
    html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>✅ Booking Confirmed!</h2>
      <p><strong>Booking ID:</strong> ${bookingData.bookingId}</p>
      <p><strong>Slot:</strong> ${bookingData.slotId}</p>
      <p><strong>Check-in:</strong> ${new Date(bookingData.startTime).toLocaleString()}</p>
      <p><strong>Check-out:</strong> ${new Date(bookingData.endTime).toLocaleString()}</p>
      <p><strong>Cost:</strong> $${bookingData.estimatedPrice?.toFixed(2) || '0.00'}</p>
      <img src="${bookingData.qrCode}" alt="QR" style="width: 200px;"/>
    </div>`,
  }),
  paymentReceipt: (paymentData) => ({
    subject: `💳 Payment Receipt - ${paymentData.transactionId}`,
    html: `<div style="font-family: Arial, sans-serif; max-width: 600px;">
      <h2>✅ Payment Successful</h2>
      <p><strong>Transaction:</strong> ${paymentData.transactionId}</p>
      <p><strong>Amount:</strong> $${paymentData.amount.toFixed(2)}</p>
      <p><strong>Status:</strong> PAID</p>
    </div>`,
  }),
  passwordReset: (resetData) => ({
    subject: '🔐 Reset Your Password',
    html: `<div style="font-family: Arial, sans-serif; max-width: 600px;">
      <h2>Password Reset Request</h2>
      <p><a href="${resetData.resetLink}" style="background: #00D4FF; color: #000; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
      <p><small>Link expires in 1 hour</small></p>
    </div>`,
  }),
  twoFactorCode: (codeData) => ({
    subject: '🔐 Your ParkIQ Two-Factor Code',
    html: `<div style="font-family: Arial, sans-serif; max-width: 600px;">
      <h2>Two-Factor Authentication</h2>
      <p>Use this verification code to complete your sign in:</p>
      <div style="font-size: 28px; font-weight: bold; letter-spacing: 6px; background: #0A0F1E; color: #00D4FF; padding: 16px 24px; display: inline-block; border-radius: 12px;">${codeData.code}</div>
      <p><small>This code expires in 10 minutes.</small></p>
    </div>`,
  }),
};

const sendBookingConfirmation = async (userEmail, qrCode, bookingDetails) => {
  try {
    const mailer = await ensureTransporter();
    const template = emailTemplates.bookingConfirmation({...bookingDetails, qrCode});
    const info = await mailer.sendMail({
      from: '"ParkIQ" <noreply@parkiq.com>',
      to: userEmail,
      subject: template.subject,
      html: template.html,
    });
    if (process.env.NODE_ENV !== 'production') {
      console.log('[EmailService] 📧 Preview:', nodemailer.getTestMessageUrl(info));
    }
    return true;
  } catch (err) {
    console.error('[EmailService] ❌ Confirmation failed:', err.message);
    return false;
  }
};

const sendPaymentReceipt = async (userEmail, paymentDetails) => {
  try {
    const mailer = await ensureTransporter();
    const template = emailTemplates.paymentReceipt(paymentDetails);
    const info = await mailer.sendMail({
      from: '"ParkIQ" <noreply@parkiq.com>',
      to: userEmail,
      subject: template.subject,
      html: template.html,
    });
    return true;
  } catch (err) {
    console.error('[EmailService] ❌ Receipt failed:', err.message);
    return false;
  }
};

const sendPasswordReset = async (userEmail, userName, resetToken) => {
  try {
    const mailer = await ensureTransporter();
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
    const template = emailTemplates.passwordReset({userName, resetLink});
    const info = await mailer.sendMail({
      from: '"ParkIQ" <noreply@parkiq.com>',
      to: userEmail,
      subject: template.subject,
      html: template.html,
    });
    return true;
  } catch (err) {
    console.error('[EmailService] ❌ Password reset failed:', err.message);
    return false;
  }
};

const sendTwoFactorCode = async (userEmail, code) => {
  try {
    const mailer = await ensureTransporter();
    const template = emailTemplates.twoFactorCode({ code });
    await mailer.sendMail({
      from: '"ParkIQ" <noreply@parkiq.com>',
      to: userEmail,
      subject: template.subject,
      html: template.html,
    });
    return true;
  } catch (err) {
    console.error('[EmailService] ❌ 2FA code failed:', err.message);
    return false;
  }
};

const sendBookingCancellation = async (userEmail, bookingDetails) => {
  try {
    const mailer = await ensureTransporter();
    const info = await mailer.sendMail({
      from: '"ParkIQ" <noreply@parkiq.com>',
      to: userEmail,
      subject: `Booking Cancelled - ${bookingDetails.bookingId}`,
      html: `<div><h2>Booking Cancelled</h2><p>Booking: ${bookingDetails.bookingId}</p></div>`,
    });
    return true;
  } catch (err) {
    console.error('[EmailService] ❌ Cancellation failed:', err.message);
    return false;
  }
};

const sendRefundNotification = async (userEmail, refundDetails) => {
  try {
    const mailer = await ensureTransporter();
    const info = await mailer.sendMail({
      from: '"ParkIQ" <noreply@parkiq.com>',
      to: userEmail,
      subject: `Refund Processed - ${refundDetails.transactionId}`,
      html: `<div><h2>Refund Processed</h2><p>Amount: $${refundDetails.amount.toFixed(2)}</p></div>`,
    });
    return true;
  } catch (err) {
    console.error('[EmailService] ❌ Refund notification failed:', err.message);
    return false;
  }
};

module.exports = {
  sendBookingConfirmation,
  sendPaymentReceipt,
  sendPasswordReset,
  sendTwoFactorCode,
  sendBookingCancellation,
  sendRefundNotification,
};