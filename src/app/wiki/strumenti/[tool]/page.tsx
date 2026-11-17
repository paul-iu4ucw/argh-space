import { ToolPage, toolMetadata } from "../../_tools/tool-page";
type P = { params: Promise<{ tool: string }> };
export async function generateMetadata({ params }: P) { return toolMetadata("it", (await params).tool); }
export default async function Page({ params }: P) { return <ToolPage lang="it" slug={(await params).tool} />; }
