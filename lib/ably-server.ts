import { getAblyServer, publishToChannel, getWorkspaceChannel } from "./ably";

export const getAblyChannel = (channelName: string) => {
    return getAblyServer().channels.get(channelName);
};

export const ably = {
    publish: publishToChannel,
    getWorkspaceChannel,
    getServer: getAblyServer,
    getChannel: getAblyChannel
};
