import { format } from "date-fns";

export interface ExportOptions {
    format: "csv" | "json" | "pdf";
    tasks: any[];
}

export const exportTimeline = ({ format: exportFormat, tasks }: ExportOptions) => {
    if (exportFormat === "json") {
        const data = JSON.stringify(tasks, null, 2);
        downloadFile(data, `theta-timeline-${format(new Date(), "yyyy-MM-dd")}.json`, "application/json");
    } else if (exportFormat === "csv") {
        const headers = ["Title", "Start Date", "Due Date", "Status", "Priority", "Progress", "Is Milestone"];
        const rows = tasks.map(t => [
            t.title,
            t.startDate ? format(new Date(t.startDate), "yyyy-MM-dd") : "",
            t.dueDate ? format(new Date(t.dueDate), "yyyy-MM-dd") : "",
            t.status,
            t.priority,
            `${t.progress}%`,
            t.isMilestone ? "Yes" : "No"
        ]);

        const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
        downloadFile(csvContent, `theta-timeline-${format(new Date(), "yyyy-MM-dd")}.csv`, "text/csv");
    } else if (exportFormat === "pdf") {
        // High-fidelity PDF export would typically use jspdf + html2canvas
        // For now, we trigger the system print dialog which is optimized via CSS
        window.print();
    }
};

const downloadFile = (content: string, fileName: string, contentType: string) => {
    const a = document.createElement("a");
    const file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(a.href);
};
