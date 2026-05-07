const fs = require("fs");
const https = require("https");

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.log("No GEMINI_API_KEY found. Skipping AI analysis.");
  process.exit(0);
}

// Read build logs safely
let buildLogs = "No build logs captured.";
try {
  if (fs.existsSync("/tmp/build_logs.txt")) {
    buildLogs = fs.readFileSync("/tmp/build_logs.txt", "utf8").slice(-4000);
  }
} catch (e) {
  console.log("Could not read build logs:", e.message);
}

// Read job summary safely
let jobSummary = "No job summary available.";
try {
  if (fs.existsSync("/tmp/job_summary.txt")) {
    jobSummary = fs.readFileSync("/tmp/job_summary.txt", "utf8");
  }
} catch (e) {
  console.log("Could not read job summary:", e.message);
}

console.log("Job Summary:\n", jobSummary);
console.log("Build Logs (last 300 chars):\n", buildLogs.slice(-300));

const prompt = `You are an expert DevOps assistant reviewing CI/CD pipeline logs for a college project called StudyVault. It is a Node.js + Express backend, React frontend, and Docker-based deployment.

Job step results:
${jobSummary}

Build logs (last 4000 chars):
${buildLogs}

Analyze the above and respond in exactly this format:

## Build status
[One line: PASSED or FAILED and which step failed]

## What went wrong
[If failed: explain the root cause in simple English. If passed: write "Everything passed successfully."]

## How to fix it
[If failed: give exact commands or file changes to fix the issue. If passed: write "No action needed."]

## What passed
[List the steps that succeeded]

Keep the entire response under 250 words.`;

const requestBody = JSON.stringify({
  contents: [{ parts: [{ text: prompt }] }]
});

// Fix 2: Use correct Gemini model — gemini-2.0-flash
const options = {
  hostname: "generativelanguage.googleapis.com",
  path: `/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(requestBody)
  }
};

console.log("\nSending logs to Gemini AI (gemini-2.0-flash)...");

const req = https.request(options, (res) => {
  let data = "";

  res.on("data", (chunk) => { data += chunk; });

  res.on("end", () => {
    console.log("Gemini HTTP status:", res.statusCode);
    console.log("Raw response preview:", data.slice(0, 300));

    try {
      const parsed = JSON.parse(data);

      if (parsed.error) {
        console.error("Gemini API error:", parsed.error.message);
        fs.writeFileSync("/tmp/ai_comment.txt",
          `## AI Build Analysis\n\nGemini API error: ${parsed.error.message}\n\nCheck your GEMINI_API_KEY secret.`
        );
        process.exit(0);
      }

      const candidates = parsed.candidates;
      if (!candidates || candidates.length === 0) {
        console.log("No candidates returned. Full response:", data);
        fs.writeFileSync("/tmp/ai_comment.txt",
          `## AI Build Analysis\n\nNo response from Gemini.\n\nRaw: ${data.slice(0, 300)}`
        );
        process.exit(0);
      }

      const parts = candidates[0]?.content?.parts;
      if (!parts || parts.length === 0) {
        console.log("No parts in response.");
        fs.writeFileSync("/tmp/ai_comment.txt",
          `## AI Build Analysis\n\nEmpty response from Gemini.`
        );
        process.exit(0);
      }

      const analysis = parts[0].text;

      const comment = [
        "## AI Build Analysis",
        "",
        analysis,
        "",
        "---",
        "*Automated analysis by Gemini AI — StudyVault CI/CD*"
      ].join("\n");

      console.log("\n========== AI ANALYSIS ==========");
      console.log(comment);
      console.log("==================================\n");

      fs.writeFileSync("/tmp/ai_comment.txt", comment);
      console.log("Saved to /tmp/ai_comment.txt");

    } catch (err) {
      console.error("JSON parse error:", err.message);
      console.error("Full raw response:", data);
      fs.writeFileSync("/tmp/ai_comment.txt",
        `## AI Build Analysis\n\nCould not parse Gemini response.\n\n\`\`\`\n${data.slice(0, 500)}\n\`\`\``
      );
    }
  });
});

req.on("error", (err) => {
  console.error("HTTPS request failed:", err.message);
  fs.writeFileSync("/tmp/ai_comment.txt",
    `## AI Build Analysis\n\nNetwork error: ${err.message}`
  );
});

req.write(requestBody);
req.end();