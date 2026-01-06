import React, { useState } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Target, Edit, BarChart3, Trash2, GripVertical, ArrowUpDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function MetricsList({ metrics, records, isLoading, onEdit, onSelect, selectedMetric, onDelete, onReorder }) {
  const [metricToDelete, setMetricToDelete] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isReorderMode, setIsReorderMode] = useState(false);

  const getMetricRecordCount = (metricId) => {
    return records.filter(r => r.metric_id === metricId).length;
  };

  const handleDeleteClick = (metric, e) => {
    e.stopPropagation();
    setMetricToDelete(metric);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (metricToDelete && onDelete) {
      await onDelete(metricToDelete.id);
      setShowDeleteDialog(false);
      setMetricToDelete(null);
    }
  };

  const categoryColors = {
    strength: "bg-red-400/20 text-red-400 border-red-400/30",
    endurance: "bg-blue-400/20 text-blue-400 border-blue-400/30",
    speed: "bg-yellow-400/20 text-yellow-400 border-yellow-400/30",
    agility: "bg-purple-400/20 text-purple-400 border-purple-400/30",
    body_composition: "bg-green-400/20 text-green-400 border-green-400/30",
    skill: "bg-orange-400/20 text-orange-400 border-orange-400/30",
    other: "bg-gray-400/20 text-gray-400 border-gray-400/30"
  };

  // Group metrics by category (case-insensitive)
  const groupedMetrics = metrics.reduce((acc, metric) => {
    const category = metric.category || 'Uncategorized';
    // Normalize category name to ensure case-insensitive grouping
    const normalizedCategory = category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
    if (!acc[normalizedCategory]) {
      acc[normalizedCategory] = [];
    }
    acc[normalizedCategory].push(metric);
    return acc;
  }, {});

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const { source, destination } = result;
    
    // If dropped in same position, do nothing
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    // Create a new array with reordered metrics
    const reorderedMetrics = Array.from(metrics);
    const [removed] = reorderedMetrics.splice(source.index, 1);
    reorderedMetrics.splice(destination.index, 0, removed);

    if (onReorder) {
      onReorder(reorderedMetrics);
    }
  };

  return (
    <>
      <Card className="bg-gray-950 border border-gray-800">
        <CardHeader className="border-b border-gray-800">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3 text-white">
              <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-lg flex items-center justify-center">
                <Target className="w-4 h-4 text-black" />
              </div>
              Defined Metrics
            </CardTitle>
            <Button
              onClick={() => setIsReorderMode(!isReorderMode)}
              variant="outline"
              className={`border-amber-400/30 font-bold ${
                isReorderMode 
                  ? 'bg-amber-400 text-black hover:bg-amber-500' 
                  : 'text-amber-400 hover:bg-gray-800'
              }`}
            >
              <ArrowUpDown className="w-4 h-4 mr-2" />
              {isReorderMode ? 'Done Reordering' : 'Reorder Metrics'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="space-y-4">
              {Array(4).fill(0).map((_, i) => (
                <Card key={i} className="bg-gray-900 border-gray-800">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-5 w-32 bg-gray-800" />
                        <Skeleton className="h-4 w-48 bg-gray-800" />
                        <Skeleton className="h-6 w-20 bg-gray-800" />
                      </div>
                      <Skeleton className="w-8 h-8 bg-gray-800" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : isReorderMode ? (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="metrics-list">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-4"
                  >
                    {metrics.map((metric, index) => (
                      <Draggable key={metric.id} draggableId={metric.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`${snapshot.isDragging ? 'opacity-50' : ''}`}
                          >
                            <Card className="bg-gray-900 border-gray-800">
                              <CardContent className="p-4">
                                <div className="flex items-start gap-3">
                                  <div
                                    {...provided.dragHandleProps}
                                    className="cursor-grab active:cursor-grabbing text-gray-500 hover:text-amber-400 pt-1"
                                  >
                                    <GripVertical className="w-5 h-5" />
                                  </div>
                                  <div className="flex-1">
                                    <h3 className="text-white font-bold text-lg mb-1">{metric.name}</h3>
                                    <div className="flex gap-2 flex-wrap">
                                      <Badge className={categoryColors[metric.category]}>
                                        {metric.category?.replace(/_/g, ' ') || 'Uncategorized'}
                                      </Badge>
                                      <Badge variant="outline" className="border-gray-600 text-gray-300">
                                        {metric.unit}
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          ) : (
            <div className="space-y-6">
              {Object.keys(groupedMetrics).sort().map((category) => (
                <div key={category}>
                  <h3 className="text-amber-400 font-black text-lg mb-3 uppercase tracking-wide">
                    {category}
                  </h3>
                  <div className="space-y-3">
                    <AnimatePresence>
                      {groupedMetrics[category].map((metric) => (
                        <motion.div
                          key={metric.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                        >
                          <Card 
                            className={`cursor-pointer transition-all duration-300 group ${
                              selectedMetric?.id === metric.id 
                                ? 'bg-gray-800 border-yellow-400' 
                                : 'bg-gray-900 border-gray-800 hover:border-gray-700'
                            }`}
                            onClick={() => onSelect && onSelect(metric)}
                          >
                            <CardContent className="p-4">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <h3 className="text-white font-bold text-lg mb-1">{metric.name}</h3>
                                  <p className="text-gray-400 text-sm mb-3">{metric.description}</p>
                                  
                                  <div className="flex gap-2 flex-wrap">
                                    <Badge variant="outline" className="border-gray-600 text-gray-300">
                                      {metric.unit}
                                    </Badge>
                                    <Badge variant="outline" className="border-gray-600 text-gray-300">
                                      <BarChart3 className="w-3 h-3 mr-1" />
                                      {getMetricRecordCount(metric.id)} records
                                    </Badge>
                                    {metric.is_mandatory && (
                                      <Badge className="bg-amber-400/20 text-amber-400 border-amber-400/30">
                                        System Default
                                      </Badge>
                                    )}
                                  </div>
                                </div>

                                <div className="flex gap-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onEdit(metric);
                                    }}
                                    className="text-gray-400 hover:text-yellow-400 hover:bg-gray-800"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => handleDeleteClick(metric, e)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-400 hover:bg-gray-800"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              ))}

              {metrics.length === 0 && (
                <div className="text-center py-12">
                  <Target className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-white font-bold text-xl mb-2">No metrics defined yet</h3>
                  <p className="text-gray-500">Create custom metrics to start tracking performance</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-gradient-to-br from-gray-950 to-gray-900 border border-red-800/50">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-400" />
              Delete Metric: {metricToDelete?.name}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300 space-y-3">
              <p className="font-semibold">
                Are you sure you want to delete this metric?
              </p>
              {metricToDelete && getMetricRecordCount(metricToDelete.id) > 0 && (
                <div className="bg-red-950/30 border border-red-800/50 rounded-lg p-4">
                  <p className="text-red-300 font-bold mb-2">⚠️ Warning:</p>
                  <p className="text-red-300">
                    This metric has <span className="font-bold">{getMetricRecordCount(metricToDelete.id)} performance records</span> associated with it. 
                  </p>
                  <p className="text-red-300 mt-2">
                    Deleting this metric will NOT delete the records, but they will no longer be associated with a valid metric.
                  </p>
                </div>
              )}
              <p className="text-gray-400 text-sm">
                This action cannot be undone.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-700 text-black bg-white hover:bg-gray-200">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white font-bold"
            >
              Delete Metric
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}