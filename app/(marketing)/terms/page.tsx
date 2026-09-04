import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function TermsOfService() {
    return (
        <div className="min-h-screen bg-background text-foreground py-20 px-6">
            <div className="max-w-3xl mx-auto">
                <Link href="/">
                    <Button variant="ghost" className="mb-8 group">
                        <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Back to Home
                    </Button>
                </Link>

                <h1 className="text-4xl font-bold tracking-tight mb-4">Terms of Service for Theta PM</h1>
                <p className="text-lg font-medium text-muted-foreground mb-8">Effective Date: April 27, 2026</p>

                <div className="max-w-none space-y-8 text-muted-foreground leading-relaxed">
                    <p className="text-sm">Welcome to Theta PM (“we”, “our”, or “us”). By accessing or using our platform (“Service”), you agree to these Terms of Service. If you do not agree, do not use Theta PM.</p>

                    <section className="space-y-3">
                        <h2 className="text-2xl font-semibold tracking-tight text-foreground">1. Use of Service</h2>
                        <p className="text-sm">You agree to use Theta PM only for lawful purposes and in accordance with these Terms.</p>
                        <p className="text-sm">You must not:</p>
                        <ul className="list-disc pl-6 space-y-1 text-sm">
                            <li>Use Theta PM for illegal activities</li>
                            <li>Attempt to hack, disrupt, or overload the system</li>
                            <li>Upload harmful or malicious content</li>
                        </ul>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-2xl font-semibold tracking-tight text-foreground">2. Accounts</h2>
                        <p className="text-sm">To use Theta PM, you must create an account.</p>
                        <p className="text-sm">You are responsible for:</p>
                        <ul className="list-disc pl-6 space-y-1 text-sm">
                            <li>Keeping your login credentials secure</li>
                            <li>All activity under your account</li>
                        </ul>
                        <p className="text-sm">We reserve the right to suspend or terminate accounts that violate these Terms.</p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-2xl font-semibold tracking-tight text-foreground">3. User Content</h2>
                        <p className="text-sm">You retain ownership of all content you create (projects, tasks, files).</p>
                        <p className="text-sm">By using Theta PM, you grant us permission to:</p>
                        <ul className="list-disc pl-6 space-y-1 text-sm">
                            <li>Store and process your content</li>
                            <li>Display it within the platform for functionality</li>
                        </ul>
                        <p className="text-sm">We do not claim ownership of your data.</p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-2xl font-semibold tracking-tight text-foreground">4. Integrations</h2>
                        <p className="text-sm">Theta PM allows integrations with third-party services (e.g., GitHub, Slack).</p>
                        <p className="text-sm">By connecting these services:</p>
                        <ul className="list-disc pl-6 space-y-1 text-sm">
                            <li>You grant permission for data access required for functionality</li>
                            <li>You agree to their respective terms and policies</li>
                        </ul>
                        <p className="text-sm">We are not responsible for third-party services.</p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-2xl font-semibold tracking-tight text-foreground">5. Availability</h2>
                        <p className="text-sm">We aim to provide a reliable service but do not guarantee:</p>
                        <ul className="list-disc pl-6 space-y-1 text-sm">
                            <li>100% uptime</li>
                            <li>Error-free operation</li>
                        </ul>
                        <p className="text-sm">We may modify or discontinue features at any time.</p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-2xl font-semibold tracking-tight text-foreground">6. Termination</h2>
                        <p className="text-sm">We may suspend or terminate your account if:</p>
                        <ul className="list-disc pl-6 space-y-1 text-sm">
                            <li>You violate these Terms</li>
                            <li>You misuse the platform</li>
                        </ul>
                        <p className="text-sm">You may stop using Theta PM at any time.</p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-2xl font-semibold tracking-tight text-foreground">7. Limitation of Liability</h2>
                        <p className="text-sm">Theta PM is provided “as is”.</p>
                        <p className="text-sm">We are not liable for:</p>
                        <ul className="list-disc pl-6 space-y-1 text-sm">
                            <li>Data loss</li>
                            <li>Service interruptions</li>
                            <li>Indirect or consequential damages</li>
                        </ul>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-2xl font-semibold tracking-tight text-foreground">8. Changes to Terms</h2>
                        <p className="text-sm">We may update these Terms from time to time.</p>
                        <p className="text-sm">Continued use of Theta PM means you accept the updated Terms.</p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-2xl font-semibold tracking-tight text-foreground">9. Governing Law</h2>
                        <p className="text-sm">These Terms shall be governed by and interpreted in accordance with applicable laws.</p>
                        <p className="text-sm">Users accessing Theta PM from different jurisdictions are responsible for compliance with local laws.</p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-2xl font-semibold tracking-tight text-foreground">10. Contact</h2>
                        <p className="text-sm">For questions:</p>
                        <p className="text-sm">📧 <strong className="text-foreground">support@thetapm.site</strong><br />
                        🌐 <strong className="text-foreground">www.thetapm.site</strong></p>
                    </section>

                    <div className="pt-8 border-t border-border/40">
                        <p className="font-semibold text-foreground italic underline decoration-primary decoration-2">By using Theta PM, you agree to these Terms.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
