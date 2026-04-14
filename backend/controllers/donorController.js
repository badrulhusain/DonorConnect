const Donor = require('../models/Donor');
const MessageLog = require('../models/MessageLog');
const logger = require('../utils/logger');

const getDonors = async (req, res, next) => {
  try {
    const { search, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    const query = { isActive: true };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [donors, total] = await Promise.all([
      Donor.find(query).sort(sort).skip(skip).limit(Number(limit)).lean(),
      Donor.countDocuments(query),
    ]);

    const donorIds = donors.map((d) => d._id);
    const lastLogs = await MessageLog.aggregate([
      { $match: { donorId: { $in: donorIds } } },
      { $sort: { createdAt: -1 } },
      { $group: { _id: '$donorId', status: { $first: '$status' }, sentAt: { $first: '$sentAt' } } },
    ]);

    const logMap = lastLogs.reduce((acc, l) => {
      acc[l._id.toString()] = { messageStatus: l.status, messageSentAt: l.sentAt };
      return acc;
    }, {});

    const enriched = donors.map((d) => ({
      ...d,
      ...(logMap[d._id.toString()] || { messageStatus: null, messageSentAt: null }),
    }));

    res.json({
      success: true,
      data: enriched,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
    });
  } catch (err) {
    next(err);
  }
};

const addDonor = async (req, res, next) => {
  try {
    const { name, phone, language = 'en', notes } = req.body;

    const donor = await Donor.create({ name, phone, language, notes });
    logger.info('Donor added', { donorId: donor._id, name });

    res.status(201).json({ success: true, data: donor });
  } catch (err) {
    next(err);
  }
};

const updateDonor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Prevent direct amount manipulation via this route
    delete updates.totalAmount;
    delete updates.lastPayment;
    delete updates.lastPaidAt;

    const donor = await Donor.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!donor) return res.status(404).json({ success: false, message: 'Donor not found' });

    logger.info('Donor updated', { donorId: id });
    res.json({ success: true, data: donor });
  } catch (err) {
    next(err);
  }
};

const deleteDonor = async (req, res, next) => {
  try {
    const donor = await Donor.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!donor) return res.status(404).json({ success: false, message: 'Donor not found' });

    logger.info('Donor deactivated', { donorId: req.params.id });
    res.json({ success: true, message: 'Donor removed' });
  } catch (err) {
    next(err);
  }
};

const getAnalytics = async (req, res, next) => {
  try {
    const [totals, recentPayments, messageStats] = await Promise.all([
      Donor.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: null,
            totalDonors: { $sum: 1 },
            totalContributions: { $sum: '$totalAmount' },
            avgContribution: { $avg: '$totalAmount' },
          },
        },
      ]),
      Donor.find({ isActive: true, lastPaidAt: { $ne: null } })
        .sort({ lastPaidAt: -1 })
        .limit(5)
        .select('name lastPayment lastPaidAt')
        .lean(),
      MessageLog.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const stats = totals[0] || { totalDonors: 0, totalContributions: 0, avgContribution: 0 };
    const msgMap = messageStats.reduce((acc, m) => { acc[m._id] = m.count; return acc; }, {});

    res.json({
      success: true,
      data: {
        totalDonors: stats.totalDonors,
        totalContributions: stats.totalContributions,
        avgContribution: Math.round(stats.avgContribution || 0),
        messagesSent: msgMap.sent || 0,
        messagesFailed: msgMap.failed || 0,
        recentPayments,
      },
    });
  } catch (err) {
    next(err);
  }
};

const exportCSV = async (req, res, next) => {
  try {
    const donors = await Donor.find({ isActive: true }).lean();

    const header = 'Name,Phone,Total Amount,Last Payment,Last Paid At,Language\n';
    const rows = donors.map((d) =>
      [
        `"${d.name}"`,
        d.phone,
        d.totalAmount,
        d.lastPayment || 0,
        d.lastPaidAt ? new Date(d.lastPaidAt).toISOString() : '',
        d.language,
      ].join(',')
    );

    const csv = header + rows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=donors-${Date.now()}.csv`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
};

module.exports = { getDonors, addDonor, updateDonor, deleteDonor, getAnalytics, exportCSV };
