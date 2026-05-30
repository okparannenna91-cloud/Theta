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

                <h1 className="text-4xl font-black mb-4">Terms of Service for Theta</h1>
                <p className="text-xl font-medium text-slate-500 mb-8">Effective Date: April 27, 2026</p>

                <div className="prose prose-slate max-w-none space-y-8 text-slate-600">
                    <p>Welcome to Theta (“we”, “our”, or “us”). By accessing or using our platform (“Service”), you agree to these Terms of Service. If you do not agree, do not use Theta.</p>

                    <section>
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">1. Use of Service</h2>
                        <p>You agree to use Theta only for lawful purposes and in accordance with these Terms.</p>
                        <p>You must not:</p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>Use Theta for illegal activities</li>
                            <li>Attempt to hack, disrupt, or overload the system</li>
                            <li>Upload harmful or malicious content</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">2. Accounts</h2>
                        <p>To use Theta, you must create an account.</p>
                        <p>You are responsible for:</p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>Keeping your login credentials secure</li>
                            <li>All activity under your account</li>
                        </ul>
                        <p>We reserve the right to suspend or terminate accounts that violate these Terms.</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">3. User Content</h2>
                        <p>You retain ownership of all content you create (projects, tasks, files).</p>
                        <p>By using Theta, you grant us permission to:</p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>Store and process your content</li>
                            <li>Display it within the platform for functionality</li>
                        </ul>
                        <p>We do not claim ownership of your data.</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">4. Integrations</h2>
                        <p>Theta allows integrations with third-party services (e.g., GitHub, Slack).</p>
                        <p>By connecting these services:</p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>You grant permission for data access required for functionality</li>
                            <li>You agree to their respective terms and policies</li>
                        </ul>
                        <p>We are not responsible for third-party services.</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">5. Availability</h2>
                        <p>We aim to provide a reliable service but do not guarantee:</p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>100% uptime</li>
                            <li>Error-free operation</li>
                        </ul>
                        <p>We may modify or discontinue features at any time.</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">6. Termination</h2>
                        <p>We may suspend or terminate your account if:</p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>You violate these Terms</li>
                            <li>You misuse the platform</li>
                        </ul>
                        <p>You may stop using Theta at any time.</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">7. Limitation of Liability</h2>
                        <p>Theta is provided “as is”.</p>
                        <p>We are not liable for:</p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>Data loss</li>
                            <li>Service interruptions</li>
                            <li>Indirect or consequential damages</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">8. Changes to Terms</h2>
                        <p>We may update these Terms from time to time.</p>
                        <p>Continued use of Theta means you accept the updated Terms.</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">9. Governing Law</h2>
                        <p>These Terms shall be governed by and interpreted in accordance with applicable laws.</p>
                        <p>Users accessing Theta from different jurisdictions are responsible for compliance with local laws.</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">10. Contact</h2>
                        <p>For questions:</p>
                        <p>📧 <strong>support@thetapm.site</strong><br />
                        🌐 <strong>www.thetapm.site</strong></p>
                    </section>

                    <div className="pt-8 border-t">
                        <p className="font-bold text-slate-900 italic underline decoration-indigo-500 decoration-2">By using Theta, you agree to these Terms.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
