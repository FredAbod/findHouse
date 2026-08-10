const Property = require('../models/propertyModel');
const RecentView = require('../models/recentViewModel');
const messagingService = require('./messagingService');

const RANGES = { '7d': 7, '30d': 30, '90d': 90 };

function startOfRange(range) {
  const days = RANGES[range] || RANGES['30d'];
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  from.setDate(from.getDate() - days);
  return { from, days };
}

/**
 * The landlord dashboard the web product never had. Views come from the
 * per-user RecentView rows (owner self-views excluded), enquiries from
 * conversations, saves from the likes array.
 */
class OwnerAnalyticsService {
  async overview(ownerId, range = '30d') {
    const { from, days } = startOfRange(range);
    const previousFrom = new Date(from);
    previousFrom.setDate(previousFrom.getDate() - days);

    const properties = await Property.find({ owner: ownerId, deletedAt: null })
      .select('title price status viewCount likes images createdAt')
      .lean();
    const propertyIds = properties.map((p) => p._id);

    const [currentViews, previousViews, enquiryCounts, replyStats] = await Promise.all([
      RecentView.find({
        property: { $in: propertyIds },
        user: { $ne: ownerId },
        viewedAt: { $gte: from }
      })
        .select('property count viewedAt')
        .lean(),
      RecentView.countDocuments({
        property: { $in: propertyIds },
        user: { $ne: ownerId },
        viewedAt: { $gte: previousFrom, $lt: from }
      }),
      messagingService.enquiryCounts(ownerId),
      messagingService.replyStats(ownerId)
    ]);

    const viewsTotal = currentViews.reduce((sum, row) => sum + (row.count || 1), 0);
    const savesTotal = properties.reduce((sum, p) => sum + (p.likes?.length || 0), 0);
    const enquiriesTotal = Object.values(enquiryCounts).reduce((sum, n) => sum + n, 0);

    // Views bucketed by weekday, for the "Views per day" chart.
    const perDay = Array.from({ length: 7 }, () => 0);
    currentViews.forEach((row) => {
      const day = (new Date(row.viewedAt).getDay() + 6) % 7; // Monday-first
      perDay[day] += row.count || 1;
    });

    const viewsByProperty = currentViews.reduce((acc, row) => {
      const key = String(row.property);
      acc[key] = (acc[key] || 0) + (row.count || 1);
      return acc;
    }, {});

    const byListing = properties
      .map((property) => ({
        _id: property._id,
        title: property.title,
        status: property.status,
        image: property.images?.[0] || null,
        views: viewsByProperty[String(property._id)] || 0,
        saves: property.likes?.length || 0,
        enquiries: enquiryCounts[String(property._id)] || 0
      }))
      .sort((a, b) => b.views - a.views);

    return {
      range,
      totals: {
        views: viewsTotal,
        viewsChangePct: previousViews ? Math.round(((viewsTotal - previousViews) / previousViews) * 100) : null,
        enquiries: enquiriesTotal,
        saves: savesTotal,
        replyMinutes: replyStats.replyMinutes,
        replyRate: replyStats.replyRate
      },
      viewsPerDay: perDay,
      byListing,
      insight: this.buildInsight(byListing)
    };
  }

  /**
   * Turns the numbers into one piece of advice — analytics nobody acts on is
   * just decoration.
   */
  buildInsight(byListing) {
    const starved = byListing.find((l) => l.views >= 40 && l.enquiries === 0 && l.status !== 'rented');
    if (starved) {
      return {
        propertyId: starved._id,
        title: `${starved.title} is getting views but no enquiries`,
        body: 'Lowering the rent or adding a video walkthrough usually fixes this.'
      };
    }

    const noVideo = byListing.find((l) => l.views < 10 && l.status === 'available');
    if (noVideo) {
      return {
        propertyId: noVideo._id,
        title: `${noVideo.title} is barely being seen`,
        body: 'Listings with 6+ photos and a walkthrough get several times more enquiries.'
      };
    }

    const best = byListing[0];
    if (best && best.enquiries > 0) {
      return {
        propertyId: best._id,
        title: `${best.title} is your strongest listing`,
        body: `${best.views} views and ${best.enquiries} enquiries this period — reply fast to keep the momentum.`
      };
    }

    return null;
  }

