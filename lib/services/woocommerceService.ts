import { prisma } from "@/lib/prisma";
import { decrypt, encrypt } from "@/lib/crypto";

export class WooCommerceService {
    private workspaceId: string;

    constructor(workspaceId: string) {
        this.workspaceId = workspaceId;
    }

    private async getConfigs() {
        
        const integration = await prisma.integration.findFirst({
            where: {
                workspaceId: this.workspaceId,
                // @ts-ignore
                provider: "woocommerce"
            },
        });

        if (!integration || !integration.accessToken || !integration.config) {
            throw new Error("WooCommerce integration not configured correctly");
        }

        const config = integration.config as Record<string, unknown> | null;
        if (!config?.siteUrl) {
            throw new Error("WooCommerce site URL is missing");
        }
        if (!config?.consumerSecret) {
            throw new Error("WooCommerce consumer secret is missing");
        }

        return {
            siteUrl: config.siteUrl as string,
            consumerKey: decrypt(integration.accessToken),
            consumerSecret: decrypt(config.consumerSecret as string)
        };
    }

    /**
     * Fetch all products from the WooCommerce store
     */
    async getProducts() {
        const { siteUrl, consumerKey, consumerSecret } = await this.getConfigs();
        const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");

        const response = await fetch(`${siteUrl}/wp-json/wc/v3/products`, {
            headers: {
                Authorization: `Basic ${auth}`,
            },
        });

        if (!response.ok) {
            throw new Error(`WooCommerce API Error: ${response.statusText}`);
        }

        return response.json();
    }

    /**
     * Fetch recent orders from the WooCommerce store
     */
    async getOrders() {
        const { siteUrl, consumerKey, consumerSecret } = await this.getConfigs();
        const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");

        const response = await fetch(`${siteUrl}/wp-json/wc/v3/orders`, {
            headers: {
                Authorization: `Basic ${auth}`,
            },
        });

        if (!response.ok) {
            throw new Error(`WooCommerce API Error: ${response.statusText}`);
        }

        return response.json();
    }
}
