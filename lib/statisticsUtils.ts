import { Submission } from './submissionStore';
import { differenceInDays, differenceInHours, format, parse } from 'date-fns';

export interface Statistics {
  // Overall metrics
  totalSent: number;
  totalPaid: number;
  totalPartial: number;
  totalDispute: number;
  totalUnpaid: number;

  // Recovery rates
  paymentRate: number; // % of letters that got paid (full or partial)
  fullPaymentRate: number; // % that got paid in full
  averageRecoveryRate: number; // Average % of claimed amount recovered

  // Financial metrics
  totalAmountClaimed: number;
  totalAmountRecovered: number;
  averageClaimAmount: number;
  averageRecoveryAmount: number;

  // Response metrics
  responseRate: number; // % of debtors who responded
  averageResponseTimeHours: number;
  averageResponseTimeDays: number;

  // Time-based insights
  sendTimeAnalysis: {
    morning: { sent: number; paid: number; paymentRate: number }; // 6am-12pm
    afternoon: { sent: number; paid: number; paymentRate: number }; // 12pm-6pm
    evening: { sent: number; paid: number; paymentRate: number }; // 6pm-12am
    night: { sent: number; paid: number; paymentRate: number }; // 12am-6am
  };

  dayOfWeekAnalysis: {
    [key: string]: { sent: number; paid: number; paymentRate: number };
  };

  // Closure metrics
  totalClosed: number;
  closureReasons: {
    paid_full: number;
    paid_partial: number;
    no_response: number;
    dispute: number;
    withdrawn: number;
  };

  // Delivery method comparison
  deliveryMethodAnalysis: {
    email: { sent: number; paid: number; paymentRate: number; avgRecoveryRate: number };
    self: { sent: number; paid: number; paymentRate: number; avgRecoveryRate: number };
  };
}

/**
 * Calculate comprehensive statistics from submissions
 */
