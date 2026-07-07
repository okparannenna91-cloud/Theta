import { getGoogleAccessToken } from "./oauth";

const FORMS_API = "https://forms.googleapis.com/v1";

export class GoogleFormsService {
    private workspaceId: string;

    constructor(workspaceId: string) {
        this.workspaceId = workspaceId;
    }

    async getForm(formId: string) {
        const token = await getGoogleAccessToken(this.workspaceId);
        const res = await fetch(`${FORMS_API}/forms/${encodeURIComponent(formId)}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Google Forms API error: ${res.status}`);
        return res.json();
    }

    async listResponses(formId: string) {
        const token = await getGoogleAccessToken(this.workspaceId);
        const res = await fetch(`${FORMS_API}/forms/${encodeURIComponent(formId)}/responses`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Google Forms API error: ${res.status}`);
        return res.json();
    }

    async createTaskFromResponse(formId: string, responseId: string, userId: string, projectId?: string) {
        const form = await this.getForm(formId);
        const responses = await this.listResponses(formId);
        const response = (responses.responses || []).find((r: any) => r.responseId === responseId);
        if (!response) throw new Error("Response not found");

        const title = `Form Response: ${form.info?.title || "Untitled Form"}`;
        const notes = Object.entries(response.answers || {})
            .map(([qId, answer]: [string, any]) => {
                const question = form.items?.find((i: any) => i.questionItem?.question?.questionId === qId);
                const questionText = question?.title || qId;
                const answerText = answer.textAnswers?.answers?.map((a: any) => a.value).join(", ") || "";
                return `${questionText}: ${answerText}`;
            })
            .join("\n");

        const { prisma } = await import("@/lib/prisma");

        const targetProjectId = projectId || (await prisma.project.findFirst({
            where: { workspaceId: this.workspaceId },
            select: { id: true },
        }))?.id || "";

        const task = await prisma.task.create({
            data: {
                title,
                description: notes,
                workspaceId: this.workspaceId,
                userId,
                projectId: targetProjectId,
                // @ts-ignore
                status: "todo",
            },
        });

        return task;
    }
}
