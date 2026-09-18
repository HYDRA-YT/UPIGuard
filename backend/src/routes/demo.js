const express = require('express');
const db = require('../db/database');

const router = express.Router();

const DEMO_SCENARIOS = [
  {
    id: 'scenario-1',
    name: 'Safe Normal Payment',
    description: 'Known recipient, normal amount, normal context',
    icon: 'check-circle',
    recipientName: 'Priya Sharma',
    recipientUpi: 'priya@okbank',
    amount: 1500,
    context: 'Friend',
    expectedRisk: 'LOW RISK',
    explain: {
      recipientName: 'Known recipient — you have paid Priya Sharma 4 times before.',
      recipientUpi: 'This UPI is familiar in your payment history.',
      amount: '₹1,500 is within your typical range (₹500 – ₹2,000). Nothing unusual in the amount.',
      context: 'Normal reason (Friend) — everyday payments like this rarely show warning signals.',
    },
  },
  {
    id: 'scenario-2',
    name: 'Unusual High Amount',
    description: 'Known recipient, much higher than usual',
    icon: 'trending-up',
    recipientName: 'Amit Patel',
    recipientUpi: 'amit@upi',
    amount: 45000,
    context: 'Shopping',
    expectedRisk: 'CAUTION',
    explain: {
      recipientName: 'Known recipient — Amit Patel appears 3 times in your history.',
      recipientUpi: 'Familiar UPI — amit@upi is already in your history.',
      amount: '₹45,000 is far above your typical range of ₹500 – ₹2,000 — an unusual amount.',
      context: 'Reason is normal (Shopping), but the unusually high amount drives the caution alert.',
    },
  },
  {
    id: 'scenario-3',
    name: 'New Recipient',
    description: 'Never paid before, normal amount',
    icon: 'user-plus',
    recipientName: 'Vikram Singh',
    recipientUpi: 'vikram@paytm',
    amount: 1200,
    context: 'Friend',
    expectedRisk: 'CAUTION',
    explain: {
      recipientName: 'NEW recipient — you have never paid Vikram Singh before.',
      recipientUpi: 'First payment to this UPI (vikram@paytm).',
      amount: '₹1,200 is within your typical range — the amount is not unusual.',
      context: 'Normal reason (Friend) — the new recipient is what triggers the warning.',
    },
  },
  {
    id: 'scenario-4',
    name: 'Suspicious Context',
    description: 'Cashback / reward request with high amount',
    icon: 'alert-triangle',
    recipientName: 'Lucky Winners Inc',
    recipientUpi: 'lucky@rewards',
    amount: 5000,
    context: 'Cashback / Reward claimed',
    expectedRisk: 'HIGH CAUTION',
    explain: {
      recipientName: 'Unknown recipient — first payment to Lucky Winners Inc.',
      recipientUpi: 'lucky@rewards has never been paid before.',
      amount: '₹5,000 is above your typical range of ₹500 – ₹2,000.',
      context: 'Suspicious — "Cashback / Reward" is a classic social-engineering trigger.',
    },
  },
  {
    id: 'scenario-5',
    name: 'Full Demo — Rahul',
    description: 'New recipient + unusual amount + cashback context',
    icon: 'shield',
    recipientName: 'Rahul S.',
    recipientUpi: 'rahul@okbank',
    amount: 18500,
    context: 'Cashback / Reward',
    expectedRisk: 'HIGH CAUTION',
    explain: {
      recipientName: 'NEW recipient — you have never paid Rahul S. before.',
      recipientUpi: 'rahul@okbank has never been paid before.',
      amount: '₹18,500 is much higher than your usual range of ₹500 – ₹2,000.',
      context: 'High-risk context — cashback / reward requests deserve extra verification.',
    },
  },
];

router.get('/', (req, res) => {
  res.json({ success: true, scenarios: DEMO_SCENARIOS });
});

router.get('/:id', (req, res) => {
  const scenario = DEMO_SCENARIOS.find(s => s.id === req.params.id);
  if (!scenario) {
    return res.status(404).json({ success: false, message: 'Scenario not found' });
  }
  res.json({ success: true, scenario });
});

module.exports = router;