export function calculateStatistics(submissions: Submission[]): Statistics {
  // Filter to only approved submissions (actually sent)
  const sentSubmissions = submissions.filter(s => s.status === 'approved');
  const totalSent = sentSubmissions.length;

  if (totalSent === 0) {
    return getEmptyStatistics();
  }

  // Payment status counts
  const paidSubmissions = sentSubmissions.filter(s => s.paymentStatus === 'paid');
  const partialSubmissions = sentSubmissions.filter(s => s.paymentStatus === 'partial');
  const disputeSubmissions = sentSubmissions.filter(s => s.paymentStatus === 'dispute');
  const unpaidSubmissions = sentSubmissions.filter(s => !s.paymentStatus || s.paymentStatus === 'unpaid');

  const totalPaid = paidSubmissions.length;
  const totalPartial = partialSubmissions.length;
  const totalDispute = disputeSubmissions.length;
  const totalUnpaid = unpaidSubmissions.length;

  // Recovery rates
  const paidOrPartial = totalPaid + totalPartial;
  const paymentRate = (paidOrPartial / totalSent) * 100;
  const fullPaymentRate = (totalPaid / totalSent) * 100;

  // Financial metrics
  const totalAmountClaimed = sentSubmissions.reduce((sum, s) => sum + parseFloat(s.letterData.amountOwed || 0), 0);
  const averageClaimAmount = totalAmountClaimed / totalSent;

  // Calculate total recovered and recovery rates
  const submissionsWithRecovery = [...paidSubmissions, ...partialSubmissions];
  const totalAmountRecovered = submissionsWithRecovery.reduce((sum, s) => {
    if (s.paymentAmount) {
      return sum + parseFloat(s.paymentAmount.toString());
    }
    // If no payment amount specified but status is paid, assume full amount
    if (s.paymentStatus === 'paid') {
      return sum + parseFloat(s.letterData.amountOwed || 0);
    }
    return sum;
  }, 0);

  const averageRecoveryAmount = paidOrPartial > 0 ? totalAmountRecovered / paidOrPartial : 0;
  const averageRecoveryRate = totalAmountClaimed > 0 ? (totalAmountRecovered / totalAmountClaimed) * 100 : 0;

  // Response metrics
  const respondedSubmissions = sentSubmissions.filter(s => s.debtorResponded);
  const responseRate = (respondedSubmissions.length / totalSent) * 100;

  // Calculate average response time
  const responseTimes: number[] = [];
  respondedSubmissions.forEach(s => {
    if (s.reviewedAt && s.debtorResponseDate) {
      const sentDate = new Date(s.reviewedAt);
      const responseDate = new Date(s.debtorResponseDate);
      const hoursToRespond = differenceInHours(responseDate, sentDate);
      if (hoursToRespond >= 0) {
        responseTimes.push(hoursToRespond);
      }
    }
  });

  const averageResponseTimeHours = responseTimes.length > 0
    ? responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length
    : 0;
  const averageResponseTimeDays = averageResponseTimeHours / 24;

  // Send time analysis
  const sendTimeAnalysis = analyzeSendTime(sentSubmissions);

  // Day of week analysis
  const dayOfWeekAnalysis = analyzeDayOfWeek(sentSubmissions);

  // Closure metrics
  const closedSubmissions = sentSubmissions.filter(s => s.caseClosed);
  const totalClosed = closedSubmissions.length;

  const closureReasons = {
    paid_full: closedSubmissions.filter(s => s.caseClosureReason === 'paid_full').length,
    paid_partial: closedSubmissions.filter(s => s.caseClosureReason === 'paid_partial').length,
    no_response: closedSubmissions.filter(s => s.caseClosureReason === 'no_response').length,
    dispute: closedSubmissions.filter(s => s.caseClosureReason === 'dispute').length,
    withdrawn: closedSubmissions.filter(s => s.caseClosureReason === 'withdrawn').length,
  };

  // Delivery method analysis
  const deliveryMethodAnalysis = analyzeDeliveryMethod(sentSubmissions);

  return {
    totalSent,
    totalPaid,
    totalPartial,
    totalDispute,
    totalUnpaid,
    paymentRate,
    fullPaymentRate,
    averageRecoveryRate,
    totalAmountClaimed,
    totalAmountRecovered,
    averageClaimAmount,
    averageRecoveryAmount,
    responseRate,
    averageResponseTimeHours,
    averageResponseTimeDays,
    sendTimeAnalysis,
    dayOfWeekAnalysis,
    totalClosed,
    closureReasons,
    deliveryMethodAnalysis,
  };
}

function analyzeSendTime(submissions: Submission[]) {
  const timeSlots = {
    morning: { sent: 0, paid: 0 },
    afternoon: { sent: 0, paid: 0 },
    evening: { sent: 0, paid: 0 },
    night: { sent: 0, paid: 0 },
  };

  submissions.forEach(s => {
    if (!s.reviewedAt) return;

    const sentDate = new Date(s.reviewedAt);
    const hour = sentDate.getHours();

    let slot: 'morning' | 'afternoon' | 'evening' | 'night';
    if (hour >= 6 && hour < 12) slot = 'morning';
    else if (hour >= 12 && hour < 18) slot = 'afternoon';
    else if (hour >= 18 && hour < 24) slot = 'evening';
    else slot = 'night';

    timeSlots[slot].sent++;
    if (s.paymentStatus === 'paid' || s.paymentStatus === 'partial') {
      timeSlots[slot].paid++;
    }
  });

  return {
    morning: { ...timeSlots.morning, paymentRate: calculateRate(timeSlots.morning.paid, timeSlots.morning.sent) },
    afternoon: { ...timeSlots.afternoon, paymentRate: calculateRate(timeSlots.afternoon.paid, timeSlots.afternoon.sent) },
    evening: { ...timeSlots.evening, paymentRate: calculateRate(timeSlots.evening.paid, timeSlots.evening.sent) },
    night: { ...timeSlots.night, paymentRate: calculateRate(timeSlots.night.paid, timeSlots.night.sent) },
  };
}

