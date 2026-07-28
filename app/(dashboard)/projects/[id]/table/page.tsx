import ProjectTableView from "@/components/projects/project-table-view";

export default function Page({ params }: { params: { id: string } }) {
  return <ProjectTableView projectId={params.id} />;
}