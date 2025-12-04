import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
app.use(cors());

// simple health route
app.get("/", (req, res) => {
  res.send("Intervue live polling backend is running");
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// ------- STATE ---------
let students = new Map(); // socketId -> { name }
let currentPoll = null;   // { id, question, options, answers Map, endsAt, createdAt }
let pollTimer = null;
let pollCounter = 1;
let pollHistory = [];     // array of { id, question, options, results, createdAt, totalStudents, answeredCount }

// helpers
function computeResults(poll) {
  if (!poll) return null;
  const counts = Array(poll.options.length).fill(0);
  for (const ans of poll.answers.values()) {
    if (typeof ans === "number" && ans >= 0 && ans < counts.length) {
      counts[ans]++;
    }
  }
  return counts;
}

function broadcastParticipants() {
  const list = Array.from(students.entries()).map(([id, info]) => ({
    id,
    name: info.name,
  }));
  io.emit("participants", list);
}

function clearPollTimer() {
  if (pollTimer) {
    clearTimeout(pollTimer);
    pollTimer = null;
  }
}

function endPollAndBroadcast() {
  if (!currentPoll) return;

  const results = computeResults(currentPoll);
  const summary = {
    id: currentPoll.id,
    question: currentPoll.question,
    options: currentPoll.options,
    results,
    createdAt: currentPoll.createdAt,
    totalStudents: students.size,
    answeredCount: currentPoll.answers.size,
  };

  // store in history (limit to last 20)
  pollHistory.push(summary);
  if (pollHistory.length > 20) {
    pollHistory.shift();
  }

  io.emit("pollEnded", summary);
  io.emit("pollHistory", pollHistory);

  clearPollTimer();
  currentPoll = null;
}

// ------- SOCKET.IO LOGIC ----------
io.on("connection", (socket) => {
  console.log("connected:", socket.id);

  // initial registration
  socket.on("register", ({ name, role }) => {
    if (role === "student") {
      students.set(socket.id, { name });
      broadcastParticipants();

      // update counts to teacher
      io.emit("studentCount", { totalStudents: students.size });
    }

    // send running poll if there is one
    if (currentPoll) {
      socket.emit("pollStarted", {
        question: currentPoll.question,
        options: currentPoll.options,
        endsAt: currentPoll.endsAt,
        totalStudents: students.size,
        answeredCount: currentPoll.answers.size,
      });
    }

    // send history on join (for teacher mostly)
    socket.emit("pollHistory", pollHistory);
  });

  // teacher creates poll
  socket.on("createPoll", ({ question, options, durationSec }) => {
    if (currentPoll) {
      socket.emit("errorMessage", "A poll is already running.");
      return;
    }

    const cleanOptions = options
      .map((o) => o.trim())
      .filter((o) => o.length > 0);
    if (!question || cleanOptions.length < 2) {
      socket.emit(
        "errorMessage",
        "Question and at least two options are required."
      );
      return;
    }

    const duration = durationSec && durationSec > 0 ? durationSec : 60;
    const now = Date.now();
    const endsAt = now + duration * 1000;

    currentPoll = {
      id: pollCounter++,
      question,
      options: cleanOptions,
      answers: new Map(), // socketId -> optionIndex
      endsAt,
      createdAt: now,
    };

    clearPollTimer();
    pollTimer = setTimeout(() => {
      endPollAndBroadcast();
    }, duration * 1000);

    io.emit("pollStarted", {
      question: currentPoll.question,
      options: currentPoll.options,
      endsAt,
      totalStudents: students.size,
      answeredCount: 0,
    });
  });

  // student answers
  socket.on("submitAnswer", ({ optionIndex }) => {
    if (!currentPoll) return;
    if (!students.has(socket.id)) return;
    if (currentPoll.answers.has(socket.id)) return;

    currentPoll.answers.set(socket.id, optionIndex);
    const answeredCount = currentPoll.answers.size;

    io.emit("answerUpdate", {
      answeredCount,
      totalStudents: students.size,
    });

    // if everyone answered, close early
    if (answeredCount === students.size && students.size > 0) {
      endPollAndBroadcast();
    }
  });

  // teacher requests explicit history
  socket.on("requestHistory", () => {
    socket.emit("pollHistory", pollHistory);
  });

  // teacher kicks a student
  socket.on("kickStudent", ({ targetId }) => {
    const targetInfo = students.get(targetId);
    if (!targetInfo) return;

    // notify & disconnect target
    const targetSocket = io.sockets.sockets.get(targetId);
    if (targetSocket) {
      targetSocket.emit("kicked");
      targetSocket.disconnect(true);
    }

    students.delete(targetId);
    broadcastParticipants();

    if (currentPoll && currentPoll.answers.has(targetId)) {
      currentPoll.answers.delete(targetId);
    }

    io.emit("studentCount", { totalStudents: students.size });
    if (currentPoll) {
      io.emit("answerUpdate", {
        answeredCount: currentPoll.answers.size,
        totalStudents: students.size,
      });
    }
  });

  // chat messages
  socket.on("sendChatMessage", ({ from, role, text, ts }) => {
    const clean = (text || "").trim();
    if (!clean) return;
    io.emit("chatMessage", {
      from: from || "User",
      role: role || "student",
      text: clean,
      ts: ts || Date.now(),
    });
  });

  // disconnect
  socket.on("disconnect", () => {
    const removed = students.delete(socket.id);
    if (removed) {
      broadcastParticipants();
      io.emit("studentCount", { totalStudents: students.size });
    }

    if (currentPoll && currentPoll.answers.has(socket.id)) {
      currentPoll.answers.delete(socket.id);
      io.emit("answerUpdate", {
        answeredCount: currentPoll.answers.size,
        totalStudents: students.size,
      });
    }

    console.log("disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
