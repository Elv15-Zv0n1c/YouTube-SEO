import { useEffect, useState } from "react";

export default function App() {
  const [text, setText] = useState("App läuft");

  useEffect(() => {
    console.log("App gestartet");
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>{text}</h1>
    </div>
  );
}
