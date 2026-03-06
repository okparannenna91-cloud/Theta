import { getPrismaClient } from "@/lib/prisma";
import { decrypt, encrypt } from "@/lib/crypto";

const TRELLO_API_URL = "https://api.trello.com/1";

export class TrelloService {
    private workspaceId: string;

    constructor(workspaceId: string) {
        this.workspaceId = workspaceId;
    }

    private async getCreds() {
        const prisma = getPrismaClient(this.workspaceId);
        const integration = await prisma.integration.findFirst({
            where: { workspaceId: this.workspaceId, provider: "trello" },
        });

        if (!integration || !integration.accessToken) {
            throw new Error("Trello integration not found");
        }

        return {
            apiKey: process.env.TRELLO_API_KEY,
            token: decrypt(integration.accessToken)
        };
    }

    async getBoards() {
        const { apiKey, token } = await this.getCreds();
        const response = await fetch(`${TRELLO_API_URL}/members/me/boards?key=${apiKey}&token=${token}`);
        if (!response.ok) throw new Error("Trello API Error");
        return response.json();
    }

    async getCards(boardId: string) {
        const { apiKey, token } = await this.getCreds();
        const response = await fetch(`${TRELLO_API_URL}/boards/${boardId}/cards?key=${apiKey}&token=${token}`);
        if (!response.ok) throw new Error("Trello API Error");
        return response.json();
    }
}
