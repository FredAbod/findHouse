const nodemailer = require('nodemailer');

class EmailConfig {
  constructor() {
    this.transporter = null;
  }

  createTransporter() {
    if (this.transporter) {
      return this.transporter;
    }

    // Configure Zoho SMTP
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.zoho.com',
      port: process.env.EMAIL_PORT || 465,
      secure: true, // use SSL
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      },
      tls: {
        rejectUnauthorized: true
      }
    });

    // Verify connection configuration
    this.transporter.verify((error, success) => {
      if (error) {
        console.error('Email configuration error:', error);
      } else {
        console.log('Email server is ready to send messages');
      }
    });

    return this.transporter;
  }

  async sendMail(mailOptions) {
    const transporter = this.createTransporter();
    
    try {
      const info = await transporter.sendMail({
        from: mailOptions.from || `"FindHouse" <${process.env.EMAIL_USER}>`,
        ...mailOptions
      });
      
      console.log('Email sent:', info.messageId);
      return info;
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }
}

module.exports = new EmailConfig();
