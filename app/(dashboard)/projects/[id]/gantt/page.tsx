import GanttPage from "@/components/gantt/gantt-page";

export default function Page({ params }: { params: { id: string } }) {
  return <GanttPage projectId={params.id} />;
}