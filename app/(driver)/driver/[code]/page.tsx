import { DoorPage } from "@/components/driver/DoorPage";
export const metadata = { title: "At the door" };
export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <DoorPage code={decodeURIComponent(code)} />;
}
