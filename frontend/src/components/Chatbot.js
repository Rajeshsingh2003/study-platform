import { useState, useRef, useEffect } from "react";

function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { text: "Hi! 👋 I'm your AI study assistant powered by study-vault. Ask me anything — about your subjects, how to use this platform, or general study tips!", sender: "bot" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { text, sender: "user" };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      // Build conversation history for Claude API
      const apiMessages = newMessages
        .filter(m => m.sender !== "bot" || newMessages.indexOf(m) > 0) // skip initial bot greeting
        .map(m => ({
          role: m.sender === "user" ? "user" : "assistant",
          content: m.text
        }));

      // Filter to alternating user/assistant (Claude requires this)
      const cleanedMessages = [];
      let lastRole = null;
      for (const m of apiMessages) {
        if (m.role !== lastRole) {
          cleanedMessages.push(m);
          lastRole = m.role;
        }
      }

      // Ensure starts with user
      const finalMessages = cleanedMessages[0]?.role === "user"
        ? cleanedMessages
        : cleanedMessages.slice(1);

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: `You are a helpful academic assistant for a student note-sharing platform called StudyVault. 
You help students and teachers with:
- Subject questions (OS, DBMS, CN, Math, etc.)
- Study tips and strategies
- How to use the platform (upload notes, search, download, like)
- Explaining academic concepts clearly

Keep responses concise (2-4 sentences usually), friendly, and encouraging. Use emojis sparingly.`,
          messages: finalMessages
        })
      });

      const data = await response.json();
      const botText = data.content?.[0]?.text || "Sorry, I couldn't get a response. Please try again!";

      setMessages(prev => [...prev, { text: botText, sender: "bot" }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        text: "Oops! I'm having trouble connecting right now. Try again in a moment! 🔌",
        sender: "bot"
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      <button className="chatbot-fab" onClick={() => setOpen(o => !o)} title="AI Assistant">
        {open ? "✕" : "✦"}
      </button>

      {open && (
        <div className="chatbot-window">
          <div className="chatbot-header">
            <div style={{ fontSize: 28 }}>🤖</div>
            <div>
              <div className="chatbot-title">StudyVault AI</div>
              <div className="chatbot-subtitle">Powered by Claude · Always ready</div>
            </div>
          </div>

          <div className="chatbot-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`chat-msg ${msg.sender}`}>
                {msg.text}
              </div>
            ))}

            {loading && (
              <div className="chat-typing">
                <div className="typing-dot" />
                <div className="typing-dot" />
                <div className="typing-dot" />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chatbot-input-area">
            <input
              className="chatbot-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything..."
              disabled={loading}
            />
            <button
              className="chatbot-send"
              onClick={sendMessage}
              disabled={loading || !input.trim()}
            >
              {loading ? <div className="spinner" style={{width:14,height:14}} /> : "↑"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default Chatbot;