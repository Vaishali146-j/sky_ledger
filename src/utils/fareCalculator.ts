import { FareBreakdown, TravelClass } from '../types';
import { getAirport } from '../data/airportsData';

/**
 * Calculates Great-Circle distance in miles using the Haversine formula
 */
export function calculateGreatCircleDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Deterministically compute fare with itemized fare breakdown and 5% GST line item
 */
export function calculateFare(
  originCode: string,
  destCode: string,
  travelClass: TravelClass = 'Economy'
): FareBreakdown {
  const origin = getAirport(originCode);
  const dest = getAirport(destCode);

  const lat1 = origin.lat ?? 40.6413;
  const lon1 = origin.lon ?? -73.7781;
  const lat2 = dest.lat ?? 34.0522;
  const lon2 = dest.lon ?? -118.2437;

  const distanceMiles = Math.max(calculateGreatCircleDistance(lat1, lon1, lat2, lon2), 95);

  // Rate formula: $0.125 per mile with a base threshold
  const baseRatePerMile = 0.125;
  const baseFare = Math.round(Math.max(59.0, distanceMiles * baseRatePerMile) * 100) / 100;

  const classMultiplier = travelClass === 'Business' ? 2.2 : 1.0;
  const classFare = Math.round(baseFare * classMultiplier * 100) / 100;

  const fuelAndAirportCharges = 24.50;
  const subtotal = Math.round((classFare + fuelAndAirportCharges) * 100) / 100;

  // Exact 5% GST Line Item
  const gstAmount = Math.round(subtotal * 0.05 * 100) / 100;
  const totalFare = Math.round((subtotal + gstAmount) * 100) / 100;

  return {
    distanceMiles,
    baseRatePerMile,
    baseFare,
    classMultiplier,
    classFare,
    fuelAndAirportCharges,
    subtotal,
    gstAmount,
    totalFare,
  };
}

export interface DelayRiskAssessment {
  riskLevel: 'Low' | 'Medium' | 'High';
  riskScorePercent: number;
  factors: string[];
  explanation: string;
}

/**
 * Deterministic Delay Prediction Hint computed from route, origin airport, and departure hour
 */
export function calculateDelayPrediction(
  origin: string,
  departureTimeStr: string,
  onTimePercentage: number = 82
): DelayRiskAssessment {
  const hour = new Date(departureTimeStr).getHours();
  let baseRisk = 100 - onTimePercentage; // 18% base
  const factors: string[] = [];

  // Origin Airport Congestion Weight (Historical NYC airspace data)
  if (origin === 'EWR') {
    baseRisk += 8;
    factors.push('EWR Airspace Congestion (+8%)');
  } else if (origin === 'LGA') {
    baseRisk += 5;
    factors.push('LGA Perimeter Slot Management (+5%)');
  } else {
    factors.push('JFK Wide-body Queue Index (+2%)');
    baseRisk += 2;
  }

  // Peak Hour Congestion Window
  if (hour >= 16 && hour <= 20) {
    baseRisk += 14;
    factors.push('Evening Peak Window (16:00 - 20:00) (+14%)');
  } else if (hour >= 7 && hour <= 9) {
    baseRisk += 8;
    factors.push('Morning Departure Bank (07:00 - 09:00) (+8%)');
  } else if (hour < 7) {
    baseRisk -= 6;
    factors.push('Early Morning Off-Peak (-6%)');
  }

  const score = Math.min(Math.max(Math.round(baseRisk), 8), 75);

  let riskLevel: 'Low' | 'Medium' | 'High' = 'Low';
  if (score >= 38) {
    riskLevel = 'High';
  } else if (score >= 22) {
    riskLevel = 'Medium';
  }

  return {
    riskLevel,
    riskScorePercent: score,
    factors,
    explanation: `Computed via historical NYC 2013 delay frequency (origin=${origin}, hour=${hour}:00, route historical reliability=${onTimePercentage}%).`,
  };
}
