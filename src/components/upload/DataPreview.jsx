import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Save, X, FileSpreadsheet } from "lucide-react";

export default function DataPreview({ data, dataType, onSave, onCancel, isSaving }) {
  const getDisplayName = () => {
    switch (dataType) {
      case 'athletes': return 'Athletes';
      case 'metrics': return 'Custom Metrics';
      case 'metric_records': return 'Metric Records';
      default: return 'Data';
    }
  };

  const getTableHeaders = () => {
    if (!data || data.length === 0) return [];
    return Object.keys(data[0]).slice(0, 6); // Show first 6 columns
  };

  return (
    <Card className="bg-gray-950 border border-gray-800">
      <CardHeader className="border-b border-gray-800">
        <CardTitle className="flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-lg flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4 text-black" />
            </div>
            Preview: {getDisplayName()}
          </div>
          <Badge className="bg-yellow-400/20 text-yellow-400 border border-yellow-400/30">
            {data?.length || 0} records
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="overflow-x-auto mb-6">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-800">
                {getTableHeaders().map((header) => (
                  <TableHead key={header} className="text-gray-300 font-semibold">
                    {header.replace(/_/g, ' ').toUpperCase()}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.slice(0, 10).map((row, index) => (
                <TableRow key={index} className="border-gray-800 hover:bg-gray-900/50">
                  {getTableHeaders().map((header) => (
                    <TableCell key={header} className="text-gray-300">
                      {row[header]?.toString() || '-'}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {data && data.length > 10 && (
          <div className="text-center text-gray-500 mb-6">
            Showing first 10 of {data.length} records
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button 
            variant="outline" 
            onClick={onCancel}
            className="border-gray-700 text-gray-300 hover:bg-gray-800"
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button 
            onClick={onSave}
            disabled={isSaving}
            className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : `Import ${data?.length || 0} Records`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}