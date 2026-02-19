"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserButton } from "@clerk/nextjs";

export default function ProfilePage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="mb-6 lg:mb-8"
      >
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Profile</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Manage your profile and account settings
        </p>
      </motion.div>

      <Card>
        <CardHeader>
          <CardTitle>Account Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <UserButton />
            <div>
              <p className="font-medium text-sm sm:text-base">Manage your account</p>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Update your profile, email, and password through Clerk
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