function analyzeDayOfWeek(submissions: Submission[]) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayStats: any = {};

  days.forEach(day => {
    dayStats[day] = { sent: 0, paid: 0 };
  });

  submissions.forEach(s => {
    if (!s.reviewedAt) return;

    const sentDate = new Date(s.reviewedAt);
    const dayName = days[sentDate.getDay()];

    dayStats[dayName].sent++;
    if (s.paymentStatus === 'paid' || s.paymentStatus === 'partial') {
      dayStats[dayName].paid++;
    }
  });

  // Calculate payment rates
  Object.keys(dayStats).forEach(day => {
    dayStats[day].paymentRate = calculateRate(dayStats[day].paid, dayStats[day].sent);
  });

  return dayStats;
}

function analyzeDeliveryMethod(submissions: Submission[]) {
  const emailSubs = submissions.filter(s => s.letterData.deliveryMethod === 'email');
  const selfSubs = submissions.filter(s => s.letterData.deliveryMethod === 'self');

  const emailPaid = emailSubs.filter(s => s.paymentStatus === 'paid' || s.paymentStatus === 'partial');
  const selfPaid = selfSubs.filter(s => s.paymentStatus === 'paid' || s.paymentStatus === 'partial');

  // Calculate recovery rates for each method
  const emailRecoveryRate = calculateRecoveryRate(emailSubs);
  const selfRecoveryRate = calculateRecoveryRate(selfSubs);

  return {
    email: {
      sent: emailSubs.length,
      paid: emailPaid.length,
      paymentRate: calculateRate(emailPaid.length, emailSubs.length),
      avgRecoveryRate: emailRecoveryRate,
    },
    self: {
      sent: selfSubs.length,
      paid: selfPaid.length,
      paymentRate: calculateRate(selfPaid.length, selfSubs.length),
      avgRecoveryRate: selfRecoveryRate,
    },
  };
}

function calculateRecoveryRate(submissions: Submission[]): number {
  if (submissions.length === 0) return 0;

  const totalClaimed = submissions.reduce((sum, s) => sum + parseFloat(s.letterData.amountOwed || 0), 0);
  if (totalClaimed === 0) return 0;

  const totalRecovered = submissions.reduce((sum, s) => {
    if (s.paymentAmount) {
      return sum + parseFloat(s.paymentAmount.toString());
    }
    if (s.paymentStatus === 'paid') {
      return sum + parseFloat(s.letterData.amountOwed || 0);
    }
    return sum;
  }, 0);

  return (totalRecovered / totalClaimed) * 100;
}

function calculateRate(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return (numerator / denominator) * 100;
}

function getEmptyStatistics(): Statistics {
  return {
    totalSent: 0,
    totalPaid: 0,
    totalPartial: 0,
    totalDispute: 0,
    totalUnpaid: 0,
    paymentRate: 0,
    fullPaymentRate: 0,
    averageRecoveryRate: 0,
    totalAmountClaimed: 0,
    totalAmountRecovered: 0,
    averageClaimAmount: 0,
    averageRecoveryAmount: 0,
    responseRate: 0,
    averageResponseTimeHours: 0,
    averageResponseTimeDays: 0,
    sendTimeAnalysis: {
      morning: { sent: 0, paid: 0, paymentRate: 0 },
      afternoon: { sent: 0, paid: 0, paymentRate: 0 },
      evening: { sent: 0, paid: 0, paymentRate: 0 },
      night: { sent: 0, paid: 0, paymentRate: 0 },
    },
    dayOfWeekAnalysis: {},
    totalClosed: 0,
    closureReasons: {
      paid_full: 0,
      paid_partial: 0,
      no_response: 0,
      dispute: 0,
      withdrawn: 0,
    },
    deliveryMethodAnalysis: {
      email: { sent: 0, paid: 0, paymentRate: 0, avgRecoveryRate: 0 },
      self: { sent: 0, paid: 0, paymentRate: 0, avgRecoveryRate: 0 },
    },
  };
}
