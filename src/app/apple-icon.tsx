import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home-screen icon: the crawler's face on lime. */
export default function AppleIcon() {
  const eye = (left: number) => (
    <div
      style={{
        position: "absolute",
        top: 52,
        left,
        width: 44,
        height: 44,
        borderRadius: 44,
        background: "#ffffff",
        border: "5px solid #1a1712",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ width: 18, height: 18, borderRadius: 18, background: "#1a1712", marginTop: 6 }} />
    </div>
  );
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: "#d6ff3d" }}>
        <div style={{ position: "absolute", top: 70, left: 40, width: 100, height: 96, borderRadius: 100, background: "#1a1712" }} />
        {eye(40)}
        {eye(96)}
      </div>
    ),
    size,
  );
}
