import { Inngest } from "inngest";

// Initialize the Inngest client
// This will be used to dispatch events and create background functions for Nova AI
export const inngest = new Inngest({ id: "theta-nova" });
