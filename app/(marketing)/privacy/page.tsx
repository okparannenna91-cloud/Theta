import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicy() {
    return (
        <div className="min-h-screen bg-background text-foreground py-20 px-6">
            <div className="max-w-3xl mx-auto">
                <Link href="/">
                    <Button variant="ghost" className="mb-8 group">
                        <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Back to Home
                    </Button>
                </Link>

                <h1 className="text-4xl font-bold tracking-tight mb-4">Privacy Policy for Theta PM</h1>
                <p className="text-lg font-medium text-muted-foreground mb-8">Effective Date: April 27, 2026</p>

                <div className="max-w-none space-y-8 text-muted-foreground leading-relaxed">
                    <p>Welcome to Theta PM (“we”, “our”, or “us”). Your privacy is important to us. This Privacy Policy explains how we collect, use, and protect your information when you use our project management platform (“Service”).</p>

                    <section className="space-y-4">
                        <h2 className="text-2xl font-semibold tracking-tight text-foreground">1. Information We Collect</h2>
                        <div className="space-y-4">
                            <h3 className="text-base font-semibold text-foreground">a. Personal Information</h3>
                            <ul className="list-disc pl-6 space-y-1 text-sm">
                                <li>Name</li>
                                <li>Email address</li>
                                <li>Account login details</li>
                                <li>Profile information</li>
                            </ul>

                            <h3 className="text-base font-semibold text-foreground">b. Usage Data</h3>
                            <ul className="list-disc pl-6 space-y-1 text-sm">
                                <li>Pages visited</li>
                                <li>Features used</li>
                                <li>Device and browser information</li>
                                <li>IP address</li>
                            </ul>

                            <h3 className="text-base font-semibold text-foreground">c. Project Data</h3>
                            <ul className="list-disc pl-6 space-y-1 text-sm">
                                <li>Tasks, files, messages, and content you create within Theta PM</li>
                            </ul>

                            <h3 className="text-base font-semibold text-foreground">d. Integrations Data</h3>
                            <p className="text-sm">If you connect third-party services (e.g., Slack, GitHub, Google), we may access limited data required to enable those integrations.</p>
                        </div>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-2xl font-semibold tracking-tight text-foreground">2. How We Use Your Information</h2>
                        <p className="text-sm">We use your data to:</p>
                        <ul className="list-disc pl-6 space-y-1 text-sm">
                            <li>Provide and improve our Service</li>
                            <li>Manage user accounts</li>
                            <li>Enable collaboration features</li>
                            <li>Process integrations</li>
                            <li>Communicate updates and support messages</li>
                            <li>Ensure security and prevent abuse</li>
                        </ul>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-2xl font-semibold tracking-tight text-foreground">3. How We Share Your Information</h2>
                        <p className="text-sm">We do not sell your personal data.</p>
                        <p className="text-sm">We may share data with:</p>
                        <ul className="list-disc pl-6 space-y-1 text-sm">
                            <li>Service providers (hosting, analytics, authentication)</li>
                            <li>Integration partners (only when you connect them)</li>
                            <li>Legal authorities (if required by law)</li>
                        </ul>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-2xl font-semibold tracking-tight text-foreground">4. Data Storage & Security</h2>
                        <p className="text-sm">We implement industry-standard security measures to protect your data. However, no system is 100% secure.</p>
                        <p className="text-sm">Your data may be stored on secure servers provided by third-party cloud providers.</p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-2xl font-semibold tracking-tight text-foreground">5. Your Rights</h2>
                        <p className="text-sm">You have the right to:</p>
                        <ul className="list-disc pl-6 space-y-1 text-sm">
                            <li>Access your data</li>
                            <li>Update or delete your information</li>
                            <li>Request account deletion</li>
                        </ul>
                        <p className="text-sm mt-4">To exercise these rights, contact us at: <strong className="text-foreground">support@thetapm.site</strong></p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-2xl font-semibold tracking-tight text-foreground">6. Cookies & Tracking</h2>
                        <p className="text-sm">We may use cookies and similar technologies to:</p>
                        <ul className="list-disc pl-6 space-y-1 text-sm">
                            <li>Keep you logged in</li>
                            <li>Improve user experience</li>
                            <li>Analyze usage</li>
                        </ul>
                        <p className="text-sm">You can disable cookies via your browser settings.</p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-2xl font-semibold tracking-tight text-foreground">7. Third-Party Services</h2>
                        <p className="text-sm">Theta PM may contain links or integrations with third-party services. We are not responsible for their privacy practices.</p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-2xl font-semibold tracking-tight text-foreground">8. Children’s Privacy</h2>
                        <p className="text-sm">Theta PM is not intended for users under 13. We do not knowingly collect data from children.</p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-2xl font-semibold tracking-tight text-foreground">9. Changes to This Policy</h2>
                        <p className="text-sm">We may update this Privacy Policy from time to time. Updates will be posted on this page.</p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-2xl font-semibold tracking-tight text-foreground">10. Contact Us</h2>
                        <p className="text-sm">If you have any questions, contact us at:</p>
                        <p className="text-sm">📧 <strong className="text-foreground">support@thetapm.site</strong><br />
                        🌐 <strong className="text-foreground">www.thetapm.site</strong></p>
                    </section>

                    <div className="pt-8 border-t border-border/40">
                        <p className="font-semibold text-foreground italic underline decoration-primary decoration-2">Final Note: By using Theta PM, you agree to this Privacy Policy.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
