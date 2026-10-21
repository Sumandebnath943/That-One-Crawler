import { ImageResponse } from "next/og";

export const alt = "That One Crawler: your blog has issues. We'll find every single one.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "#f6f1e6",
          color: "#1a1712",
          border: "16px solid #1a1712",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              display: "flex",
              padding: "10px 24px",
              background: "#d6ff3d",
              border: "4px solid #1a1712",
              borderRadius: 999,
              fontSize: 30,
              fontWeight: 700,
            }}
          >
            That One Crawler
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 92, fontWeight: 800, lineHeight: 1 }}>
          <span>Your blog has issues.</span>
          <span style={{ background: "#d6ff3d", padding: "4px 12px", marginTop: 16, alignSelf: "flex-start" }}>
            We&apos;ll find every one.
          </span>
        </div>
        <div style={{ display: "flex", fontSize: 30, color: "#4e483e" }}>
          Free SEO audits for blogs. No signup. No feelings spared.
        </div>
      </div>
    ),
    size,
  );
}
