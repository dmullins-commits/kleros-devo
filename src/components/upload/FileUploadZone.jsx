import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, Zap } from "lucide-react";

export default function FileUploadZone({ onFileSelect }) {
  const fileInputRef = React.useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      onFileSelect(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      onFileSelect(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  return (
    <Card className="bg-gray-950 border border-gray-800 hover:border-gray-700 transition-all duration-300">
      <CardContent className="p-8">
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="relative border-2 border-dashed border-gray-700 rounded-xl p-12 text-center hover:border-yellow-400 transition-all duration-300 group"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileChange}
            className="hidden"
          />
          
          <div className="space-y-6">
            <div className="relative mx-auto w-20 h-20">
              <div className="w-20 h-20 bg-gradient-to-r from-gray-800 to-gray-700 rounded-full flex items-center justify-center group-hover:from-yellow-400/20 group-hover:to-yellow-500/20 transition-all duration-300">
                <FileSpreadsheet className="w-10 h-10 text-gray-400 group-hover:text-yellow-400 transition-colors duration-300" />
              </div>
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center animate-pulse">
                <Zap className="w-3 h-3 text-black" />
              </div>
            </div>
            
            <div>
              <h3 className="text-xl font-bold text-white mb-2">Upload Your Data</h3>
              <p className="text-gray-400 mb-4">
                Drag & drop your CSV or Excel files here
              </p>
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black font-bold"
              >
                <Upload className="w-4 h-4 mr-2" />
                Browse Files
              </Button>
            </div>
            
            <div className="text-xs text-gray-500 space-y-1">
              <p>Supported formats: CSV, Excel (.xlsx, .xls)</p>
              <p>Max file size: 10MB</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}