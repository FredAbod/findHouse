/**
 * FindHouse Email Templates
 * Professional HTML email templates with consistent branding
 */

// Logo URL - Use the backend API URL for the logo
// In production, this will be served from your backend's /logo.png endpoint
const getLogoUrl = () => {
  // For production, use the backend URL
  if (process.env.NODE_ENV === 'production') {
    return 'https://findhouse-core.proudground-07260773.polandcentral.azurecontainerapps.io/logo.png';
  }
  // For development, use localhost
  return `http://localhost:${process.env.PORT || 5000}/logo.png`;
};

const LOGO_URL = getLogoUrl();

// Brand colors
const BRAND_COLORS = {
  primary: '#0d9488', // Teal color from the logo
  primaryDark: '#0f766e',
  primaryLight: '#14b8a6',
  background: '#f8fafc',
  white: '#ffffff',
  textDark: '#1e293b',
  textMuted: '#64748b',
  border: '#e2e8f0',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444'
};

/**
 * Base email template wrapper
 * @param {string} content - The main content HTML
 * @param {string} preheader - Preview text shown in email clients
 * @returns {string} Complete HTML email
 */
const baseTemplate = (content, preheader = '') => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>FindHouse</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    /* Reset styles */
    body, table, td, p, a, li, blockquote {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    table, td {
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    img {
      -ms-interpolation-mode: bicubic;
      border: 0;
      height: auto;
      line-height: 100%;
      outline: none;
      text-decoration: none;
    }
    body {
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }
    a {
      color: ${BRAND_COLORS.primary};
    }
    /* Button styles */
    .button {
      background-color: ${BRAND_COLORS.primary};
      border-radius: 8px;
      color: #ffffff !important;
      display: inline-block;
      font-size: 16px;
      font-weight: 600;
      line-height: 1;
      padding: 16px 32px;
      text-decoration: none;
      text-align: center;
    }
    .button:hover {
      background-color: ${BRAND_COLORS.primaryDark};
    }
    /* Responsive */
    @media only screen and (max-width: 600px) {
      .container {
        width: 100% !important;
        padding: 10px !important;
      }
      .content {
        padding: 20px !important;
      }
    }
  </style>
</head>
<body style="background-color: ${BRAND_COLORS.background}; margin: 0; padding: 0;">
  <!-- Preheader text (hidden preview text) -->
  <div style="display: none; max-height: 0; overflow: hidden;">
    ${preheader}
    &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>
  
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: ${BRAND_COLORS.background};">
    <tr>
      <td align="center" style="padding: 40px 10px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" class="container" style="max-width: 600px; background-color: ${BRAND_COLORS.white}; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          <!-- Header with Logo -->
          <tr>
            <td style="padding: 30px 40px; text-align: center; border-bottom: 1px solid ${BRAND_COLORS.border};">
              <img src="${LOGO_URL}" alt="FindHouse" width="180" style="max-width: 180px; height: auto;">
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td class="content" style="padding: 40px;">
              ${content}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: ${BRAND_COLORS.background}; border-radius: 0 0 16px 16px; border-top: 1px solid ${BRAND_COLORS.border};">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="text-align: center;">
                    <p style="margin: 0 0 10px 0; font-size: 14px; color: ${BRAND_COLORS.textMuted};">
                      FindHouse Limited | Lagos, Nigeria
                    </p>
                    <p style="margin: 0 0 10px 0; font-size: 14px;">
                      <a href="${process.env.FRONTEND_URL || 'https://findhouse.online'}" style="color: ${BRAND_COLORS.primary}; text-decoration: none;">
                        www.findhouse.online
                      </a>
                    </p>
                    <p style="margin: 0; font-size: 12px; color: ${BRAND_COLORS.textMuted};">
                      © ${new Date().getFullYear()} FindHouse. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

/**
 * Welcome Email - Sent when user registers
 */
const welcomeEmail = ({ name }) => {
  const content = `
    <h1 style="margin: 0 0 20px 0; font-size: 28px; font-weight: 700; color: ${BRAND_COLORS.textDark}; text-align: center;">
      Welcome to FindHouse! 🏠
    </h1>
    
    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: ${BRAND_COLORS.textDark};">
      Hi <strong>${name}</strong>,
    </p>
    
    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: ${BRAND_COLORS.textDark};">
      Welcome to FindHouse – your trusted partner in finding the perfect home in Nigeria! We're thrilled to have you join our community.
    </p>
    
    <div style="background: linear-gradient(135deg, ${BRAND_COLORS.primary}15, ${BRAND_COLORS.primaryLight}15); border-radius: 12px; padding: 25px; margin: 25px 0;">
      <h3 style="margin: 0 0 15px 0; font-size: 18px; color: ${BRAND_COLORS.primaryDark};">
        Here's what you can do with FindHouse:
      </h3>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td style="padding: 8px 0; font-size: 15px; color: ${BRAND_COLORS.textDark};">
            🔍 <strong>Search Properties</strong> – Browse thousands of verified listings
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-size: 15px; color: ${BRAND_COLORS.textDark};">
            ❤️ <strong>Save Favorites</strong> – Keep track of properties you love
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-size: 15px; color: ${BRAND_COLORS.textDark};">
            📝 <strong>List Properties</strong> – Rent out your property to verified tenants
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-size: 15px; color: ${BRAND_COLORS.textDark};">
            📅 <strong>Book Viewings</strong> – Schedule property inspections easily
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-size: 15px; color: ${BRAND_COLORS.textDark};">
            🛡️ <strong>Verified Listings</strong> – Trust in our verified property owners
          </td>
        </tr>
      </table>
    </div>
    
    <p style="text-align: center; margin: 30px 0;">
      <a href="${process.env.FRONTEND_URL || 'https://findhouse.online'}/listings" class="button" style="background-color: ${BRAND_COLORS.primary}; border-radius: 8px; color: #ffffff !important; display: inline-block; font-size: 16px; font-weight: 600; padding: 16px 32px; text-decoration: none;">
        Start Exploring Properties
      </a>
    </p>
    
    <p style="margin: 20px 0; font-size: 16px; line-height: 1.6; color: ${BRAND_COLORS.textDark};">
      Need help getting started? Our support team is always here to assist you.
    </p>
    
    <p style="margin: 0; font-size: 16px; line-height: 1.6; color: ${BRAND_COLORS.textDark};">
      Happy house hunting!<br>
      <strong style="color: ${BRAND_COLORS.primary};">The FindHouse Team</strong>
    </p>
  `;
  
  return baseTemplate(content, `Welcome to FindHouse, ${name}! Start exploring properties today.`);
};

/**
 * Property View Notification - Sent to property owner when someone views their property
 */
const propertyViewNotification = ({ ownerName, viewerName, viewerEmail, viewerPhone, propertyTitle, propertyLocation, propertyId }) => {
  const content = `
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="display: inline-block; background-color: ${BRAND_COLORS.success}15; border-radius: 50%; padding: 20px;">
        <span style="font-size: 40px;">👀</span>
      </div>
    </div>
    
    <h1 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 700; color: ${BRAND_COLORS.textDark}; text-align: center;">
      Someone Viewed Your Property!
    </h1>
    
    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: ${BRAND_COLORS.textDark};">
      Hi <strong>${ownerName}</strong>,
    </p>
    
    <p style="margin: 0 0 25px 0; font-size: 16px; line-height: 1.6; color: ${BRAND_COLORS.textDark};">
      Great news! Someone just viewed your property listing on FindHouse. Here are the details:
    </p>
    
    <!-- Property Info Card -->
    <div style="background-color: ${BRAND_COLORS.background}; border-radius: 12px; padding: 20px; margin-bottom: 25px; border: 1px solid ${BRAND_COLORS.border};">
      <h3 style="margin: 0 0 10px 0; font-size: 18px; color: ${BRAND_COLORS.primary};">
        📍 ${propertyTitle}
      </h3>
      <p style="margin: 0; font-size: 14px; color: ${BRAND_COLORS.textMuted};">
        ${propertyLocation}
      </p>
    </div>
    
    <!-- Viewer Info Card -->
    <div style="background-color: ${BRAND_COLORS.primary}08; border-radius: 12px; padding: 25px; margin-bottom: 25px; border-left: 4px solid ${BRAND_COLORS.primary};">
      <h3 style="margin: 0 0 15px 0; font-size: 16px; color: ${BRAND_COLORS.textDark};">
        👤 Viewer Information
      </h3>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td style="padding: 5px 0; font-size: 14px; color: ${BRAND_COLORS.textMuted}; width: 80px;">Name:</td>
          <td style="padding: 5px 0; font-size: 14px; color: ${BRAND_COLORS.textDark}; font-weight: 600;">${viewerName}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; font-size: 14px; color: ${BRAND_COLORS.textMuted};">Email:</td>
          <td style="padding: 5px 0; font-size: 14px;">
            <a href="mailto:${viewerEmail}" style="color: ${BRAND_COLORS.primary}; text-decoration: none;">${viewerEmail}</a>
          </td>
        </tr>
        ${viewerPhone ? `
        <tr>
          <td style="padding: 5px 0; font-size: 14px; color: ${BRAND_COLORS.textMuted};">Phone:</td>
          <td style="padding: 5px 0; font-size: 14px;">
            <a href="tel:${viewerPhone}" style="color: ${BRAND_COLORS.primary}; text-decoration: none;">${viewerPhone}</a>
          </td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding: 5px 0; font-size: 14px; color: ${BRAND_COLORS.textMuted};">Viewed:</td>
          <td style="padding: 5px 0; font-size: 14px; color: ${BRAND_COLORS.textDark};">${new Date().toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}</td>
        </tr>
      </table>
    </div>
    
    <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: ${BRAND_COLORS.textMuted};">
      💡 <strong>Tip:</strong> Respond quickly to interested viewers to increase your chances of closing a deal!
    </p>
    
    <p style="text-align: center; margin: 30px 0;">
      <a href="${process.env.FRONTEND_URL || 'https://findhouse.online'}/profile" class="button" style="background-color: ${BRAND_COLORS.primary}; border-radius: 8px; color: #ffffff !important; display: inline-block; font-size: 16px; font-weight: 600; padding: 16px 32px; text-decoration: none;">
        Manage Your Properties
      </a>
    </p>
    
    <p style="margin: 0; font-size: 14px; line-height: 1.6; color: ${BRAND_COLORS.textMuted}; text-align: center;">
      You're receiving this email because someone viewed your property on FindHouse.
    </p>
  `;
  
  return baseTemplate(content, `Someone viewed your property "${propertyTitle}" on FindHouse`);
};

/**
 * Support Notification - Internal email to support team
 */
const supportNotification = ({ ticketId, name, email, subject, message }) => {
  const content = `
    <div style="background-color: ${BRAND_COLORS.warning}15; border-radius: 12px; padding: 20px; margin-bottom: 25px; border-left: 4px solid ${BRAND_COLORS.warning};">
      <h2 style="margin: 0 0 5px 0; font-size: 20px; color: ${BRAND_COLORS.textDark};">
        🎫 New Support Request
      </h2>
      <p style="margin: 0; font-size: 14px; color: ${BRAND_COLORS.textMuted};">
        Ticket #${ticketId}
      </p>
    </div>
    
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 25px;">
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid ${BRAND_COLORS.border};">
          <strong style="color: ${BRAND_COLORS.textMuted}; font-size: 13px; text-transform: uppercase;">From</strong><br>
          <span style="font-size: 15px; color: ${BRAND_COLORS.textDark};">${name} (${email})</span>
        </td>
      </tr>
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid ${BRAND_COLORS.border};">
          <strong style="color: ${BRAND_COLORS.textMuted}; font-size: 13px; text-transform: uppercase;">Subject</strong><br>
          <span style="font-size: 15px; color: ${BRAND_COLORS.textDark};">${subject}</span>
        </td>
      </tr>
      <tr>
        <td style="padding: 10px 0;">
          <strong style="color: ${BRAND_COLORS.textMuted}; font-size: 13px; text-transform: uppercase;">Received</strong><br>
          <span style="font-size: 15px; color: ${BRAND_COLORS.textDark};">${new Date().toLocaleString()}</span>
        </td>
      </tr>
    </table>
    
    <div style="background-color: ${BRAND_COLORS.background}; border-radius: 12px; padding: 25px; border: 1px solid ${BRAND_COLORS.border};">
      <h3 style="margin: 0 0 15px 0; font-size: 14px; color: ${BRAND_COLORS.textMuted}; text-transform: uppercase;">
        Message
      </h3>
      <p style="margin: 0; font-size: 15px; line-height: 1.7; color: ${BRAND_COLORS.textDark}; white-space: pre-wrap;">
        ${message}
      </p>
    </div>
    
    <p style="margin: 25px 0 0 0; font-size: 14px; color: ${BRAND_COLORS.textMuted}; text-align: center;">
      Reply directly to this email to respond to the customer at ${email}
    </p>
  `;
  
  return baseTemplate(content, `New support ticket #${ticketId} from ${name}`);
};

/**
 * Support Confirmation - Sent to user after submitting support request
 */
const supportConfirmation = ({ name, ticketId, subject }) => {
  const content = `
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="display: inline-block; background-color: ${BRAND_COLORS.success}15; border-radius: 50%; padding: 20px;">
        <span style="font-size: 40px;">✅</span>
      </div>
    </div>
    
    <h1 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 700; color: ${BRAND_COLORS.textDark}; text-align: center;">
      We've Received Your Message
    </h1>
    
    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: ${BRAND_COLORS.textDark};">
      Hi <strong>${name}</strong>,
    </p>
    
    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: ${BRAND_COLORS.textDark};">
      Thank you for reaching out to FindHouse support. We've received your message and our team will get back to you within <strong>24 business hours</strong>.
    </p>
    
    <div style="background-color: ${BRAND_COLORS.background}; border-radius: 12px; padding: 20px; margin: 25px 0; border: 1px solid ${BRAND_COLORS.border};">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td style="padding: 5px 0;">
            <span style="font-size: 14px; color: ${BRAND_COLORS.textMuted};">Ticket Number:</span>
            <span style="font-size: 14px; color: ${BRAND_COLORS.primary}; font-weight: 600; float: right;">#${ticketId}</span>
          </td>
        </tr>
        <tr>
          <td style="padding: 5px 0;">
            <span style="font-size: 14px; color: ${BRAND_COLORS.textMuted};">Subject:</span>
            <span style="font-size: 14px; color: ${BRAND_COLORS.textDark}; float: right;">${subject}</span>
          </td>
        </tr>
      </table>
    </div>
    
    <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: ${BRAND_COLORS.textDark};">
      <strong>Need urgent help?</strong><br>
      📞 +234 (0) 800 FINDHOUSE<br>
      📧 ${process.env.SUPPORT_EMAIL || process.env.EMAIL_USER}
    </p>
    
    <p style="margin: 25px 0 0 0; font-size: 16px; line-height: 1.6; color: ${BRAND_COLORS.textDark};">
      Best regards,<br>
      <strong style="color: ${BRAND_COLORS.primary};">FindHouse Support Team</strong>
    </p>
  `;
  
  return baseTemplate(content, `We received your support request - Ticket #${ticketId}`);
};

/**
 * Newsletter Confirmation - Double opt-in email
 */
const newsletterConfirmation = ({ confirmUrl, unsubscribeUrl }) => {
  const content = `
    <div style="text-align: center; margin-bottom: 30px;">
      <span style="font-size: 50px;">📬</span>
    </div>
    
    <h1 style="margin: 0 0 20px 0; font-size: 28px; font-weight: 700; color: ${BRAND_COLORS.textDark}; text-align: center;">
      Confirm Your Subscription
    </h1>
    
    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: ${BRAND_COLORS.textDark}; text-align: center;">
      Thanks for subscribing to the FindHouse newsletter! You're one step away from receiving weekly housing tips, rental market insights, and exclusive offers.
    </p>
    
    <p style="text-align: center; margin: 30px 0;">
      <a href="${confirmUrl}" class="button" style="background-color: ${BRAND_COLORS.primary}; border-radius: 8px; color: #ffffff !important; display: inline-block; font-size: 16px; font-weight: 600; padding: 16px 32px; text-decoration: none;">
        Confirm Your Email
      </a>
    </p>
    
    <p style="margin: 0 0 30px 0; font-size: 14px; color: ${BRAND_COLORS.textMuted}; text-align: center;">
      If the button doesn't work, copy and paste this link:<br>
      <a href="${confirmUrl}" style="color: ${BRAND_COLORS.primary}; word-break: break-all;">${confirmUrl}</a>
    </p>
    
    <div style="background-color: ${BRAND_COLORS.primary}08; border-radius: 12px; padding: 25px; margin: 25px 0;">
      <h3 style="margin: 0 0 15px 0; font-size: 16px; color: ${BRAND_COLORS.primaryDark};">
        What you'll receive:
      </h3>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td style="padding: 6px 0; font-size: 14px; color: ${BRAND_COLORS.textDark};">
            📍 Rental tips for navigating the Nigerian housing market
          </td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-size: 14px; color: ${BRAND_COLORS.textDark};">
            💰 Money-saving strategies and handover fee guides
          </td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-size: 14px; color: ${BRAND_COLORS.textDark};">
            🛡️ Safety tips and scam prevention advice
          </td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-size: 14px; color: ${BRAND_COLORS.textDark};">
            🏠 Early access to premium listings
          </td>
        </tr>
      </table>
    </div>
    
    <p style="margin: 0; font-size: 12px; color: ${BRAND_COLORS.textMuted}; text-align: center;">
      Didn't sign up for this? You can safely ignore this email or <a href="${unsubscribeUrl}" style="color: ${BRAND_COLORS.textMuted};">unsubscribe</a>.
    </p>
  `;
  
  return baseTemplate(content, 'Confirm your FindHouse newsletter subscription');
};

/**
 * Newsletter Welcome - After confirming subscription
 */
const newsletterWelcome = () => {
  const content = `
    <div style="text-align: center; margin-bottom: 30px;">
      <span style="font-size: 50px;">🎉</span>
    </div>
    
    <h1 style="margin: 0 0 20px 0; font-size: 28px; font-weight: 700; color: ${BRAND_COLORS.textDark}; text-align: center;">
      You're All Set!
    </h1>
    
    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: ${BRAND_COLORS.textDark}; text-align: center;">
      Welcome to the FindHouse community! Your subscription is now active.
    </p>
    
    <div style="background-color: ${BRAND_COLORS.success}10; border-radius: 12px; padding: 25px; margin: 25px 0; border: 1px solid ${BRAND_COLORS.success}30;">
      <h3 style="margin: 0 0 15px 0; font-size: 16px; color: ${BRAND_COLORS.textDark};">
        📧 What to expect:
      </h3>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td style="padding: 6px 0; font-size: 14px; color: ${BRAND_COLORS.textDark};">
            ✓ Weekly newsletters every Monday morning
          </td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-size: 14px; color: ${BRAND_COLORS.textDark};">
            ✓ Featured property listings
          </td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-size: 14px; color: ${BRAND_COLORS.textDark};">
            ✓ Expert tips and guides
          </td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-size: 14px; color: ${BRAND_COLORS.textDark};">
            ✓ Exclusive offers and early access
          </td>
        </tr>
      </table>
    </div>
    
    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: ${BRAND_COLORS.textDark}; text-align: center;">
      In the meantime, check out our latest property listings!
    </p>
    
    <p style="text-align: center; margin: 30px 0;">
      <a href="${process.env.FRONTEND_URL || 'https://findhouse.online'}/properties" class="button" style="background-color: ${BRAND_COLORS.primary}; border-radius: 8px; color: #ffffff !important; display: inline-block; font-size: 16px; font-weight: 600; padding: 16px 32px; text-decoration: none;">
        Explore Properties
      </a>
    </p>
    
    <p style="margin: 0; font-size: 16px; line-height: 1.6; color: ${BRAND_COLORS.textDark}; text-align: center;">
      Best regards,<br>
      <strong style="color: ${BRAND_COLORS.primary};">The FindHouse Team</strong>
    </p>
  `;
  
  return baseTemplate(content, 'Welcome to the FindHouse Newsletter! 🏠');
};

/**
 * Password Reset Email
 */
const passwordReset = ({ name, resetUrl }) => {
  const content = `
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="display: inline-block; background-color: ${BRAND_COLORS.warning}15; border-radius: 50%; padding: 20px;">
        <span style="font-size: 40px;">🔐</span>
      </div>
    </div>
    
    <h1 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 700; color: ${BRAND_COLORS.textDark}; text-align: center;">
      Reset Your Password
    </h1>
    
    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: ${BRAND_COLORS.textDark};">
      Hi <strong>${name}</strong>,
    </p>
    
    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: ${BRAND_COLORS.textDark};">
      We received a request to reset the password for your FindHouse account. Click the button below to set a new password:
    </p>
    
    <p style="text-align: center; margin: 30px 0;">
      <a href="${resetUrl}" class="button" style="background-color: ${BRAND_COLORS.primary}; border-radius: 8px; color: #ffffff !important; display: inline-block; font-size: 16px; font-weight: 600; padding: 16px 32px; text-decoration: none;">
        Reset Password
      </a>
    </p>
    
    <div style="background-color: ${BRAND_COLORS.warning}10; border-radius: 12px; padding: 20px; margin: 25px 0; border: 1px solid ${BRAND_COLORS.warning}30;">
      <p style="margin: 0; font-size: 14px; color: ${BRAND_COLORS.textDark};">
        <strong>⚠️ This link expires in 1 hour.</strong><br>
        If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
      </p>
    </div>
    
    <p style="margin: 0 0 20px 0; font-size: 14px; color: ${BRAND_COLORS.textMuted};">
      If the button doesn't work, copy and paste this link into your browser:<br>
      <a href="${resetUrl}" style="color: ${BRAND_COLORS.primary}; word-break: break-all;">${resetUrl}</a>
    </p>
    
    <p style="margin: 25px 0 0 0; font-size: 16px; line-height: 1.6; color: ${BRAND_COLORS.textDark};">
      Best regards,<br>
      <strong style="color: ${BRAND_COLORS.primary};">FindHouse Support Team</strong>
    </p>
  `;
  
  return baseTemplate(content, 'Reset your FindHouse password');
};

/**
 * Booking Confirmation Email - Sent to user when booking is confirmed
 */
const bookingConfirmation = ({ name, propertyTitle, propertyLocation, bookingDate, bookingTime, ownerName, ownerPhone }) => {
  const content = `
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="display: inline-block; background-color: ${BRAND_COLORS.success}15; border-radius: 50%; padding: 20px;">
        <span style="font-size: 40px;">📅</span>
      </div>
    </div>
    
    <h1 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 700; color: ${BRAND_COLORS.textDark}; text-align: center;">
      Booking Confirmed!
    </h1>
    
    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: ${BRAND_COLORS.textDark};">
      Hi <strong>${name}</strong>,
    </p>
    
    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: ${BRAND_COLORS.textDark};">
      Your property viewing has been scheduled! Here are the details:
    </p>
    
    <div style="background-color: ${BRAND_COLORS.background}; border-radius: 12px; padding: 25px; margin: 25px 0; border: 1px solid ${BRAND_COLORS.border};">
      <h3 style="margin: 0 0 15px 0; font-size: 18px; color: ${BRAND_COLORS.primary};">
        📍 ${propertyTitle}
      </h3>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td style="padding: 8px 0; font-size: 14px; color: ${BRAND_COLORS.textMuted}; width: 100px;">Location:</td>
          <td style="padding: 8px 0; font-size: 14px; color: ${BRAND_COLORS.textDark};">${propertyLocation}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-size: 14px; color: ${BRAND_COLORS.textMuted};">Date:</td>
          <td style="padding: 8px 0; font-size: 14px; color: ${BRAND_COLORS.textDark}; font-weight: 600;">${bookingDate}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-size: 14px; color: ${BRAND_COLORS.textMuted};">Time:</td>
          <td style="padding: 8px 0; font-size: 14px; color: ${BRAND_COLORS.textDark}; font-weight: 600;">${bookingTime}</td>
        </tr>
        ${ownerName ? `
        <tr>
          <td style="padding: 8px 0; font-size: 14px; color: ${BRAND_COLORS.textMuted};">Contact:</td>
          <td style="padding: 8px 0; font-size: 14px; color: ${BRAND_COLORS.textDark};">${ownerName}</td>
        </tr>
        ` : ''}
        ${ownerPhone ? `
        <tr>
          <td style="padding: 8px 0; font-size: 14px; color: ${BRAND_COLORS.textMuted};">Phone:</td>
          <td style="padding: 8px 0; font-size: 14px;">
            <a href="tel:${ownerPhone}" style="color: ${BRAND_COLORS.primary}; text-decoration: none;">${ownerPhone}</a>
          </td>
        </tr>
        ` : ''}
      </table>
    </div>
    
    <div style="background-color: ${BRAND_COLORS.primary}08; border-radius: 12px; padding: 20px; margin: 25px 0;">
      <h4 style="margin: 0 0 10px 0; font-size: 14px; color: ${BRAND_COLORS.primaryDark};">
        💡 Tips for your viewing:
      </h4>
      <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: ${BRAND_COLORS.textDark}; line-height: 1.8;">
        <li>Arrive 5 minutes early</li>
        <li>Bring a valid ID</li>
        <li>Prepare questions for the landlord</li>
        <li>Check water pressure and electrical outlets</li>
      </ul>
    </div>
    
    <p style="margin: 25px 0 0 0; font-size: 16px; line-height: 1.6; color: ${BRAND_COLORS.textDark};">
      Good luck with your viewing!<br>
      <strong style="color: ${BRAND_COLORS.primary};">The FindHouse Team</strong>
    </p>
  `;
  
  return baseTemplate(content, `Booking confirmed for ${propertyTitle}`);
};

/**
 * Email Verification - Sent to verify user's email address
 */
const emailVerification = ({ name, verifyUrl }) => {
  const content = `
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="display: inline-block; background-color: ${BRAND_COLORS.primary}15; border-radius: 50%; padding: 20px;">
        <span style="font-size: 40px;">✉️</span>
      </div>
    </div>
    
    <h1 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 700; color: ${BRAND_COLORS.textDark}; text-align: center;">
      Verify Your Email Address
    </h1>
    
    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: ${BRAND_COLORS.textDark};">
      Hi <strong>${name}</strong>,
    </p>
    
    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: ${BRAND_COLORS.textDark};">
      Thanks for signing up with FindHouse! Please verify your email address to unlock all features and keep your account secure.
    </p>
    
    <p style="text-align: center; margin: 30px 0;">
      <a href="${verifyUrl}" class="button" style="background-color: ${BRAND_COLORS.primary}; border-radius: 8px; color: #ffffff !important; display: inline-block; font-size: 16px; font-weight: 600; padding: 16px 32px; text-decoration: none;">
        Verify Email Address
      </a>
    </p>
    
    <div style="background-color: ${BRAND_COLORS.background}; border-radius: 12px; padding: 20px; margin: 25px 0; border: 1px solid ${BRAND_COLORS.border};">
      <p style="margin: 0; font-size: 14px; color: ${BRAND_COLORS.textMuted};">
        <strong>⏰ This link expires in 24 hours.</strong><br>
        If you didn't create an account with FindHouse, you can safely ignore this email.
      </p>
    </div>
    
    <p style="margin: 0 0 20px 0; font-size: 14px; color: ${BRAND_COLORS.textMuted};">
      If the button doesn't work, copy and paste this link into your browser:<br>
      <a href="${verifyUrl}" style="color: ${BRAND_COLORS.primary}; word-break: break-all;">${verifyUrl}</a>
    </p>
    
    <div style="background-color: ${BRAND_COLORS.success}10; border-radius: 12px; padding: 20px; margin: 25px 0;">
      <h4 style="margin: 0 0 10px 0; font-size: 14px; color: ${BRAND_COLORS.textDark};">
        🎉 Once verified, you can:
      </h4>
      <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: ${BRAND_COLORS.textDark}; line-height: 1.8;">
        <li>List properties on FindHouse</li>
        <li>Save your favorite properties</li>
        <li>Book property viewings</li>
        <li>Contact property owners directly</li>
      </ul>
    </div>
    
    <p style="margin: 25px 0 0 0; font-size: 16px; line-height: 1.6; color: ${BRAND_COLORS.textDark};">
      Best regards,<br>
      <strong style="color: ${BRAND_COLORS.primary};">The FindHouse Team</strong>
    </p>
  `;
  
  return baseTemplate(content, 'Verify your email address to get started with FindHouse');
};

module.exports = {
  baseTemplate,
  welcomeEmail,
  propertyViewNotification,
  supportNotification,
  supportConfirmation,
  newsletterConfirmation,
  newsletterWelcome,
  passwordReset,
  bookingConfirmation,
  emailVerification,
  BRAND_COLORS,
  LOGO_URL
};
