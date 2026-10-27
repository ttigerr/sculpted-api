const endpoints = [
  { name: "Postgres", path: "/api/db", purpose: "CREATE TABLE + INSERT + SELECT roundtrip" },
  { name: "Object Storage", path: "/api/storage", purpose: "PutObject + GetObject roundtrip (bucket: assets)" },
  { name: "Realtime", path: "/api/realtime", purpose: "Seal a live SELECT with NEON_REALTIME_SECRET" },
  { name: "Auth", path: "/api/auth/get-session", purpose: "Neon Auth (Managed Better Auth) proxy; GET session" },
];

export default function Home() {
  return (
    <main style={{ fontFamily: "system-ui", padding: 32, maxWidth: 720 }}>
      <h1>Sculpted Server · Neon health</h1>
      <p>Branch: <code>{process.env.NEON_BRANCH ?? "unknown"}</code></p>
      <ul>
        {endpoints.map((e) => (
          <li key={e.path} style={{ marginBottom: 8 }}>
            <strong>{e.name}</strong> &rarr; <a href={e.path}>{e.path}</a>
            <div style={{ opacity: 0.7, fontSize: 13 }}>{e.purpose}</div>
          </li>
        ))}
      </ul>
    </main>
  );
}
