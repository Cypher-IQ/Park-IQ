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
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
    } else {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: { user: testAccount.user, pass: testAccount.pass },
      });
      console.log('[PaymentEmail] ⚠️ Test mode (Ethereal).');
    }
    console.log('[PaymentEmail] ✅ Transporter ready');
  } catch (err) {
    console.error('[PaymentEmail] Failed to init transporter', err.message);
  }
};

const paymentTemplate = (paymentData) => ({
  subject: `💳 Payment Receipt - ${paymentData.transactionId}`,
  html: `<div><h2>Payment Successful</h2><p>Transaction: ${paymentData.transactionId}</p><p>Amount: $${(paymentData.amount||0).toFixed(2)}</p></div>`,
});

const sendPaymentReceipt = async (userEmail, paymentDetails) => {
  try {
    const mailer = await ensureTransporter();
    const tpl = paymentTemplate(paymentDetails);
    const info = await mailer.sendMail({ from: '"ParkIQ" <noreply@parkiq.com>', to: userEmail, subject: tpl.subject, html: tpl.html });
    if (process.env.NODE_ENV !== 'production') {
      console.log('[PaymentEmail] Preview:', nodemailer.getTestMessageUrl(info));
    }
    return true;
  } catch (err) {
    console.error('[PaymentEmail] send failed', err.message);
    return false;
  }
};

module.exports = { sendPaymentReceipt };
