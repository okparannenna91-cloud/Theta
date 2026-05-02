const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log("Fetching first project...");
        const project = await prisma.project.findFirst();
        if (!project) {
            console.log("No project found in DB");
            return;
        }
        console.log("Found project:", project.id, project.name);

        console.log("\nSimulating GET /api/projects/[id]");
        
        // Simulating findAcrossShards
        const record = await prisma.project.findFirst({ where: { id: project.id } });
        console.log("Project found via findAcrossShards:", !!record);

        // Verify workspace access
        const membership = await prisma.workspaceMember.findUnique({
            where: {
                workspaceId_userId: {
                    workspaceId: project.workspaceId,
                    userId: project.userId, // Simulating the current user who created it
                },
            },
        });
        console.log("Workspace membership:", !!membership);

        // Re-fetch project with relations
        const fullProject = await prisma.project.findUnique({
            where: { id: project.id },
            include: {
                tasks: {
                    include: {
                        comments: true,
                        subtasks: true,
                        tags: true,
                    }
                },
                boards: {
                    include: {
                        columns: true,
                        _count: { select: { tasks: true } }
                    }
                },
                team: {
                    include: {
                        members: true
                    }
                },
                projectTeams: {
                    include: {
                        team: {
                            include: {
                                members: true
                            }
                        }
                    }
                },
                _count: { select: { tasks: true } }
            }
        });
        console.log("Full project fetched:", !!fullProject);
        if (fullProject) {
            console.log("- Tasks:", fullProject.tasks?.length);
            console.log("- Boards:", fullProject.boards?.length);
            console.log("- Team:", !!fullProject.team);
        }

        console.log("\nFetching first team...");
        const team = await prisma.team.findFirst();
        if (!team) {
            console.log("No team found in DB");
            return;
        }
        console.log("Found team:", team.id, team.name);

        console.log("\nSimulating GET /api/teams/[id]/members");
        const membersRawShard = await prisma.teamMember.findMany({
            where: { teamId: team.id },
            orderBy: { role: "asc" },
        });
        console.log("Members found:", membersRawShard.length);

        console.log("\nSimulating POST /api/chat");
        try {
            const messageRaw = await prisma.chatMessage.create({
                data: {
                    content: "Test message",
                    workspaceId: team.workspaceId,
                    projectId: undefined,
                    teamId: team.id,
                    userId: project.userId,
                    attachment: undefined,
                    replyToId: undefined,
                },
            });
            console.log("Chat message created successfully:", messageRaw.id);
        } catch (e) {
            console.log("Chat creation error:", e.message);
        }
        
    } catch (e) {
        console.error("Fatal error:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
