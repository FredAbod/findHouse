const Notification = require('../models/notificationModel');
const SavedSearch = require('../models/savedSearchModel');
const RecentView = require('../models/recentViewModel');
const Review = require('../models/reviewModel');
const ListingReport = require('../models/listingReportModel');
const Property = require('../models/propertyModel');
const User = require('../models/userModel');

/** Two upheld-or-open reports take a listing out of public results. */
const REPORTS_TO_AUTO_HIDE = 2;

/** Excludes soft-deleted, owner-hidden and report-hidden listings. */
function publicListingFilter(extra = {}) {
  return {
    deletedAt: null,
    isHidden: { $ne: true },
    hiddenByReports: { $ne: true },
    ...extra
  };
}

class EngagementService {
  /* ---------------------------------------------------------------- notifications */

  async listNotifications(userId, { category, limit = 50 } = {}) {
    const query = { user: userId };
    if (category && category !== 'all') query.category = category;

    const items = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(Math.min(Number(limit) || 50, 100))
      .populate('property', 'title images price')
      .lean();

    const unread = await Notification.countDocuments({ user: userId, read: false });
    return { notifications: items, unread };
  }

  async markNotificationRead(userId, notificationId) {
    const updated = await Notification.findOneAndUpdate(
      { _id: notificationId, user: userId },
      { read: true },
      { new: true }
    );
    if (!updated) throw Object.assign(new Error('Notification not found'), { statusCode: 404 });
    return updated;
  }

  async markAllNotificationsRead(userId) {
    await Notification.updateMany({ user: userId, read: false }, { read: true });
    return { success: true };
  }

  /** Used by the rest of the app to raise a notification without duplicating shape. */
  async notify(userId, payload) {
    return Notification.create({ user: userId, ...payload });
  }

  /* --------------------------------------------------------------- saved searches */

  async listSavedSearches(userId) {
    return SavedSearch.find({ user: userId }).sort({ createdAt: -1 }).lean();
  }

  async createSavedSearch(userId, { label, filters, alertsEnabled }) {
    if (!label) throw Object.assign(new Error('A label is required'), { statusCode: 400 });
    return SavedSearch.create({
      user: userId,
      label,
      filters: filters || {},
      alertsEnabled: alertsEnabled !== false
    });
  }

  async updateSavedSearch(userId, id, patch) {
    const updated = await SavedSearch.findOneAndUpdate({ _id: id, user: userId }, patch, { new: true });
    if (!updated) throw Object.assign(new Error('Saved search not found'), { statusCode: 404 });
    return updated;
  }

  async deleteSavedSearch(userId, id) {
    const removed = await SavedSearch.findOneAndDelete({ _id: id, user: userId });
    if (!removed) throw Object.assign(new Error('Saved search not found'), { statusCode: 404 });
    return { success: true };
  }

  /** Builds the mongo query a saved search represents. */
  buildSearchQuery(filters = {}) {
    const query = publicListingFilter({ status: { $ne: 'rented' } });
    if (filters.state) query['location.state'] = new RegExp(`^${filters.state}$`, 'i');
    if (filters.city) query['location.city'] = new RegExp(filters.city, 'i');
    if (filters.category) query.category = filters.category;
    if (filters.type) query.type = filters.type;
    if (filters.bedrooms) query.bedrooms = { $gte: filters.bedrooms };
    if (filters.noAgentFee) query.noAgentFee = true;
    if (filters.minPrice || filters.maxPrice) {
      query.price = {};
      if (filters.minPrice) query.price.$gte = filters.minPrice;
      if (filters.maxPrice) query.price.$lte = filters.maxPrice;
    }
    return query;
  }

  /**
   * How many listings a saved search has picked up since it last ran. Powers
   * the "4 new matches in Lekki" banner without a background job having run yet.
   */
  async countNewMatches(search) {
    const query = this.buildSearchQuery(search.filters);
    query.createdAt = { $gt: search.lastRunAt || search.createdAt };
    return Property.countDocuments(query);
  }

