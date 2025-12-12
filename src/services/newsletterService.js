const NewsletterSubscriber = require('../models/newsletterSubscriberModel');
const emailService = require('./emailService');
const crypto = require('crypto');

class NewsletterService {
  generateConfirmToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  async subscribe(email, source, ipAddress, userAgent) {
    try {
      const cleanEmail = email.toLowerCase().trim();

      // Check if already subscribed
      const existing = await NewsletterSubscriber.findOne({ email: cleanEmail });
      
      if (existing) {
        if (existing.status === 'active') {
          return {
            success: false,
            error: 'This email is already subscribed to our newsletter.',
            statusCode: 409
          };
        }
        
        // If pending or unsubscribed, allow re-subscription
        if (existing.status === 'pending' || existing.status === 'unsubscribed') {
          // Generate new token and resend confirmation
          existing.confirmToken = this.generateConfirmToken();
          existing.status = 'pending';
          existing.subscribedAt = new Date();
          existing.source = source || existing.source;
          existing.ipAddress = ipAddress;
          existing.userAgent = userAgent;
          await existing.save();

          // Send confirmation email
          const confirmUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/newsletter/confirm/${existing.confirmToken}`;
          const unsubscribeUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/newsletter/unsubscribe/${existing.confirmToken}`;

          try {
            await emailService.sendNewsletterConfirmation({
              to: cleanEmail,
              confirmUrl,
              unsubscribeUrl
            });
          } catch (emailError) {
            console.error('Failed to send newsletter confirmation:', emailError);
          }

          return {
            success: true,
            message: "You've been successfully subscribed! Please check your email to confirm.",
            email: cleanEmail
          };
        }
      }

      // Create new subscriber
      const confirmToken = this.generateConfirmToken();
      
      const subscriber = await NewsletterSubscriber.create({
        email: cleanEmail,
        source: source || 'unknown',
        status: 'pending',
        confirmToken,
        ipAddress,
        userAgent,
        subscribedAt: new Date()
      });

      // Send confirmation email
      const confirmUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/newsletter/confirm/${confirmToken}`;
      const unsubscribeUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/newsletter/unsubscribe/${confirmToken}`;

      try {
        await emailService.sendNewsletterConfirmation({
          to: cleanEmail,
          confirmUrl,
          unsubscribeUrl
        });
      } catch (emailError) {
        console.error('Failed to send newsletter confirmation:', emailError);
        // Don't fail the request if email fails
      }

      return {
        success: true,
        message: "You've been successfully subscribed! Please check your email to confirm.",
        email: cleanEmail
      };
    } catch (error) {
      console.error('Error subscribing to newsletter:', error);
      throw error;
    }
  }

  async confirmSubscription(token) {
    try {
      const subscriber = await NewsletterSubscriber.findOne({ confirmToken: token });

      if (!subscriber) {
        return {
          success: false,
          error: 'Invalid or expired confirmation link.',
          statusCode: 404
        };
      }

      if (subscriber.status === 'active') {
        return {
          success: true,
          message: 'Your subscription is already confirmed!',
          alreadyConfirmed: true
        };
      }

      // Update status to active
      subscriber.status = 'active';
      subscriber.confirmedAt = new Date();
      await subscriber.save();

      // Send welcome email
      try {
        await emailService.sendNewsletterWelcome({
          to: subscriber.email
        });
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
      }

      return {
        success: true,
        message: 'Your subscription has been confirmed! Welcome to FindHouse newsletter.',
        email: subscriber.email
      };
    } catch (error) {
      console.error('Error confirming subscription:', error);
      throw error;
    }
  }

  async unsubscribe(token) {
    try {
      const subscriber = await NewsletterSubscriber.findOne({ confirmToken: token });

      if (!subscriber) {
        return {
          success: false,
          error: 'Invalid unsubscribe link.',
          statusCode: 404
        };
      }

      if (subscriber.status === 'unsubscribed') {
        return {
          success: true,
          message: 'You are already unsubscribed.',
          alreadyUnsubscribed: true
        };
      }

      // Update status to unsubscribed
      subscriber.status = 'unsubscribed';
      subscriber.unsubscribedAt = new Date();
      await subscriber.save();

      return {
        success: true,
        message: 'You have been successfully unsubscribed from our newsletter.',
        email: subscriber.email
      };
    } catch (error) {
      console.error('Error unsubscribing:', error);
      throw error;
    }
  }

  async unsubscribeByEmail(email) {
    try {
      const cleanEmail = email.toLowerCase().trim();
      const subscriber = await NewsletterSubscriber.findOne({ email: cleanEmail });

      if (!subscriber) {
        return {
          success: false,
          error: 'Email not found in our subscriber list.',
          statusCode: 404
        };
      }

      if (subscriber.status === 'unsubscribed') {
        return {
          success: true,
          message: 'You are already unsubscribed.',
          alreadyUnsubscribed: true
        };
      }

      subscriber.status = 'unsubscribed';
      subscriber.unsubscribedAt = new Date();
      await subscriber.save();

      return {
        success: true,
        message: 'You have been successfully unsubscribed.',
        email: cleanEmail
      };
    } catch (error) {
      console.error('Error unsubscribing by email:', error);
      throw error;
    }
  }

  async getActiveSubscribers() {
    const subscribers = await NewsletterSubscriber.find({ 
      status: 'active' 
    }).sort({ confirmedAt: -1 });
    return subscribers;
  }

  async getSubscriberStats() {
    const stats = await NewsletterSubscriber.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const result = {
      total: 0,
      active: 0,
      pending: 0,
      unsubscribed: 0,
      bounced: 0
    };

    stats.forEach(stat => {
      result[stat._id] = stat.count;
      result.total += stat.count;
    });

    return result;
  }
}

module.exports = new NewsletterService();
