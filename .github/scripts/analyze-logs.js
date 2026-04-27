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
console.log("Build Logs (last 500 chars):\n", buildLogs.slice(-500));

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

const options = {
  hostname: "generativelanguage.googleapis.com",
  path: `/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(requestBody)
  }
};

console.log("\nSending logs to Gemini AI...");

const req = https.request(options, (res) => {
  let data = "";

  res.on("data", (chunk) => { data += chunk; });

  res.on("end", () => {
    console.log("Gemini HTTP status:", res.statusCode);
    console.log("Raw response preview:", data.slice(0, 300));

    try {
      const parsed = JSON.parse(data);

      // Handle API-level errors
      if (parsed.error) {
        console.error("Gemini API error:", parsed.error.message);
        fs.writeFileSync("/tmp/ai_comment.txt",
          `## AI Build Analysis\n\nGemini API error: ${parsed.error.message}\n\nCheck your GEMINI_API_KEY secret is valid.`
        );
        process.exit(0);
      }

      // Safely extract text with full defensive checks
      const candidates = parsed.candidates;
      if (!candidates || candidates.length === 0) {
        console.log("No candidates in response. Full response:", data);
        fs.writeFileSync("/tmp/ai_comment.txt",
          `## AI Build Analysis\n\nNo response from Gemini. Raw: ${data.slice(0, 200)}`
        );
        process.exit(0);
      }

      const content = candidates[0].content;
      if (!content || !content.parts || content.parts.length === 0) {
        console.log("No content parts in response.");
        fs.writeFileSync("/tmp/ai_comment.txt",
          `## AI Build Analysis\n\nEmpty response from Gemini.`
        );
        process.exit(0);
      }

      const analysis = content.parts[0].text;

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
        `## AI Build Analysis\n\nCould not parse Gemini response.\n\nRaw output:\n\`\`\`\n${data.slice(0, 500)}\n\`\`\``
      );
    }
  });
});

req.on("error", (err) => {
  console.error("HTTPS request failed:", err.message);
  fs.writeFileSync("/tmp/ai_comment.txt",
    `## AI Build Analysis\n\nNetwork error contacting Gemini: ${err.message}`
  );
});

req.write(requestBody);
req.end();