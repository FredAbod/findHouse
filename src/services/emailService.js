const emailConfig = require('../config/email');

class EmailService {
  // Support Team Notification Email
  async sendSupportNotification({ ticketId, name, email, subject, message }) {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #3b82f6; color: white; padding: 20px; text-align: center; }
    .ticket-info { background: #f3f4f6; padding: 15px; margin: 20px 0; border-radius: 8px; }
    .message { background: white; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin: 0;">New Support Request</h2>
    </div>
    
    <div class="ticket-info">
      <p style="margin: 5px 0;"><strong>Ticket ID:</strong> ${ticketId}</p>
      <p style="margin: 5px 0;"><strong>From:</strong> ${name} (${email})</p>
      <p style="margin: 5px 0;"><strong>Subject:</strong> ${subject}</p>
      <p style="margin: 5px 0;"><strong>Received:</strong> ${new Date().toLocaleString()}</p>
    </div>
    
    <div class="message">
      <h3 style="margin-top: 0;">Message:</h3>
      <p>${message}</p>
    </div>
    
    <div class="footer">
      <p>FindHouse Support System</p>
      <p>Reply directly to this email to respond to the customer at ${email}</p>
    </div>
  </div>
</body>
</html>
    `;

    return await emailConfig.sendMail({
      to: process.env.SUPPORT_EMAIL || process.env.EMAIL_USER,
      replyTo: email,
      subject: `[Support] ${subject}`,
      html
    });
  }

  // User Confirmation Email
  async sendSupportConfirmation({ to, name, ticketId, subject }) {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #3b82f6; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; }
    .footer { text-align: center; padding: 20px; background: #f9fafb; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin: 0;">We've Received Your Message</h2>
    </div>
    
    <div class="content">
      <p>Hi ${name},</p>
      
      <p>Thank you for contacting FindHouse support. We've received your message and assigned it ticket number <strong>${ticketId}</strong>.</p>
      
      <p><strong>Your Request:</strong><br>
      ${subject}</p>
      
      <p>Our support team will review your message and respond within 24 business hours. You'll receive a reply at ${to}.</p>
      
      <p>If this is urgent, you can also reach us at:<br>
      📞 +234 (0) 800 FINDHOUSE<br>
      📧 ${process.env.SUPPORT_EMAIL || process.env.EMAIL_USER}</p>
      
      <p>Best regards,<br>
      <strong>FindHouse Support Team</strong></p>
    </div>
    
    <div class="footer">
      <p>FindHouse Limited | Lagos, Nigeria</p>
      <p><a href="${process.env.FRONTEND_URL || 'https://findhouse.ng'}" style="color: #3b82f6; text-decoration: none;">Visit our website</a></p>
    </div>
  </div>
</body>
</html>
    `;

    return await emailConfig.sendMail({
      to,
      subject: `We've received your message - Ticket #${ticketId}`,
      html
    });
  }

  // Newsletter Confirmation Email
  async sendNewsletterConfirmation({ to, confirmUrl, unsubscribeUrl }) {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #3b82f6; color: white; padding: 30px; text-align: center; }
    .content { padding: 30px; background: white; }
    .button { 
      background: #3b82f6; 
      color: white; 
      padding: 15px 30px; 
      text-decoration: none; 
      border-radius: 5px; 
      display: inline-block;
      margin: 20px 0;
    }
    .footer { text-align: center; padding: 20px; background: #f9fafb; color: #6b7280; font-size: 12px; }
    ul { padding-left: 20px; }
    li { margin: 10px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">Welcome to FindHouse!</h1>
    </div>
    
    <div class="content">
      <h2>Confirm Your Subscription</h2>
      
      <p>Thanks for subscribing to the FindHouse newsletter! You're one step away from receiving weekly housing tips, rental market insights, and exclusive offers.</p>
      
      <p style="text-align: center;">
        <a href="${confirmUrl}" class="button">Confirm Your Email</a>
      </p>
      
      <p style="color: #6b7280; font-size: 14px;">
        If the button doesn't work, copy and paste this link:<br>
        <a href="${confirmUrl}" style="color: #3b82f6;">${confirmUrl}</a>
      </p>
      
      <p><strong>What you'll get:</strong></p>
      <ul>
        <li>📍 Rental tips for navigating the Nigerian housing market</li>
        <li>💰 Money-saving strategies and handover fee guides</li>
        <li>🛡️ Safety tips and scam prevention advice</li>
        <li>🏠 Early access to premium listings (coming soon)</li>
      </ul>
      
      <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
        Didn't sign up for this? You can safely ignore this email.
      </p>
    </div>
    
    <div class="footer">
      <p>FindHouse Limited | Lagos, Nigeria</p>
      <p><a href="${unsubscribeUrl}" style="color: #3b82f6; text-decoration: none;">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>
    `;

    return await emailConfig.sendMail({
      to,
      subject: 'Confirm your FindHouse newsletter subscription',
      html
    });
  }

  // Newsletter Welcome Email (after confirmation)
  async sendNewsletterWelcome({ to }) {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #3b82f6; color: white; padding: 30px; text-align: center; }
    .content { padding: 30px; background: white; }
    .footer { text-align: center; padding: 20px; background: #f9fafb; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">You're All Set! 🎉</h1>
    </div>
    
    <div class="content">
      <p>Welcome to the FindHouse community!</p>
      
      <p>Your subscription is now active. You'll start receiving our weekly newsletter packed with valuable insights about the Nigerian housing market.</p>
      
      <p><strong>What to expect:</strong></p>
      <p>📧 Weekly newsletters every Monday morning<br>
      🏠 Featured property listings<br>
      💡 Expert tips and guides<br>
      🎁 Exclusive offers and early access</p>
      
      <p>In the meantime, check out our latest blog posts and property listings on our website.</p>
      
      <p style="text-align: center; margin: 30px 0;">
        <a href="${process.env.FRONTEND_URL || 'https://findhouse.ng'}" style="background: #3b82f6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
          Visit FindHouse
        </a>
      </p>
      
      <p>Best regards,<br>
      <strong>The FindHouse Team</strong></p>
    </div>
    
    <div class="footer">
      <p>FindHouse Limited | Lagos, Nigeria</p>
      <p><a href="${process.env.FRONTEND_URL || 'https://findhouse.ng'}" style="color: #3b82f6; text-decoration: none;">www.findhouse.ng</a></p>
    </div>
  </div>
</body>
</html>
    `;

    return await emailConfig.sendMail({
      to,
      subject: "Welcome to FindHouse Newsletter! 🏠",
      html
    });
  }

  // Password Reset Email
  async sendPasswordResetEmail({ to, name, resetUrl }) {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #3b82f6; color: white; padding: 20px; text-align: center; }
    .content { padding: 30px 20px; }
    .button { background: #3b82f6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
    .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; background: #f9fafb; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin: 0;">Password Reset Request</h2>
    </div>
    
    <div class="content">
      <p>Hi ${name},</p>
      
      <p>We received a request to reset the password for your FindHouse account. Click the button below to set a new password:</p>
      
      <p style="text-align: center;">
        <a href="${resetUrl}" class="button" style="color: white;">Reset Password</a>
      </p>
      
      <div class="warning">
        <p style="margin: 0;"><strong>⚠️ This link expires in 1 hour.</strong></p>
        <p style="margin: 5px 0 0 0;">If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
      </div>
      
      <p>If the button doesn't work, copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #3b82f6; font-size: 14px;">${resetUrl}</p>
      
      <p>Best regards,<br>
      <strong>FindHouse Support Team</strong></p>
    </div>
    
    <div class="footer">
      <p>FindHouse Limited | Lagos, Nigeria</p>
      <p>This is an automated message. Please do not reply to this email.</p>
      <p><a href="${process.env.FRONTEND_URL || 'https://findhouse.ng'}" style="color: #3b82f6; text-decoration: none;">www.findhouse.ng</a></p>
    </div>
  </div>
</body>
</html>
    `;

    return await emailConfig.sendMail({
      to,
      subject: "Reset Your FindHouse Password 🔐",
      html
    });
  }
}

module.exports = new EmailService();
