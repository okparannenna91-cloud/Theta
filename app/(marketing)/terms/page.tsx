import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function TermsOfService() {
    return (
        <div className="min-h-screen bg-white py-20 px-4">
            <div className="max-w-3xl mx-auto">
                <Link href="/">
                    <Button variant="ghost" className="mb-8 group">
                        <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Back to Home
                    </Button>
                </Link>

                <h1 className="text-4xl font-black mb-8">Terms of Service</h1>

                <div className="prose prose-slate max-w-none space-y-6 text-slate-600">
                    <p className="text-xl font-medium">Last updated: January 30, 2026</p>

                    <section>
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">1. Acceptance of Terms</h2>
                        <p>By accessing or using Theta, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our service.</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">2. User Accounts</h2>
                        <p>You are responsible for maintaining the security of your account and for all activities that occur under your account. You must notify us immediately of any unauthorized use of your account.</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">3. Subscription and Billing</h2>
                        <p>Theta offers multiple subscription tiers. By subscribing, you agree to pay the fees associated with your chosen plan. Fees are non-refundable except as required by law. We reserve the right to change our fees at any time.</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">4. Plan Limits</h2>
                        <p>Each plan has specific limits on projects, tasks, and other resources. Exceeding these limits may require an upgrade or result in restricted access to certain features. Billing status is strictly enforced for all paid features.</p>
                    </section>
                </div>
            </div>
        </div>
    );
}