  /** Headline the home screen shows: the most productive saved search. */
  async topMatchAlert(userId) {
    const searches = await SavedSearch.find({ user: userId, alertsEnabled: true }).lean();
    if (!searches.length) return null;

    const counted = await Promise.all(
      searches.map(async (search) => ({ search, count: await this.countNewMatches(search) }))
    );
    counted.sort((a, b) => b.count - a.count);
    const best = counted[0];
    if (!best || best.count === 0) return null;

    return {
      savedSearchId: best.search._id,
      label: best.search.label,
      city: best.search.filters?.city || best.search.filters?.state || null,
      count: best.count,
      since: best.search.lastRunAt || best.search.createdAt
    };
  }

  /**
   * Runs every alerting saved search and raises a notification per user whose
   * search picked up new stock. Called from the cron scheduler.
   */
  async runSavedSearchAlerts() {
    const searches = await SavedSearch.find({ alertsEnabled: true });
    let raised = 0;

    for (const search of searches) {
      const query = this.buildSearchQuery(search.filters);
      query.createdAt = { $gt: search.lastRunAt || search.createdAt };

      const matches = await Property.find(query).select('title images').limit(5).lean();
      if (matches.length) {
        await this.notify(search.user, {
          category: 'matches',
          tone: 'primary',
          title: `${matches.length} new home${matches.length === 1 ? '' : 's'} match “${search.label}”`,
          body: matches[0].title,
          property: matches[0]._id,
          thumb: matches[0].images?.[0] || null
        });
        raised += 1;
      }

      search.lastRunAt = new Date();
      search.lastMatchCount = matches.length;
      await search.save();
    }

    return { searches: searches.length, notificationsRaised: raised };
  }

  /* -------------------------------------------------------------- recently viewed */

  async recordView(userId, propertyId) {
    const existing = await RecentView.findOne({ user: userId, property: propertyId });
    if (existing) {
      existing.count += 1;
      existing.viewedAt = new Date();
      await existing.save();
      return existing;
    }
    return RecentView.create({ user: userId, property: propertyId });
  }

  async listRecentViews(userId, limit = 30) {
    const rows = await RecentView.find({ user: userId })
      .sort({ viewedAt: -1 })
      .limit(Math.min(Number(limit) || 30, 60))
      .populate({
        path: 'property',
        match: { deletedAt: null },
        populate: { path: 'owner', select: 'name nickname isVerified verification.status' }
      })
      .lean();

    return rows
      .filter((row) => row.property)
      .map((row) => ({
        property: row.property,
        count: row.count,
        viewedAt: row.viewedAt
      }));
  }

  async clearRecentViews(userId) {
    await RecentView.deleteMany({ user: userId });
    return { success: true };
  }

  /* ---------------------------------------------------------------------- reviews */

  async listReviews(subjectUserId) {
    return Review.find({ subject: subjectUserId })
      .sort({ createdAt: -1 })
      .limit(30)
      .populate('author', 'name nickname profilePicture')
      .lean();
  }

  async reviewSummary(subjectUserId) {
    const rows = await Review.find({ subject: subjectUserId }).select('rating').lean();
    if (!rows.length) return { rating: null, count: 0 };
    const total = rows.reduce((sum, r) => sum + r.rating, 0);
    return { rating: Math.round((total / rows.length) * 10) / 10, count: rows.length };
  }

  async createReview(authorId, { subject, property, rating, body, relationship }) {
    if (!subject) throw Object.assign(new Error('subject is required'), { statusCode: 400 });
    if (String(subject) === String(authorId)) {
      throw Object.assign(new Error('You cannot review yourself'), { statusCode: 400 });
    }
    const numericRating = Number(rating);
    if (!numericRating || numericRating < 1 || numericRating > 5) {
      throw Object.assign(new Error('rating must be between 1 and 5'), { statusCode: 400 });
    }

    const review = await Review.findOneAndUpdate(
      { author: authorId, subject },
      { property: property || null, rating: numericRating, body: body || '', relationship: relationship || '' },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).populate('author', 'name nickname profilePicture');

    await this.notify(subject, {
      category: 'account',
      tone: 'neutral',
      title: 'You have a new review',
      body: `${numericRating} ★ — ${body ? body.slice(0, 80) : 'No comment left.'}`
    });

    return review;
  }

