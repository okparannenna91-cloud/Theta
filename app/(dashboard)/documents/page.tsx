"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/hooks/use-workspace";
import { DocumentList } from "@/components/documents/document-list";
import { DocumentEditor } from "@/components/documents/document-editor";
import { Button } from "@/components/ui/button";
import { Plus, FileText } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export default function DocumentsPage() {
  const { activeWorkspaceId } = useWorkspace();
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [showNewDoc, setShowNewDoc] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState("");
  const queryClient = useQueryClient();

  const createDocMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newDocTitle,
          workspaceId: activeWorkspaceId,
        }),
      });
      if (!res.ok) throw new Error("Failed to create document");
      return res.json();
    },
    onSuccess: (doc) => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      setSelectedDocId(doc.id);
      setShowNewDoc(false);
      setNewDocTitle("");
      toast.success("Document created");
    },
    onError: () => toast.error("Failed to create document"),
  });

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="px-6 lg:px-8 py-4 border-b bg-background/80 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Documents
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Your workspace wiki, specs, and documentation
            </p>
          </div>
          {!selectedDocId && (
            <Dialog open={showNewDoc} onOpenChange={setShowNewDoc}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5">
                  <Plus className="h-4 w-4" /> New Document
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New Document</DialogTitle>
                  <DialogDescription>Create a new document in your workspace</DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <Input
                    placeholder="Document title"
                    value={newDocTitle}
                    onChange={(e) => setNewDocTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newDocTitle.trim()) {
                        createDocMutation.mutate();
                      }
                    }}
                    autoFocus
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" size="sm" onClick={() => setShowNewDoc(false)}>Cancel</Button>
                  <Button
                    size="sm"
                    onClick={() => createDocMutation.mutate()}
                    disabled={!newDocTitle.trim() || createDocMutation.isPending}
                  >
                    {createDocMutation.isPending ? "Creating..." : "Create"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="flex-1 p-6 lg:p-8 overflow-y-auto">
        {selectedDocId ? (
          <div className="max-w-4xl mx-auto">
            <DocumentEditor
              documentId={selectedDocId}
              onBack={() => setSelectedDocId(null)}
            />
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            <DocumentList onSelectDocument={setSelectedDocId} />
          </div>
        )}
      </div>
    </div>
  );
}
