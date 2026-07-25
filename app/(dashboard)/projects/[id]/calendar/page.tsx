import CalendarPage from "@/components/calendar/calendar-page";

export default function Page({ params }: { params: { id: string } }) {
  return <CalendarPage projectId={params.id} />;
}