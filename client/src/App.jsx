import React, { useState } from "react";
import RoleSelector from "./components/RoleSelector.jsx";
import TeacherView from "./components/TeacherView.jsx";
import StudentView from "./components/StudentView.jsx";

export default function App() {
  const [user, setUser] = useState(null); // { name, role }

  if (!user) return <RoleSelector onContinue={setUser} />;

  return user.role === "teacher" ? (
    <TeacherView name={user.name} />
  ) : (
    <StudentView name={user.name} />
  );
}
