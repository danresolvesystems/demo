// DOS 2.0 POC - Copy paste this entire block
// server.js - Deterministic AI Gate for Quantum Validation

const express = require("express");
const cors = require("cors");
const crypto = require("crypto");

const app = express();
app.use(cors());
app.use(express.json());

// DOS 2.0 Deterministic Rules (100% PASS/FAIL only)
function dos2Validate(rawOutput) {
  const rules = {
    length: rawOutput.length <= 1200,
    safe: !/suicide|kill|bomb|explosive/i.test(rawOutput),
    structured: rawOutput.trim().endsWith('.') && rawOutput.includes(' '),
    physics: !/quantums+decoherence/i.test(rawOutput) // Example domain rule
  };
  
  const failed = Object.entries(rules).filter(([k,v]) => !v);
  return {
    pass: failed.length === 0,
    failed_rules: failed.map(([k]) => k),
    rules_passed: Object.keys(rules).length - failed.length
  };
}

// PQC-style seal (deterministic hash)
function sealPayload(payload) {
  const hash = crypto.createHash('sha256')
    .update(JSON.stringify(payload) + Date.now())
    .digest('base64').slice(0, 32);
  return {
    sealed: true,
    timestamp: new Date().toISOString(),
    dos2_hash: hash,
    version: "2.0"
  };
}

// FAKE LLM (replace with real API key later)
async function fakeLLM(prompt) {
  // Simulate probabilistic AI response
  const responses = [
    "Quantum interlocks use physical trip mechanisms at 0.2ms to isolate faulty AI execution paths.",
    "Quantum computing will revolutionize AI but requires deterministic validation layers.",
    "Error: This response contains invalid physics claims and fails DOS gate."
  ];
  await new Promise(r => setTimeout(r, 800 + Math.random()*400)); // Latency
  return responses[Math.floor(Math.random()*responses.length)];
}

app.post("/dos2/gate", async (req, res) => {
  const { prompt } = req.body;
  const cycleStart = Date.now();
  
  // STEP 1: Probabilistic AI call
  const rawAI = await fakeLLM(prompt);
  
  // STEP 2: DOS 2.0 Deterministic Gate
  const validation = dos2Validate(rawAI);
  
  // STEP 3: Seal or Reject
  const envelope = {
    prompt,
    raw_ai_output: rawAI,
    dos2_validation: validation,
    cycle_latency_ms: Date.now() - cycleStart
  };
  
  const seal = sealPayload(envelope);
  
  if (validation.pass) {
    res.json({
      status: "APPROVED",
      gate: "DOS 2.0",
      seal,
      approved_output: rawAI,
      envelope
    });
  } else {
    res.json({
      status: "REJECTED",
      gate: "DOS 2.0", 
      seal,
      rejected_reason: validation.failed_rules,
      envelope
    });
  }
});

app.get("/", (req, res) => {
  res.json({ status: "DOS 2.0 Live", gate: "Ready for quantum validation" });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 DOS 2.0 GATE LIVE on port ${PORT}`);
  console.log("Test: curl -X POST http://localhost:8080/dos2/gate -d '{"prompt":"test"}' -H 'Content-Type: application/json'");
});
