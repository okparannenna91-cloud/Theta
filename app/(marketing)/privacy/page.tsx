import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicy() {
    return (
        <div className="min-h-screen bg-white py-20 px-4">
            <div className="max-w-3xl mx-auto">
                <Link href="/">
                    <Button variant="ghost" className="mb-8 group">
                        <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Back to Home
                    </Button>
                </Link>

                <h1 className="text-4xl font-black mb-8">Privacy Policy</h1>

                <div className="prose prose-slate max-w-none space-y-6 text-slate-600">
                    <p className="text-xl font-medium">Last updated: January 30, 2026</p>

                    <section>
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">1. Information We Collect</h2>
                        <p>We collect information you provide directly to us when you create an account, create or modify your profile, set up your workspace, or communicate with us. This includes your name, email address, and any project data you input into Theta.</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">2. How We Use Your Information</h2>
                        <p>We use the information we collect to provide, maintain, and improve our services, including to process transactions, send system alerts, and provide customer support. Theta uses advanced multi-tenant isolation to ensure your data is never accessible by other users.</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">3. Data Security</h2>
                        <p>We implement industry-standard security measures to protect your personal information and project data. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">4. Payment Processing</h2>
                        <p>Payment information is processed securely through our third-party providers, FastSpring and Paystack. We do not store your credit card details on our own servers.</p>
                    </section>
                </div>
            </div>
        </div>
    );
}
