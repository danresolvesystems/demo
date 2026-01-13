// server.js
const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// --- CONFIG (swap in real key/model) ---
const LLM_ENDPOINT = "https://api.openai.com/v1/chat/completions"; // or Gemini proxy
const LLM_API_KEY = process.env.LLM_API_KEY;

// Deterministic rule set for DOS 2.0
function validateDeterministic(output)
{
  const reasons = [];

  // Example invariants - customize
  if (output.length > 1200) {
    reasons.push("Output too long for safe channel.");
  }
  const banned = ["suicide", "kill", "explosive"];
  if (banned.some(w => output.toLowerCase().includes(w)))
    reasons.push("Contains banned terms.");
  if (!output.endsWith(".")) {
    reasons.push("Does not end with terminal punctuation.");
  }

  return {
    pass: reasons.length === 0, reasons
  };
}

// Fake PQC seal for POC
function pqcSeal(payload) {
  return {
    sealed_at: new Date().toISOString(),
    hash: Buffer.from(JSON.stringify(payload)).toString("base64").slice(0, 32)
  };
}

app.post("/dos2/infer", async (req, res) => {
  const { prompt } = req.body;

  const start = Date.now();

  // 1) Call probabilistic model
  let raw;
  try {
    const llmRes = await axios.post(
      LLM_ENDPOINT,
      {
        model:
          "gpt-40-mini",  // or your chosen model
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7
      },
      {
        headers: {
          Authorization: `Bearer ${LLM_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    };
    raw = llmRes.data.choices[0].message.content;
  } catch (err) {
    return res.status(500.json({
      status: "ERROR_MODEL",
      error: err?.response?.data || err.message
    });
  }

  // 2) Deterministic validation
  const validation = validateDeterministic(raw);

  // 3) PQC-style sealing + response
  const latencyMs = Date.now() - start;
  const envelope = {
    prompt,
    raw,
    validation,
    latency_ms: latencyMS
  };

  const seal = pqcSeal(envelope);

  if (!validation.pass) {
    return res.json({
      status: "REJECT",
      gate: "DOS2.0",
      seal,
      envelope
    });
  }

  return res.json({
    status: "APPROVE",
    gate: "DOS2.0",
    seal,
    envelope
  });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`DOS 2.0 demo listening on ${PORT}`);
});
