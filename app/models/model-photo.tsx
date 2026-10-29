"use client";
import { useState } from "react";

/** Try each candidate once; never loop on a broken image or show another person's stock photo. */
export default function ModelPhoto({
  src,
  alternatives = [],
  name,
  className,
}: {
  src: string;
  alternatives?: string[];
  name: string;
  className?: string;
}) {
  const [failed, setFailed] = useState<string[]>([]);
  const current = [src, ...alternatives].find(
    (url) => url && !failed.includes(url),
  );
  return current ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={current}
      alt={`${name} 的相片`}
      className={className}
      onError={() => setFailed((previous) => [...previous, current])}
    />
  ) : (
    <div
      className={className}
      role="img"
      aria-label={`${name} 暫無相片`}
      style={{
        display: "grid",
        placeItems: "center",
        background: "#e8e1d8",
        color: "#655347",
      }}
    >
      暫無相片
    </div>
  );
}
