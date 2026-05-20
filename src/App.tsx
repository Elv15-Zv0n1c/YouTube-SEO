import { useEffect, useState } from "react";

export default function App() {
  const [data, setData] = useState(null);

  useEffect(() => {
    console.log("App loaded");
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>App läuft</h1>
    </div>
  );
}
