/* StudentView code omitted for brevity in this tool */import React, { useEffect, useState } from "react";
import { socket } from "../socket";
import ChatWidget from "./ChatWidget";

export default function StudentView({ name }) {
  const [poll, setPoll] = useState(null);
  const [chosen, setChosen] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState(null);

  const [totalStudents, setTotalStudents] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);

  const [participants, setParticipants] = useState([]);
  const [kicked, setKicked] = useState(false);

  useEffect(() => {
    socket.emit("register", { name, role: "student" });

    socket.on("pollStarted", (data) => {
      setPoll(data);
      setChosen(null);
      setSubmitted(false);
      setResults(null);
      setTotalStudents(data.totalStudents);
      setAnsweredCount(0);
    });

    socket.on("answerUpdate", ({ answeredCount, totalStudents }) => {
      setAnsweredCount(answeredCount);
      setTotalStudents(totalStudents);
    });

    socket.on("pollEnded", (summary) => {
      setPoll(null);
      setResults(summary);
    });

    socket.on("participants", list => setParticipants(list));

    socket.on("kicked", () => setKicked(true));

    return () => socket.off();
  }, [name]);

  const submit = () => {
    if (chosen === null) return;
    socket.emit("submitAnswer", { optionIndex: chosen });
    setSubmitted(true);
  };

  if (kicked) {
    return (
      <div className="lp-page">
        <div>
          <span className="lp-pill">Removed</span>
          <h2 className="lp-kicked-title">You've been kicked out!</h2>
          <p className="lp-kicked-text">
            The teacher removed you from this session.
          </p>
        </div>
      </div>
    );
  }

  if (!poll && !results) {
    return (
      <div className="lp-page">
        <div style={{ textAlign: "center" }}>
          <span className="lp-pill">Student</span>
          <h1 className="lp-title">Hello {name} 👋</h1>
          <p className="lp-subtitle">
            Please wait! The teacher will start a poll shortly.
          </p>
        </div>

        <ChatWidget meName={name} meRole="student" participants={participants} />
      </div>
    );
  }

  if (poll && !results) {
    const timeLeft = Math.max(0, poll.endsAt - Date.now());
    const secLeft = Math.floor(timeLeft / 1000);

    if (submitted) {
      return (
        <div className="lp-page">
          <div style={{ textAlign: "center" }}>
            <span className="lp-pill">Student</span>
            <h1 className="lp-title">Answer Submitted</h1>
            <p className="lp-subtitle">
              Waiting for poll to end...
            </p>
            <p className="lp-muted">
              {answeredCount}/{totalStudents} students answered
            </p>
          </div>
          <ChatWidget meName={name} meRole="student" participants={participants} />
        </div>
      );
    }

    return (
      <div className="lp-page">
        <div>
          <span className="lp-pill">Respond</span>
          <h1 className="lp-title">{poll.question}</h1>
          <p className="lp-subtitle">
            Select an option before the timer runs out.
          </p>

          <p className="lp-muted">Time left: {secLeft}s</p>

          <div className="lp-student-options">
            {poll.options.map((opt, i) => (
              <label key={i}>
                <input
                  type="radio"
                  name="opt"
                  checked={chosen === i}
                  onChange={() => setChosen(i)}
                />
                {opt}
              </label>
            ))}
          </div>

          <div style={{ marginTop: 22, textAlign: "center" }}>
            <button
              className="lp-primary-btn"
              disabled={chosen === null}
              onClick={submit}
            >
              Submit Response
            </button>
          </div>
        </div>

        <ChatWidget meName={name} meRole="student" participants={participants} />
      </div>
    );
  }

  if (results) {
    return (
      <div className="lp-page">
        <div>
          <span className="lp-pill">Results</span>
          <h1 className="lp-title">{results.question}</h1>
          <p className="lp-subtitle">Here are the results from your class!</p>

          <ul className="lp-results-list">
            {results.results.map((count, i) => {
              const total = results.results.reduce((a, b) => a + b, 0) || 1;
              const pct = Math.round((count / total) * 100);
              return (
                <li key={i}>
                  <div>{results.options[i]}</div>
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

        <ChatWidget meName={name} meRole="student" participants={participants} />
      </div>
    );
  }
}
