import { getGoogleAccessToken } from "./oauth";

const TASKS_API = "https://tasks.googleapis.com/tasks/v1";

export class GoogleTasksService {
    private workspaceId: string;

    constructor(workspaceId: string) {
        this.workspaceId = workspaceId;
    }

    async listTaskLists() {
        const token = await getGoogleAccessToken(this.workspaceId);
        const res = await fetch(`${TASKS_API}/users/@me/lists`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Google Tasks API error: ${res.status}`);
        return res.json();
    }

    async listTasks(taskListId: string) {
        const token = await getGoogleAccessToken(this.workspaceId);
        const res = await fetch(`${TASKS_API}/lists/${encodeURIComponent(taskListId)}/tasks`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Google Tasks API error: ${res.status}`);
        return res.json();
    }

    async importTasks(taskListId: string) {
        const data = await this.listTasks(taskListId);
        const tasks = (data.items || []).map((item: any) => ({
            googleTaskId: item.id,
            title: item.title,
            notes: item.notes || "",
            due: item.due || null,
            status: item.status === "completed" ? "completed" : "needsAction",
        }));
        return tasks;
    }
}