  /**
   * Comparable rents for the pricing step of the upload wizard, so the owner
   * prices against the market instead of guessing.
   */
  async priceGuidance({ state, city, category, bedrooms }) {
    const query = {
      deletedAt: null,
      isHidden: { $ne: true },
      price: { $gt: 0 }
    };
    if (state) query['location.state'] = new RegExp(`^${state}$`, 'i');
    if (city) query['location.city'] = new RegExp(city, 'i');
    if (category) query.category = category;
    if (bedrooms) query.bedrooms = Number(bedrooms);

    const rows = await Property.find(query).select('price').lean();
    if (rows.length < 3) return { sample: rows.length, suggestedLow: null, suggestedHigh: null, buckets: [] };

    const prices = rows.map((r) => r.price).sort((a, b) => a - b);
    const at = (q) => prices[Math.min(prices.length - 1, Math.floor(prices.length * q))];
    const low = at(0.35);
    const high = at(0.65);

    // Nine-bucket histogram across the observed range.
    const min = prices[0];
    const max = prices[prices.length - 1];
    const span = Math.max(1, max - min);
    const buckets = Array.from({ length: 9 }, () => 0);
    prices.forEach((price) => {
      const index = Math.min(8, Math.floor(((price - min) / span) * 9));
      buckets[index] += 1;
    });

    return {
      sample: rows.length,
      min,
      max,
      suggestedLow: low,
      suggestedHigh: high,
      buckets
    };
  }
}

/**
 * Rent trend for an area — data no competitor surfaces, and the reason a
 * renter comes back between searches.
 *
 * Compares the median asking rent of listings published in the last 90 days
 * against the 90 days before that. Median, not mean, because one ₦450m
 * mansion would otherwise "move the market".
 */
async function priceTrend({ state, city, bedrooms } = {}) {
  const match = {
    deletedAt: null,
    isHidden: { $ne: true },
    hiddenByReports: { $ne: true },
    price: { $gt: 0 }
  };
  if (state) match['location.state'] = new RegExp(`^${state}$`, 'i');
  if (city) match['location.city'] = new RegExp(city, 'i');
  if (bedrooms) match.bedrooms = Number(bedrooms);

  const now = new Date();
  const ninety = new Date(now);
  ninety.setDate(ninety.getDate() - 90);
  const oneEighty = new Date(now);
  oneEighty.setDate(oneEighty.getDate() - 180);

  const rows = await Property.find({ ...match, createdAt: { $gte: oneEighty } })
    .select('price createdAt')
    .lean();

  const median = (values) => {
    if (!values.length) return null;
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  };

  const recent = median(rows.filter((r) => r.createdAt >= ninety).map((r) => r.price));
  const previous = median(
    rows.filter((r) => r.createdAt < ninety && r.createdAt >= oneEighty).map((r) => r.price)
  );

  const changePct =
    recent !== null && previous !== null && previous > 0
      ? Math.round(((recent - previous) / previous) * 1000) / 10
      : null;

  // Whole-market context, so the number means something even with thin data.
  const all = await Property.find(match).select('price bedrooms').lean();
  const overallMedian = median(all.map((p) => p.price));

  return {
    area: city || state || 'Nigeria',
    sample: all.length,
    recentSample: rows.filter((r) => r.createdAt >= ninety).length,
    medianRent: overallMedian,
    medianRecent: recent,
    medianPrevious: previous,
    changePct,
    /** Enough data to say something honest? */
    reliable: rows.filter((r) => r.createdAt >= ninety).length >= 5 && previous !== null
  };
}

OwnerAnalyticsService.prototype.priceTrend = priceTrend;

module.exports = new OwnerAnalyticsService();
