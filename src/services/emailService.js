const emailConfig = require('../config/email');
const emailTemplates = require('../utils/emailTemplates');

class EmailService {
  // Welcome Email - Sent when user registers
  async sendWelcomeEmail({ to, name }) {
    const html = emailTemplates.welcomeEmail({ name });

    return await emailConfig.sendMail({
      to,
      subject: 'Welcome to FindHouse! 🏠',
      html
    });
  }

  // Property View Notification - Sent to property owner when someone views their property
  async sendPropertyViewNotification({ ownerEmail, ownerName, viewerName, viewerEmail, viewerPhone, propertyTitle, propertyLocation, propertyId }) {
    const html = emailTemplates.propertyViewNotification({
      ownerName,
      viewerName,
      viewerEmail,
      viewerPhone,
      propertyTitle,
      propertyLocation,
      propertyId
    });

    return await emailConfig.sendMail({
      to: ownerEmail,
      subject: `👀 Someone viewed your property: ${propertyTitle}`,
      html
    });
  }

  // Support Team Notification Email
  async sendSupportNotification({ ticketId, name, email, subject, message }) {
    const html = emailTemplates.supportNotification({
      ticketId,
      name,
      email,
      subject,
      message
    });

    return await emailConfig.sendMail({
      to: process.env.SUPPORT_EMAIL || process.env.EMAIL_USER,
      replyTo: email,
      subject: `[Support] ${subject} - Ticket #${ticketId}`,
      html
    });
  }

  // User Confirmation Email
  async sendSupportConfirmation({ to, name, ticketId, subject }) {
    const html = emailTemplates.supportConfirmation({
      name,
      ticketId,
      subject
    });

    return await emailConfig.sendMail({
      to,
      subject: `We've received your message - Ticket #${ticketId}`,
      html
    });
  }

  // Newsletter Confirmation Email
  async sendNewsletterConfirmation({ to, confirmUrl, unsubscribeUrl }) {
    const html = emailTemplates.newsletterConfirmation({
      confirmUrl,
      unsubscribeUrl
    });

    return await emailConfig.sendMail({
      to,
      subject: 'Confirm your FindHouse newsletter subscription 📬',
      html
    });
  }

  // Newsletter Welcome Email (after confirmation)
  async sendNewsletterWelcome({ to }) {
    const html = emailTemplates.newsletterWelcome();

    return await emailConfig.sendMail({
      to,
      subject: "Welcome to FindHouse Newsletter! 🎉",
      html
    });
  }

  // Password Reset Email
  async sendPasswordResetEmail({ to, name, resetUrl }) {
    const html = emailTemplates.passwordReset({
      name,
      resetUrl
    });

    return await emailConfig.sendMail({
      to,
      subject: "Reset Your FindHouse Password 🔐",
      html
    });
  }

  // Booking Confirmation Email
  async sendBookingConfirmation({ to, name, propertyTitle, propertyLocation, bookingDate, bookingTime, ownerName, ownerPhone }) {
    const html = emailTemplates.bookingConfirmation({
      name,
      propertyTitle,
      propertyLocation,
      bookingDate,
      bookingTime,
      ownerName,
      ownerPhone
    });

    return await emailConfig.sendMail({
      to,
      subject: `📅 Booking Confirmed: ${propertyTitle}`,
      html
    });
  }

  // Email Verification Email
  async sendEmailVerification({ to, name, verifyUrl }) {
    const html = emailTemplates.emailVerification({
      name,
      verifyUrl
    });

    return await emailConfig.sendMail({
      to,
      subject: "Verify Your Email Address ✉️",
      html
    });
  }
}

module.exports = new EmailService();
