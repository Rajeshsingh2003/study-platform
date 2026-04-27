const fs = require("fs");
const https = require("https");

const logs = fs.existsSync("/tmp/build_logs.txt")
  ? fs.readFileSync("/tmp/build_logs.txt", "utf8").slice(-3000)
  : "No logs captured.";

const status = process.env.BUILD_STATUS || "unknown";
const apiKey = process.env.GEMINI_API_KEY;

const prompt = `
You are a DevOps assistant. Analyze these CI/CD build logs for a Node.js + React + Docker project.

Build status: ${status}
Logs:
${logs}

Reply in this format:
**Build status:** [PASSED/FAILED]
**What went wrong:** (if failed, explain in simple English what the error is)
**How to fix it:** (exact steps the developer should take)
**What worked:** (briefly mention what passed)
Keep it under 200 words. Be specific and helpful.
`;

const body = JSON.stringify({
  contents: [{ parts: [{ text: prompt }] }]
});

const options = {
  hostname: "generativelanguage.googleapis.com",
  path: `/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
  method: "POST",
  headers: { "Content-Type": "application/json" }
};

const req = https.request(options, (res) => {
  let data = "";
  res.on("data", chunk => data += chunk);
  res.on("end", () => {
    try {
      const result = JSON.parse(data);
      const analysis = result.candidates[0].content.parts[0].text;

      // Post as GitHub PR comment
      const comment = `## AI Build Analysis\n\n${analysis}\n\n*Powered by Gemini AI*`;
      console.log(comment);

      // Write to file so next step can post it
      fs.writeFileSync("/tmp/ai_comment.txt", comment);
    } catch (e) {
      console.log("AI analysis failed:", e.message);
    }
  });
});

req.write(body);
req.end();