  /* ---------------------------------------------------------------------- reports */

  async reportListing(reporterId, propertyId, { reason, detail, evidenceUrl }) {
    const property = await Property.findById(propertyId);
    if (!property || property.deletedAt) {
      throw Object.assign(new Error('Property not found'), { statusCode: 404 });
    }

    try {
      await ListingReport.create({
        property: propertyId,
        reporter: reporterId || null,
        reason,
        detail: detail || '',
        evidenceUrl: evidenceUrl || null
      });
    } catch (error) {
      // Duplicate key means this user already reported this listing.
      if (error.code === 11000) {
        return { success: true, alreadyReported: true, hidden: property.hiddenByReports };
      }
      throw error;
    }

    const openReports = await ListingReport.countDocuments({ property: propertyId, status: 'open' });
    property.reportCount = openReports;

    let hidden = property.hiddenByReports;
    if (openReports >= REPORTS_TO_AUTO_HIDE && !property.hiddenByReports) {
      property.hiddenByReports = true;
      hidden = true;
      await this.notify(property.owner, {
        category: 'account',
        tone: 'warning',
        title: 'A listing was hidden pending review',
        body: `“${property.title}” received multiple reports and is hidden while our team checks it.`,
        property: property._id
      });
    }
    await property.save();

    return { success: true, reportCount: openReports, hidden };
  }

  /* -------------------------------------------------------------------- favourites */

  /**
   * Price-drop notifications for everyone who saved a listing. Called when an
   * owner lowers the rent — the edit screen promises exactly this.
   */
  async notifyPriceDrop(property, previousPrice) {
    if (!property?.likes?.length) return { notified: 0 };
    const drop = previousPrice - property.price;
    if (drop <= 0) return { notified: 0 };

    await Promise.all(
      property.likes.map((userId) =>
        this.notify(userId, {
          category: 'matches',
          tone: 'success',
          title: `Price dropped ₦${drop.toLocaleString('en-NG')}`,
          body: `${property.title} — a home on your shortlist.`,
          property: property._id,
          thumb: property.images?.[0] || null
        })
      )
    );

    return { notified: property.likes.length };
  }

  /* ------------------------------------------------------------- area suggestions */

  /**
   * Typeahead for the search overlay: distinct cities with a live listing count,
   * so the user knows what a tap is worth before making it.
   */
  async suggestAreas({ q, state, limit = 8 } = {}) {
    const match = publicListingFilter({ status: { $ne: 'rented' } });
    if (state) match['location.state'] = new RegExp(`^${state}$`, 'i');
    if (q) match['location.city'] = new RegExp(String(q).trim(), 'i');

    return Property.aggregate([
      { $match: match },
      {
        $group: {
          _id: { city: '$location.city', state: '$location.state' },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: Math.min(Number(limit) || 8, 20) },
      {
        $project: {
          _id: 0,
          name: '$_id.city',
          state: '$_id.state',
          count: 1
        }
      }
    ]);
  }

  /** Distinct states with counts — powers the city chip rail on Home. */
  async topCities(limit = 6) {
    const rows = await Property.aggregate([
      { $match: publicListingFilter({ status: { $ne: 'rented' } }) },
      { $group: { _id: '$location.state', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: Math.min(Number(limit) || 6, 12) },
      { $project: { _id: 0, name: '$_id', count: 1 } }
    ]);
    return rows.filter((row) => row.name);
  }

  /* ------------------------------------------------------------ profile aggregates */

  /** Counters shown on the Profile dashboard. */
  async profileStats(userId) {
    const [user, searches, viewings] = await Promise.all([
      User.findById(userId).select('favoriteProperties').lean(),
      SavedSearch.countDocuments({ user: userId }),
      Property.countDocuments({ currentTenant: userId })
    ]);

    return {
      saved: user?.favoriteProperties?.length || 0,
      searches,
      viewings
    };
  }
}

module.exports = new EngagementService();
module.exports.publicListingFilter = publicListingFilter;
