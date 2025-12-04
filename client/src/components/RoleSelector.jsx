import React, { useState } from "react";

export default function RoleSelector({ onContinue }) {
  const [name, setName] = useState(
    window.localStorage.getItem("pollName") || ""
  );
  const [role, setRole] = useState("student");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    window.localStorage.setItem("pollName", name.trim());
    onContinue({ name: name.trim(), role });
  };

  return (
    <div className="lp-page">
      <div className="lp-container">
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <span className="lp-pill">Intervue Poll</span>
          <h1 className="lp-title">
            Welcome to the{" "}
            <span style={{ color: "var(--primary)" }}>Live Polling System</span>
          </h1>
          <p className="lp-subtitle">
            Please select the role that best describes you to begin using the
            live polling system.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ textAlign: "center" }}>
          <div className="lp-role-row">
            <div
              className={
                "lp-card lp-role-card" +
                (role === "student" ? " lp-role-card--active" : "")
              }
              onClick={() => setRole("student")}
            >
              <h3>I'm a Student</h3>
              <p>
                Submit answers and see live poll results with your classmates.
              </p>
            </div>

            <div
              className={
                "lp-card lp-role-card" +
                (role === "teacher" ? " lp-role-card--active" : "")
              }
              onClick={() => setRole("teacher")}
            >
              <h3>I'm a Teacher</h3>
              <p>
                Create and manage polls, ask questions, and monitor responses
                in real-time.
              </p>
            </div>
          </div>

          <div
            style={{
              maxWidth: 340,
              margin: "0 auto 18px",
              textAlign: "left",
            }}
          >
            <label className="lp-field-label">Enter your Name</label>
            <input
              className="lp-input"
              placeholder="Type your name to continue"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <button type="submit" className="lp-primary-btn">
            Continue
          </button>
        </form>
      </div>
    </div>
  );
}
