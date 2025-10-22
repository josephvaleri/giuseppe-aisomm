"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { deleteTastingNote } from "../_actions";
import { useRouter } from "next/navigation";

interface DeleteButtonProps {
  noteId: number;
  noteTitle: string;
}

export function DeleteButton({ noteId, noteTitle }: DeleteButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${noteTitle}"? This action cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteTastingNote(noteId);
      router.refresh();
    } catch (error) {
      console.error("Error deleting tasting note:", error);
      alert("Failed to delete tasting note. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleDelete}
      disabled={isDeleting}
      className="text-red-600 hover:text-red-700 hover:bg-red-50"
    >
      <Trash2 className="w-4 h-4" />
      {isDeleting && <span className="ml-1">Deleting...</span>}
    </Button>
  );
}
