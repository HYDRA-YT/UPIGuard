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
