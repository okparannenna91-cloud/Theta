import TimelinePage from "@/components/timeline/timeline-page";

export default function Page({ params }: { params: { id: string } }) {
  return <TimelinePage projectId={params.id} />;
}