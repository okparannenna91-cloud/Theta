import { getAblyServer, publishToChannel, getWorkspaceChannel } from "./ably";

export const ably = {
    publish: publishToChannel,
    getWorkspaceChannel,
    getServer: getAblyServer
};
