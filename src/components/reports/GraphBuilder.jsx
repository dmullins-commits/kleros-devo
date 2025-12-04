import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, TrendingUp } from "lucide-react";
import { MetricCategory } from "@/entities/all";

export default function GraphBuilder({ metrics, selectedMetricIds, onToggleMetric, onAddGraph, canAddMore }) {
  const [categories, setCategories] = React.useState([]);

  React.useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const categoriesData = await MetricCategory.list();
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const getCategoryColor = (categoryName) => {
    const category = categories.find(c => c.name === categoryName);
    return category?.color || '#6b7280';
  };

  const availableMetrics = metrics.filter(m => !m.is_auto_calculated);
  
  return (
    <Card className="bg-gray-950 border border-gray-800">
      <CardHeader className="border-b border-gray-800">
        <CardTitle className="text-white flex items-center gap-3">
          <TrendingUp className="w-5 h-5 text-purple-400" />
          Select Metrics for This Graph
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="space-y-6 max-h-96 overflow-y-auto">
          {[...new Set(availableMetrics.map(m => m.category))].sort().map(categoryName => {
            const categoryMetrics = availableMetrics.filter(m => m.category === categoryName);
            const categoryColor = getCategoryColor(categoryName);
            
            return (
              <div key={categoryName}>
                <h3 className="text-white font-bold text-lg mb-3 flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: categoryColor }}
                  />
                  {categoryName}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {categoryMetrics.map(metric => {
                    return (
                      <div
                        key={metric.id}
                        className="flex items-center space-x-3 p-3 rounded-lg hover:opacity-90 transition-opacity"
                        style={{ 
                          backgroundColor: categoryColor,
                          border: `2px solid ${categoryColor}`
                        }}
                      >
                        <Checkbox
                          id={metric.id}
                          checked={selectedMetricIds.includes(metric.id)}
                          onCheckedChange={() => onToggleMetric(metric.id)}
                          className="border-black data-[state=checked]:bg-black data-[state=checked]:border-black data-[state=checked]:text-white"
                        />
                        <label htmlFor={metric.id} className="text-black font-semibold cursor-pointer flex-1">
                          <div>{metric.name}</div>
                          <div className="text-xs text-gray-900">{metric.unit}</div>
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
          <Button
            onClick={onAddGraph}
            disabled={selectedMetricIds.length === 0 || !canAddMore}
            className="bg-purple-500 hover:bg-purple-600 text-white font-bold"
          >
            <Plus className="w-4 h-4 mr-2" />
            {canAddMore ? "Add This Graph" : "Maximum 5 Graphs"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}