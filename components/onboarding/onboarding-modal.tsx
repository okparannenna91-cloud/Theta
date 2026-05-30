"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    CheckCircle2,
    Users,
    Target,
    Zap,
    ArrowRight,
    Star,
    Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

interface OnboardingModalProps {
    onComplete: () => void;
}

export function OnboardingModal({ onComplete }: OnboardingModalProps) {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        role: "",
        teamSize: "",
        mainGoal: "",
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const nextStep = () => setStep(s => s + 1);
    const prevStep = () => setStep(s => s - 1);

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const res = await fetch("/api/user/preferences", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ onboardingComplete: true }),
            });

            if (!res.ok) throw new Error("Failed to save onboarding status");

            toast.success("Welcome to Theta! Let's build something great.");
            onComplete();
        } catch (error) {
            toast.error("Something went wrong. Please try again.");
            setIsSubmitting(false);
        }
    };

    const steps = [
        {
            id: 1,
            title: "Welcome to Theta",
            description: "We're excited to have you! Let's personalize your experience.",
            icon: Sparkles,
        },
        {
            id: 2,
            title: "What is your role?",
            description: "Help us tailor your dashboard to your needs.",
            icon: Users,
            options: [
                { label: "Product Manager", value: "pm" },
                { label: "Software Engineer", value: "engineer" },
                { label: "Agency Owner", value: "agency" },
                { label: "Independent Creator", value: "solo" },
            ],
            field: "role"
        },
        {
            id: 3,
            title: "Your main goal",
            description: "What are you looking to achieve first?",
            icon: Target,
            options: [
                { label: "Organize my team", value: "team" },
                { label: "Track client projects", value: "clients" },
                { label: "Boost personal output", value: "personal" },
                { label: "Automate with AI", value: "ai" },
            ],
            field: "mainGoal"
        },
        {
            id: 4,
            title: "Ready to launch?",
            description: "You're all set to explore your workspace.",
            icon: Zap,
        }
    ];

    const currentStepData = steps[step - 1];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md px-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="w-full max-w-xl"
            >
                <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-white">
                    <CardContent className="p-0">
                        {/* Progress Bar */}
                        <div className="h-2 w-full bg-slate-100 flex">
                            <motion.div
                                className="h-full bg-indigo-600"
                                initial={{ width: "0%" }}
                                animate={{ width: `${(step / steps.length) * 100}%` }}
                            />
                        </div>

                        <div className="p-8 sm:p-12">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={step}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="flex flex-col items-center text-center"
                                >
                                    <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-8 text-indigo-600">
                                        <currentStepData.icon className="w-8 h-8" />
                                    </div>

                                    <h2 className="text-3xl font-black text-slate-900 mb-4">{currentStepData.title}</h2>
                                    <p className="text-slate-500 mb-10 text-lg leading-relaxed">{currentStepData.description}</p>

                                    {currentStepData.options && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                                            {currentStepData.options.map((opt) => (
                                                <button
                                                    key={opt.value}
                                                    onClick={() => {
                                                        setFormData({ ...formData, [currentStepData.field as string]: opt.value });
                                                        nextStep();
                                                    }}
                                                    className={`p-6 rounded-2xl border-2 text-left transition-all duration-200 group ${formData[currentStepData.field as keyof typeof formData] === opt.value
                                                            ? "border-indigo-600 bg-indigo-50/50"
                                                            : "border-slate-100 bg-white hover:border-indigo-200"
                                                        }`}
                                                >
                                                    <span className={`font-bold block ${formData[currentStepData.field as keyof typeof formData] === opt.value
                                                            ? "text-indigo-600"
                                                            : "text-slate-700"
                                                        }`}>
                                                        {opt.label}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {step === 1 && (
                                        <Button
                                            onClick={nextStep}
                                            className="w-full bg-indigo-600 hover:bg-indigo-700 h-16 rounded-2xl text-lg font-black shadow-lg shadow-indigo-100 group"
                                        >
                                            Let&apos;s Go <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                        </Button>
                                    )}

                                    {step === steps.length && (
                                        <Button
                                            onClick={handleSubmit}
                                            disabled={isSubmitting}
                                            className="w-full bg-indigo-600 hover:bg-indigo-700 h-16 rounded-2xl text-lg font-black shadow-lg shadow-indigo-100 flex items-center gap-2"
                                        >
                                            <CheckCircle2 className="w-6 h-6" /> Explore Dashboard
                                        </Button>
                                    )}
                                </motion.div>
                            </AnimatePresence>

                            {step > 1 && step < steps.length && !currentStepData.options && (
                                <div className="mt-10 flex gap-4 w-full">
                                    <Button variant="ghost" onClick={prevStep} className="flex-1 h-14 rounded-xl font-bold">Back</Button>
                                    <Button onClick={nextStep} className="flex-[2] h-14 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold">Continue</Button>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
