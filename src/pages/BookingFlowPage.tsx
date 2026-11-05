import React, { useState } from 'react';
import { Flight, Passenger, TravelClass, Booking } from '../types';
import { FuselageSeatMap } from '../components/visuals/FuselageSeatMap';
import { BoardingPass } from '../components/visuals/BoardingPass';
import { calculateFare } from '../utils/fareCalculator';
import { apiClient } from '../api/client';
import { useApp } from '../context/AppContext';
import {
  Check,
  Plane,
  CreditCard,
  User,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  QrCode,
  DollarSign,
} from 'lucide-react';

interface BookingFlowPageProps {
  flight: Flight;
  travelClass: TravelClass;
  passengersCount: number;
  onFinishBooking: () => void;
}

type Step = 'passengers' | 'seats' | 'review' | 'payment' | 'ticket';

export const BookingFlowPage: React.FC<BookingFlowPageProps> = ({
  flight,
  travelClass,
  passengersCount,
  onFinishBooking,
}) => {
  const { notify } = useApp();

  const [currentStep, setCurrentStep] = useState<Step>('passengers');

  // Passenger details
  const [passengerForms, setPassengerForms] = useState<Passenger[]>(() => {
    return Array.from({ length: passengersCount }).map((_, i) => ({
      full_name: i === 0 ? 'Priya Sharma' : '',
      age: 28 + i * 2,
      gender: 'F',
      seat_no: '',
    }));
  });

  // Selected seats array
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);

  // Payment method simulation
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [paymentDetails, setPaymentDetails] = useState({
    upiId: 'priya.sharma@okaxis',
    cardNumber: '4532 •••• •••• 8821',
    cardName: 'Priya Sharma',
    cardExpiry: '08/26',
    cardCvv: '742',
    bankName: 'State Bank of India',
  });
  const [processingPayment, setProcessingPayment] = useState(false);

  // Confirmed booking state
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);

  // Fare calculations
  const fareBreakdown = calculateFare(flight.origin_airport_id, flight.destination_airport_id, travelClass);
  const totalFare = Math.round(fareBreakdown.totalFare * passengersCount * 100) / 100;

  // Passenger form change handler
  const handlePassengerChange = (index: number, field: keyof Passenger, value: any) => {
    setPassengerForms((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // Seat toggle handler
  const handleSelectSeat = (seatId: string) => {
    if (selectedSeats.includes(seatId)) {
      setSelectedSeats(selectedSeats.filter((s) => s !== seatId));
    } else {
      if (selectedSeats.length >= passengersCount) {
        // Replace oldest or alert
        notify(`You can only select ${passengersCount} seat(s) for ${passengersCount} passenger(s)`, 'info');
        return;
      }
      setSelectedSeats([...selectedSeats, seatId]);
    }
  };

  // Validate passenger step
  const handleProceedToSeats = (e: React.FormEvent) => {
    e.preventDefault();
    for (let i = 0; i < passengerForms.length; i++) {
      const p = passengerForms[i];
      if (!p.full_name.trim()) {
        notify(`Please enter full name for Passenger #${i + 1}`, 'error');
        return;
      }
      if (!p.age || p.age < 1 || p.age > 115) {
        notify(`Please enter a valid age for Passenger #${i + 1}`, 'error');
        return;
      }
    }
    setCurrentStep('seats');
  };

  // Validate seats step
  const handleProceedToReview = () => {
    if (selectedSeats.length < passengersCount) {
      notify(`Please select ${passengersCount - selectedSeats.length} more seat(s) on the aircraft fuselage map`, 'error');
      return;
    }

    // Assign chosen seats to passengers
    setPassengerForms((prev) =>
      prev.map((p, idx) => ({
        ...p,
        seat_no: selectedSeats[idx],
      }))
    );

    setCurrentStep('review');
  };

  // Execute Simulated Payment & ACID Transaction Booking
  const handleConfirmPayment = async () => {
    setProcessingPayment(true);

    // Simulate 1.2s gateway verification
    await new Promise((r) => setTimeout(r, 1200));

    const res = await apiClient.createBooking({
      flight_id: flight.flight_id,
      travel_class: travelClass,
      total_fare: totalFare,
      passengers: passengerForms,
    });

    setProcessingPayment(false);

    if (res.success && res.pnr) {
      const fullBooking = await apiClient.getBookingByPnr(res.pnr);
      if (fullBooking.success && fullBooking.data) {
        setConfirmedBooking(fullBooking.data);
      } else {
        setConfirmedBooking({
          booking_id: res.booking_id || 1,
          pnr: res.pnr,
          user_id: 2,
          flight_id: flight.flight_id,
          travel_class: travelClass,
          total_fare: totalFare,
          booking_status: 'Confirmed',
          booked_at: new Date().toISOString(),
          flight_number: flight.flight_number,
          origin_airport_id: flight.origin_airport_id,
          destination_airport_id: flight.destination_airport_id,
          scheduled_departure: flight.scheduled_departure,
          scheduled_arrival: flight.scheduled_arrival,
          passengers: passengerForms,
        });
      }

      setCurrentStep('ticket');
      notify(`Booking Confirmed! PNR Generated: ${res.pnr}`, 'success');
    } else {
      notify(res.error || 'Transaction aborted: Seat double-booking detected', 'error');
    }
  };

  const stepsList: Array<{ id: Step; label: string }> = [
    { id: 'passengers', label: '1. Passengers' },
    { id: 'seats', label: '2. Fuselage Seats' },
    { id: 'review', label: '3. Review & Fare' },
    { id: 'payment', label: '4. Simulated Payment' },
    { id: 'ticket', label: '5. E-Ticket Issued' },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Stepper Progress Ribbon */}
      <div className="bg-white border-2 border-slate-300 rounded-xl p-4 shadow-sm select-none">
        <div className="flex items-center justify-between">
          {stepsList.map((st, idx) => {
            const isCompleted =
              (st.id === 'passengers' && currentStep !== 'passengers') ||
              (st.id === 'seats' && ['review', 'payment', 'ticket'].includes(currentStep)) ||
              (st.id === 'review' && ['payment', 'ticket'].includes(currentStep)) ||
              (st.id === 'payment' && currentStep === 'ticket');
            const isCurrent = currentStep === st.id;

            return (
              <div key={st.id} className="flex-1 flex items-center">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                      isCompleted
                        ? 'bg-emerald-600 text-white'
                        : isCurrent
                        ? 'bg-[#F57C00] text-white shadow-md'
                        : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {isCompleted ? <Check className="w-4 h-4" /> : idx + 1}
                  </div>
                  <span
                    className={`hidden sm:inline text-xs font-bold ${
                      isCurrent ? 'text-[#0B2E5C]' : isCompleted ? 'text-slate-800' : 'text-slate-400'
                    }`}
                  >
                    {st.label}
                  </span>
                </div>
                {idx < stepsList.length - 1 && (
                  <div
                    className={`flex-1 h-1 mx-3 rounded ${
                      isCompleted ? 'bg-emerald-500' : 'bg-slate-200'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Flight Banner Summary */}
      <div className="bg-[#0B2E5C] text-white rounded-xl p-4 shadow-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Plane className="w-5 h-5 text-amber-400 rotate-45" />
          <div>
            <div className="text-base font-extrabold">
              {flight.flight_number} • {flight.origin_airport_id} ➔ {flight.destination_airport_id}
            </div>
            <div className="text-xs text-blue-200">
              Dep: {flight.scheduled_departure.slice(0, 16)} | Arr: {flight.scheduled_arrival.slice(11, 16)}
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs text-amber-300 font-bold uppercase">{travelClass} Class</div>
          <div className="text-lg font-black font-mono">${totalFare.toFixed(2)} Total</div>
        </div>
      </div>

      {/* ============================================================= */}
      {/* STEP 1: PASSENGERS DETAILS FORM */}
      {/* ============================================================= */}
      {currentStep === 'passengers' && (
        <form onSubmit={handleProceedToSeats} className="bg-white border border-slate-300 rounded-xl p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-200 pb-3">
            <h3 className="text-base font-bold text-[#0B2E5C]">Passenger Details</h3>
            <p className="text-xs text-slate-500">
              Please enter official identity information matching government-issued photo ID.
            </p>
          </div>

          <div className="space-y-4">
            {passengerForms.map((p, idx) => (
              <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                <div className="font-bold text-xs text-[#0B2E5C] uppercase tracking-wider flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-400" />
                  <span>Passenger #{idx + 1} ({idx === 0 ? 'Primary Traveller' : 'Co-Traveller'})</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs">
                  <div className="md:col-span-6">
                    <label className="block font-semibold text-slate-700 mb-1">Full Legal Name</label>
                    <input
                      type="text"
                      required
                      value={p.full_name}
                      onChange={(e) => handlePassengerChange(idx, 'full_name', e.target.value)}
                      placeholder="e.g. Priya Sharma"
                      className="w-full p-2 bg-white border border-slate-300 rounded focus:ring-2 focus:ring-[#0B2E5C] focus:outline-none"
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label className="block font-semibold text-slate-700 mb-1">Age</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={115}
                      value={p.age}
                      onChange={(e) => handlePassengerChange(idx, 'age', Number(e.target.value))}
                      className="w-full p-2 bg-white border border-slate-300 rounded focus:ring-2 focus:ring-[#0B2E5C] focus:outline-none font-mono"
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label className="block font-semibold text-slate-700 mb-1">Gender</label>
                    <select
                      value={p.gender}
                      onChange={(e) => handlePassengerChange(idx, 'gender', e.target.value)}
                      className="w-full p-2 bg-white border border-slate-300 rounded focus:ring-2 focus:ring-[#0B2E5C] focus:outline-none font-medium"
                    >
                      <option value="M">Male (M)</option>
                      <option value="F">Female (F)</option>
                      <option value="O">Other (O)</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-3">
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 bg-[#F57C00] hover:bg-orange-600 text-white font-extrabold rounded shadow text-xs uppercase tracking-wider transition-colors"
            >
              <span>Proceed to Seat Selection</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}

      {/* ============================================================= */}
      {/* STEP 2: FUSELAGE SEAT MAP */}
      {/* ============================================================= */}
      {currentStep === 'seats' && (
        <div className="bg-white border border-slate-300 rounded-xl p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[#0B2E5C]">Aircraft Seat Map & Cabin Layout</h3>
              <p className="text-xs text-slate-500">
                Top-down fuselage view. Click on seats to assign to your travellers ({passengersCount} seats required).
              </p>
            </div>
            <div className="text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded border border-amber-200">
              Selected: {selectedSeats.length} / {passengersCount}
            </div>
          </div>

          <FuselageSeatMap
            flightId={flight.flight_id}
            capacity={flight.aircraft_capacity || 150}
            travelClass={travelClass}
            selectedSeats={selectedSeats}
            maxSeats={passengersCount}
            onSelectSeat={handleSelectSeat}
          />

          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setCurrentStep('passengers')}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-bold"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Passengers</span>
            </button>

            <button
              type="button"
              onClick={handleProceedToReview}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#F57C00] hover:bg-orange-600 text-white font-extrabold rounded shadow text-xs uppercase tracking-wider transition-colors"
            >
              <span>Proceed to Fare Review</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* STEP 3: REVIEW & FARE BREAKDOWN */}
      {/* ============================================================= */}
      {currentStep === 'review' && (
        <div className="bg-white border border-slate-300 rounded-xl p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-200 pb-3">
            <h3 className="text-base font-bold text-[#0B2E5C]">Review Booking Details & Taxes</h3>
            <p className="text-xs text-slate-500">
              Please verify passenger details and deterministic fare computation before payment.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Passenger & Seats Summary */}
            <div className="space-y-3">
              <span className="font-bold text-xs uppercase text-slate-600 tracking-wider">
                Passenger & Seat Allocations
              </span>
              <div className="space-y-2">
                {passengerForms.map((p, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-900">{p.full_name}</div>
                      <div className="text-slate-500 text-[11px]">Age: {p.age} • Gender: {p.gender}</div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block uppercase">Allocated Seat</span>
                      <span className="font-mono font-black text-[#F57C00] text-sm">{p.seat_no}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Itemized Fare Breakdown */}
            <div className="p-4 bg-slate-50 border border-slate-300 rounded-lg space-y-2 text-xs">
              <span className="font-bold text-[#0B2E5C] uppercase text-xs tracking-wider block mb-2">
                Deterministic Fare Calculation Line Items
              </span>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span>Great-Circle Distance ({fareBreakdown.distanceMiles} mi @ $0.125/mi)</span>
                <span className="font-mono">${fareBreakdown.baseFare.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span>Class Surcharge ({travelClass} - {fareBreakdown.classMultiplier}x)</span>
                <span className="font-mono">${(fareBreakdown.classFare - fareBreakdown.baseFare).toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span>Fuel & Security Charges</span>
                <span className="font-mono">${fareBreakdown.fuelAndAirportCharges.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200 font-bold text-emerald-800">
                <span>5% Civil Aviation GST (Statutory Tax)</span>
                <span className="font-mono">${fareBreakdown.gstAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span>Subtotal per passenger</span>
                <span className="font-mono font-bold">${fareBreakdown.totalFare.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-2 text-sm font-black text-[#0B2E5C]">
                <span>Total Due ({passengersCount} Passenger{passengersCount > 1 ? 's' : ''})</span>
                <span className="font-mono">${totalFare.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setCurrentStep('seats')}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-bold"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Seat Map</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentStep('payment')}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#F57C00] hover:bg-orange-600 text-white font-extrabold rounded shadow text-xs uppercase tracking-wider transition-colors"
            >
              <span>Proceed to Payment Simulation</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* STEP 4: SIMULATED PAYMENT SCREEN */}
      {/* ============================================================= */}
      {currentStep === 'payment' && (
        <div className="bg-white border border-slate-300 rounded-xl p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[#0B2E5C]">Payment Simulation Gateway</h3>
              <p className="text-xs text-amber-800 font-semibold">
                * Academic Simulation Mode: No real funds or real credit card charges are processed.
              </p>
            </div>
            <div className="text-lg font-black text-slate-900 font-mono">
              ${totalFare.toFixed(2)}
            </div>
          </div>

          {/* Payment Method Tabs */}
          <div className="flex gap-2 border-b border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setPaymentMethod('upi')}
              className={`py-2 px-4 font-bold border-b-2 transition-colors ${
                paymentMethod === 'upi'
                  ? 'border-[#0B2E5C] text-[#0B2E5C]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              UPI Simulation (GPay / PhonePe)
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('card')}
              className={`py-2 px-4 font-bold border-b-2 transition-colors ${
                paymentMethod === 'card'
                  ? 'border-[#0B2E5C] text-[#0B2E5C]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Credit / Debit Card
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('netbanking')}
              className={`py-2 px-4 font-bold border-b-2 transition-colors ${
                paymentMethod === 'netbanking'
                  ? 'border-[#0B2E5C] text-[#0B2E5C]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Net Banking
            </button>
          </div>

          {/* Payment Method Details */}
          <div className="max-w-md mx-auto p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3 text-xs">
            {paymentMethod === 'upi' && (
              <div>
                <label className="block font-bold text-slate-700 mb-1">Simulated Virtual Payment Address (VPA)</label>
                <input
                  type="text"
                  value={paymentDetails.upiId}
                  onChange={(e) => setPaymentDetails({ ...paymentDetails, upiId: e.target.value })}
                  className="w-full p-2 bg-white border border-slate-300 rounded font-mono"
                />
                <p className="text-[10px] text-slate-500 mt-1">Pre-filled demo VPA. Click Authorize to execute.</p>
              </div>
            )}

            {paymentMethod === 'card' && (
              <div className="space-y-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Card Number</label>
                  <input
                    type="text"
                    value={paymentDetails.cardNumber}
                    onChange={(e) => setPaymentDetails({ ...paymentDetails, cardNumber: e.target.value })}
                    className="w-full p-2 bg-white border border-slate-300 rounded font-mono"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Expiry</label>
                    <input
                      type="text"
                      value={paymentDetails.cardExpiry}
                      onChange={(e) => setPaymentDetails({ ...paymentDetails, cardExpiry: e.target.value })}
                      className="w-full p-2 bg-white border border-slate-300 rounded font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">CVV</label>
                    <input
                      type="password"
                      value={paymentDetails.cardCvv}
                      onChange={(e) => setPaymentDetails({ ...paymentDetails, cardCvv: e.target.value })}
                      className="w-full p-2 bg-white border border-slate-300 rounded font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {paymentMethod === 'netbanking' && (
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Bank</label>
                <select
                  value={paymentDetails.bankName}
                  onChange={(e) => setPaymentDetails({ ...paymentDetails, bankName: e.target.value })}
                  className="w-full p-2 bg-white border border-slate-300 rounded"
                >
                  <option>State Bank of India</option>
                  <option>HDFC Bank</option>
                  <option>ICICI Bank</option>
                  <option>Axis Bank</option>
                  <option>Chase / Bank of America</option>
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <button
              type="button"
              disabled={processingPayment}
              onClick={() => setCurrentStep('review')}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-bold"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <button
              type="button"
              disabled={processingPayment}
              onClick={handleConfirmPayment}
              className="flex items-center gap-2 px-8 py-3 bg-[#2E7D32] hover:bg-green-700 text-white font-extrabold rounded shadow-lg text-sm uppercase tracking-wider transition-all"
            >
              {processingPayment ? (
                <span>Executing ACID Booking Transaction...</span>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5" />
                  <span>Authorize & Issue PNR (${totalFare.toFixed(2)})</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* STEP 5: CONFIRMED E-TICKET & BOARDING PASS */}
      {/* ============================================================= */}
      {currentStep === 'ticket' && confirmedBooking && (
        <div className="space-y-6">
          <div className="p-4 bg-emerald-50 border-2 border-emerald-500 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                <Check className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-emerald-950 text-base">
                  Booking Confirmed & PNR Generated!
                </h3>
                <p className="text-xs text-emerald-800">
                  Transaction successfully committed. Allocated seats have been locked.
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-500">PNR Reference</span>
              <div className="text-2xl font-black font-mono text-[#0B2E5C]">
                {confirmedBooking.pnr}
              </div>
            </div>
          </div>

          {/* Render Official Boarding Pass */}
          <BoardingPass booking={confirmedBooking} />

          <div className="text-center pt-4">
            <button
              onClick={onFinishBooking}
              className="px-6 py-2.5 bg-[#0B2E5C] text-white font-bold rounded shadow hover:bg-blue-900 text-xs"
            >
              Return to Flight Search
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
