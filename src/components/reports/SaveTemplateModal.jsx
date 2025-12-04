import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save } from "lucide-react";

export default function SaveTemplateModal({ open, onClose, onSave, reportType }) {
  const [templateName, setTemplateName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!templateName.trim()) return;
    
    setIsSaving(true);
    try {
      await onSave(templateName.trim());
      setTemplateName("");
      onClose();
    } catch (error) {
      console.error('Error saving template:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-gray-950 border border-gray-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Save className="w-5 h-5 text-green-400" />
            Save Report Template
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-gray-300">Template Name</Label>
            <Input
              placeholder="e.g., Spring Testing Report"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="bg-gray-900 border-gray-700 text-white"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && templateName.trim()) {
                  handleSave();
                }
              }}
            />
          </div>
          <p className="text-sm text-gray-400">
            This will save your selected metrics and graph configurations as a reusable template.
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            className="border-gray-700 text-gray-300"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!templateName.trim() || isSaving}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Template
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}