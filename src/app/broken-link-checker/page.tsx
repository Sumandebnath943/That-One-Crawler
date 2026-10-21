import { toolMetadata, ToolPageView } from "@/components/content/ToolPageView";

export const metadata = toolMetadata("broken-link-checker");

export default function Page() {
  return <ToolPageView slug="broken-link-checker" />;
}