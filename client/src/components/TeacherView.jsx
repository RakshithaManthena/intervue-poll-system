/* TeacherView code omitted for brevity in this tool */
import React, { useEffect, useState } from "react";
import { socket } from "../socket";
import ChatWidget from "./ChatWidget";

export default function TeacherView({ name }) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [durationSec, setDurationSec] = useState(60);

  const [pollRunning, setPollRunning] = useState(false);
  const [endsAt, setEndsAt] = useState(null);

  const [totalStudents, setTotalStudents] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [results, setResults] = useState(null);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  const [participants, setParticipants] = useState([]);

  useEffect(() => {
    socket.emit("register", { name, role: "teacher" });

    socket.on("studentCount", ({ totalStudents }) => setTotalStudents(totalStudents));
    socket.on("participants", (list) => setParticipants(list));

    socket.on("pollStarted", ({ endsAt, totalStudents }) => {
      setPollRunning(true);
      setEndsAt(endsAt);
      setResults(null);
      setAnsweredCount(0);
      setTotalStudents(totalStudents);
    });

    socket.on("answerUpdate", ({ answeredCount, totalStudents }) => {
      setAnsweredCount(answeredCount);
      setTotalStudents(totalStudents);
    });

    socket.on("pollEnded", (summary) => {
      setPollRunning(false);
      setResults(summary.results);
      setHistory(prev => [...prev.filter(p => p.id !== summary.id), summary]);
    });

    socket.on("pollHistory", (h) => setHistory(h || []));

    return () => socket.off();
  }, [name]);

  const updateOption = (i, val) => {
    const clone = [...options];
    clone[i] = val;
    setOptions(clone);
  };

  const addOption = () => setOptions([...options, ""]);

  const startPoll = () => {
    const clean = options.map(o => o.trim()).filter(o => o.length > 0);
    if (!question.trim() || clean.length < 2) {
      alert("Enter a question + at least two options");
      return;
    }
    socket.emit("createPoll", { question, options: clean, durationSec });
  };

  const timeLeft = endsAt ? Math.max(0, endsAt - Date.now()) : 0;
  const secondsLeft = Math.floor(timeLeft / 1000);

  const kickStudent = (id) => socket.emit("kickStudent", { targetId: id });

  return (
    <div className="lp-page">
      <div className="lp-container lp-two-col" style={{ alignItems: "flex-start" }}>

        <div>
          <span className="lp-pill">Teacher</span>
          <h1 className="lp-title">Let's Get Started</h1>
          <p className="lp-subtitle">
            Enter your question, set a timer, and add options before starting your poll
          </p>

          <div className="lp-card" style={{ marginBottom: 26 }}>
            <label className="lp-field-label">Question</label>
            <textarea
              className="lp-textarea"
              maxLength={100}
              placeholder="Compose your question here…"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />

            <div style={{ marginTop: 18 }}>
              <label className="lp-field-label">Set Timer</label>
              <select
                className="lp-select"
                value={durationSec}
                onChange={(e) => setDurationSec(Number(e.target.value))}
              >
                <option value={30}>30 sec</option>
                <option value={60}>1 min</option>
                <option value={90}>1.5 min</option>
              </select>
            </div>

            <div style={{ marginTop: 18 }}>
              <label className="lp-field-label">Options</label>
              <div className="lp-options-header">
                <span>Option Text</span>
                <span></span>
              </div>

              {options.map((opt, i) => (
                <div key={i} className="lp-option-row">
                  <input
                    className="lp-input"
                    placeholder={`Option ${i + 1}`}
                    value={opt}
                    onChange={(e) => updateOption(i, e.target.value)}
                  />
                </div>
              ))}

              <button type="button" className="lp-add-option-btn" onClick={addOption}>
                + Add Option
              </button>
            </div>

            <div style={{ marginTop: 28, textAlign: "center" }}>
              <button
                className="lp-primary-btn"
                disabled={pollRunning}
                onClick={startPoll}
              >
                Start Poll
              </button>
            </div>
          </div>
        </div>

        <div>
          <div className="lp-card" style={{ marginBottom: 26 }}>
            <h3 style={{ marginBottom: 10 }}>Live Poll Status</h3>

            <div style={{ marginBottom: 14, display: "flex", gap: 8 }}>
              <span className="lp-stat-pill">Students: {totalStudents}</span>
              {pollRunning && (
                <span className="lp-stat-pill">Time Left: {secondsLeft}s</span>
              )}
              <span className="lp-stat-pill">
                Answered: {answeredCount}/{totalStudents}
              </span>
            </div>

            {pollRunning && (
              <p className="lp-muted">Poll is live — waiting for responses...</p>
            )}

            {results && (
              <div>
                <h4 style={{ marginBottom: 6 }}>Results</h4>
                <ul className="lp-results-list">
                  {results.map((count, i) => {
                    const total = results.reduce((a,b) => a+b, 0) || 1;
                    const pct = Math.round((count / total) * 100);
                    return (
                      <li key={i}>
                        <div>{options[i] || `Option ${i+1}`}</div>
                        <div className="lp-bar-wrapper">
                          <div
                            className="lp-bar-fill"
                            style={{ width: pct + "%" }}
                          >
                            {pct}%
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>

          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <button className="lp-primary-btn" onClick={() => setShowHistory(true)}>
              View Poll History
            </button>
          </div>
        </div>
      </div>

      {showHistory && (
        <div className="lp-history-overlay" onClick={() => setShowHistory(false)}>
          <div className="lp-history-modal" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Previous Polls</h3>

            {history.length === 0 ? (
              <p className="lp-muted">No history yet.</p>
            ) : (
              history.map(h => (
                <div key={h.id} style={{ marginBottom: 12 }}>
                  <strong>Q{h.id}: {h.question}</strong>
                  <ul className="lp-results-list">
                    {h.results.map((count, i) => {
                      const total = h.results.reduce((a,b)=>a+b,0) || 1;
                      const pct = Math.round((count/total)*100);
                      return (
                        <li key={i}>
                          <div>{h.options[i]}</div>
                          <div className="lp-bar-wrapper">
                            <div className="lp-bar-fill" style={{ width:pct+"%" }}>
                              {pct}%
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <ChatWidget
        meName={name}
        meRole="teacher"
        participants={participants}
        onKick={kickStudent}
      />
    </div>
  );
}
