import { useState, useEffect } from "react";

export default function BlobsAuth() {
  const [blobs, setBlobs] = useState<{ id: number; top: number; left: number; delay: number }[]>([]);

  useEffect(() => {
    const items = [];
    for (let i = 0; i < 10; i++) {
      items.push({
        id: i,
        top: Math.random() * 100,
        left: Math.random() * 100,
        delay: Math.random() * 8,
      });
    }
    setBlobs(items);
  }, []);

  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
      {blobs.map((blob) => (
        <div
          key={blob.id}
          style={{
            position: "absolute",
            top: `${blob.top}%`,
            left: `${blob.left}%`,
            width: "400px",
            height: "400px",
            filter: "blur(70px)",
            backgroundImage: "linear-gradient(#6e20ff, #ef7be9)",
            animation: `rotate 8s linear ${blob.delay}s infinite`,
            opacity: 0.4,
            borderRadius: "30% 70% 70% 30% / 30% 30% 70% 70%",
          }}
        />
      ))}
    </div>
  );
}
