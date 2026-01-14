// 10th FLOOR™ POC - Hardware-Enforced Interlock
// Copy paste this entire block - server.js

const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// 10th Floor™ Physics Parameters (Realistic trip times)
const FLOOR10_CONFIG = {
  trip_threshold: 0.2, // ms mechanical trip
  reset_delay: 50, // ms post-trip reset
  max_power: 10e6, // 10GW simulated capacity
  variants: ["inject-fail", "thermal", "logic"]
};

// Simulate physical interlock states
class Floor10Interlock {
  constructor() {
    this.state = "ARMED"; // READY | TRIPPED | RESETTING
    this.tripLog = [];
    this.cycles = 0;
  }

  async executeCycle(faultType = null) {
    this.cycles++;
    const cycleStart = Date.now();
    
    // Simulate power surge / fault injection
    const faultChance = faultType ? 0.95 : 0.3;
    const hasFault = Math.random() < faultChance;
    
    if (hasFault) {
      // MECHANICAL TRIP at 0.2ms (fail-closed)
      await this.trip(faultType || this.randomFault());
      return { status: "INTERLOCKED", tripped: true };
    }
    
    // Normal operation
    await new Promise(r => setTimeout(r, 1)); // 1ms cycle
    return { status: "PASS", tripped: false, cycle: this.cycles };
  }

  async trip(fault) {
    this.state = "TRIPPED";
    const tripTime = FLOOR10_CONFIG.trip_threshold + (Math.random() * 0.7);
    
    this.tripLog.push({
      fault,
      trip_ms: tripTime,
      timestamp: new Date().toISOString(),
      cycle: this.cycles
    });
    
    // Simulate reset delay
    await new Promise(r => setTimeout(r, FLOOR10_CONFIG.reset_delay));
    this.state = "ARMED";
  }

  randomFault() {
    return FLOOR10_CONFIG.variants[Math.floor(Math.random() * FLOOR10_CONFIG.variants.length)];
  }
}

const interlock = new Floor10Interlock();

app.post("/floor10/trip", async (req, res) => {
  const { fault } = req.body;
  const result = await interlock.executeCycle(fault);
  
  res.json({
    status: result.status,
    "10th_floor_state": interlock.state,
    config: FLOOR10_CONFIG,
    trip_log: interlock.tripLog.slice(-5), // Last 5 events
    total_cycles: interlock.cycles,
    tripped_rate: `${((interlock.tripLog.length / interlock.cycles)*100).toFixed(1)}%`
  });
});

app.get("/floor10/status", (req, res) => {
  res.json({
    status: "10th Floor™ LIVE",
    state: interlock.state,
    cycles: interlock.cycles,
    trip_history: interlock.tripLog.length,
    last_trip: interlock.tripLog[interlock.tripLog.length-1] || null
  });
});

app.post("/floor10/stress", async (req, res) => {
  const { cycles = 100 } = req.body;
  let passes = 0, trips = 0;
  
  for(let i = 0; i < cycles; i++) {
    const result = await interlock.executeCycle();
    if (result.status === "PASS") passes++;
    else trips++;
  }
  
  res.json({
    stress_test: true,
    cycles,
    passes,
    trips,
    trip_rate: `${((trips/cycles)*100).toFixed(1)}%`,
    avg_trip_ms: interlock.tripLog.slice(-10).reduce((a,b)=>a+b.trip_ms,0)/10 || 0.2
  });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🔒 10th FLOOR™ INTERLOCK LIVE on port ${PORT}`);
  console.log("Test: curl -X POST http://localhost:8080/floor10/trip -d '{"fault":"thermal"}' -H 'Content-Type: application/json'");
});
