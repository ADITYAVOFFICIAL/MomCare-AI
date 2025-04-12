// src/components/dashboard/MedCharts.tsx
import React, { useState, useCallback } from 'react'; // Added useState, useCallback
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// Removed Progress import as it's not used here
import { Loader2, Trash2 } from 'lucide-react'; // Added Trash2
import { format } from 'date-fns';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
    HeartPulse, Droplet, Scale, BarChart3, List,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast'; // Added useToast

// Assuming these types are defined in '@/lib/appwrite' or a shared types file
import type { BloodPressureReading, BloodSugarReading, WeightReading } from '@/lib/appwrite';

// --- ASSUMPTION: Import delete functions from appwrite ---
import {
    deleteBloodPressureReading,
    deleteBloodSugarReading,
    deleteWeightReading,
    // Make sure these exist and are exported from '@/lib/appwrite'
} from '@/lib/appwrite';

// --- Helper component for displaying health readings in a list ---
interface ReadingListItemProps {
    reading: any; // Use specific types if possible
    type: 'bp' | 'sugar' | 'weight';
    onDelete: (id: string, type: 'bp' | 'sugar' | 'weight') => void; // Callback for delete
    isDeleting: boolean; // To show loading/disable button
}

const ReadingListItem: React.FC<ReadingListItemProps> = ({ reading, type, onDelete, isDeleting }) => {
    // Use recordedAt if available, otherwise fallback to $createdAt
    const dateToFormat = reading.recordedAt ? new Date(reading.recordedAt) : new Date(reading.$createdAt);
    let formattedDate = "Invalid Date";
    if (!isNaN(dateToFormat.getTime())) {
        formattedDate = format(dateToFormat, 'MMM d, HH:mm'); // Shortened format for list
    }

    let value = '';
    let unit = '';

    try {
        if (type === 'bp' && reading.systolic !== undefined && reading.diastolic !== undefined) {
            value = `${reading.systolic}/${reading.diastolic}`;
            unit = 'mmHg';
        } else if (type === 'sugar' && reading.level !== undefined) {
            value = `${reading.level}`;
            unit = `mg/dL ${reading.measurementType ? `(${reading.measurementType})` : ''}`.trim();
        } else if (type === 'weight' && reading.weight !== undefined) {
            value = `${reading.weight}`;
            unit = reading.unit || ''; // Show unit if available
        } else {
            value = 'N/A'; // Indicate missing data clearly
        }
    } catch (error) {
        console.error("Error formatting reading item:", error, reading);
        value = 'Error';
    }

    const handleDeleteClick = () => {
        if (reading?.$id && !isDeleting) {
            onDelete(reading.$id, type);
        } else if (!reading?.$id) {
            console.error("Cannot delete reading: Missing $id", reading);
        }
    };

    return (
        <div className="flex justify-between items-center py-1.5 border-b last:border-b-0 text-xs group"> {/* Added group */}
            <div className="flex-grow mr-2"> {/* Wrap text */}
                <span className="text-gray-500 block">{formattedDate}</span> {/* Make date block */}
                <span className="font-medium text-gray-700">{value} {unit}</span>
            </div>
            <button
                onClick={handleDeleteClick}
                disabled={isDeleting}
                className={`p-1 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 disabled:opacity-50 disabled:cursor-not-allowed ${isDeleting ? 'opacity-100' : ''}`} // Show on hover/focus or if deleting
                aria-label={`Delete ${type} reading from ${formattedDate}`}
                title="Delete this reading"
            >
                {isDeleting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                )}
            </button>
        </div>
    );
};


// --- Helper component for health charts ---
// (Keep HealthChart component as it was)
interface HealthChartProps {
    data: any[];
    dataKey: string | string[];
    unit?: string;
    name: string | string[];
    color: string | string[];
    height?: number; // Allow custom height
}

const HealthChart: React.FC<HealthChartProps> = ({ data, dataKey, unit, name, color, height = 200 }) => {
    // Ensure data is sorted chronologically and formatted for the chart
    const formattedData = data
        .map(d => {
            const timestamp = new Date(d.recordedAt || d.$createdAt).getTime();
            return { ...d, timestamp };
        })
        .filter(d => !isNaN(d.timestamp)) // Filter out invalid dates
        .sort((a, b) => a.timestamp - b.timestamp) // Sort by timestamp ascending
        .map(d => ({ ...d, recordedAtLabel: format(new Date(d.timestamp), 'MMM d') })); // Format date for XAxis label

    if (!formattedData || formattedData.length === 0) {
        return <p className="text-xs text-gray-400 text-center py-8">No chart data available.</p>;
    }

    // Determine Y-axis domain dynamically to prevent squeezing
    const allValues = formattedData.flatMap(item =>
        Array.isArray(dataKey) ? dataKey.map(key => item[key]) : [item[dataKey]]
    ).filter((val): val is number => typeof val === 'number' && !isNaN(val)); // Type guard

    const minY = allValues.length > 0 ? Math.min(...allValues) : 0;
    const maxY = allValues.length > 0 ? Math.max(...allValues) : 100; // Default max if no data
    const padding = (maxY - minY) * 0.15 || 5; // Add 15% padding or a minimum padding

    return (
        <ResponsiveContainer width="100%" height={height}>
            <LineChart data={formattedData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}> {/* Adjust margins */}
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" /> {/* Lighter grid */}
                <XAxis
                    dataKey="recordedAtLabel"
                    fontSize={9}
                    tick={{ fill: '#6b7280' }}
                    interval="preserveStartEnd"
                    padding={{ left: 10, right: 10 }} // Add padding to XAxis
                    dy={5} // Move labels down slightly
                />
                <YAxis
                    fontSize={9}
                    tick={{ fill: '#6b7280' }}
                    domain={[Math.max(0, Math.floor(minY - padding)), Math.ceil(maxY + padding)]} // Dynamic domain, floor/ceil for cleaner ticks
                    unit={unit ? ` ${unit}` : ''}
                    allowDecimals={false} // Usually whole numbers are fine for these metrics
                    width={35} // Adjust width
                    dx={-2} // Move labels left slightly
                />
                <Tooltip
                    contentStyle={{ fontSize: '11px', padding: '4px 8px', borderRadius: '6px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb', background: 'rgba(255, 255, 255, 0.95)' }}
                    labelFormatter={(label, payload) => {
                         // Find the original data point to get the full date/time
                         if (payload && payload.length > 0) {
                             const point = formattedData.find(d => d.recordedAtLabel === label && d[payload[0].dataKey as string] === payload[0].value);
                             return point ? format(new Date(point.timestamp), 'MMM d, yyyy HH:mm') : label;
                         }
                         return label;
                    }}
                    formatter={(value: number, name: string, props) => [`${value}${unit ? ` ${unit}` : ''}`, name]} // Add unit to tooltip value
                    itemStyle={{ padding: '2px 0' }}
                    wrapperClassName="text-xs"
                />
                <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} height={30} />
                {Array.isArray(dataKey) ? (
                    dataKey.map((key, index) => (
                        <Line
                            key={key}
                            type="monotone"
                            dataKey={key}
                            name={Array.isArray(name) ? name[index] : name}
                            stroke={Array.isArray(color) ? color[index] : color}
                            strokeWidth={1.5} // Slightly thinner line
                            dot={{ r: 2, fill: Array.isArray(color) ? color[index] : color, strokeWidth: 0 }}
                            activeDot={{ r: 4, strokeWidth: 1, stroke: '#ffffff' }}
                            connectNulls={false} // Don't connect lines across missing data points
                        />
                    ))
                ) : (
                    <Line
                        type="monotone"
                        dataKey={dataKey}
                        name={Array.isArray(name) ? name[0] : name}
                        stroke={Array.isArray(color) ? color[0] : color}
                        strokeWidth={1.5}
                        dot={{ r: 2, fill: Array.isArray(color) ? color[0] : color, strokeWidth: 0 }}
                        activeDot={{ r: 4, strokeWidth: 1, stroke: '#ffffff' }}
                        connectNulls={false}
                    />
                )}
            </LineChart>
        </ResponsiveContainer>
    );
};


// --- Main MedCharts Component ---
interface MedChartsProps {
    bpReadings: BloodPressureReading[];
    sugarReadings: BloodSugarReading[];
    weightReadings: WeightReading[];
    isLoading: boolean;
    onDataRefreshNeeded: () => void; // Callback to signal parent to refresh data
}

const MedCharts: React.FC<MedChartsProps> = ({
    bpReadings,
    sugarReadings,
    weightReadings,
    isLoading,
    onDataRefreshNeeded // Receive the callback
}) => {
    const { toast } = useToast();
    const [deletingReadingId, setDeletingReadingId] = useState<string | null>(null);

    // --- Deletion Handler ---
    const handleDeleteReading = useCallback(async (id: string, type: 'bp' | 'sugar' | 'weight') => {
        if (deletingReadingId) return; // Prevent concurrent deletions
        setDeletingReadingId(id);

        try {
            let deletePromise;
            switch (type) {
                case 'bp':
                    deletePromise = deleteBloodPressureReading(id);
                    break;
                case 'sugar':
                    deletePromise = deleteBloodSugarReading(id);
                    break;
                case 'weight':
                    deletePromise = deleteWeightReading(id);
                    break;
                default:
                    // Should not happen with type safety, but good practice
                    throw new Error("Invalid reading type for deletion");
            }

            await deletePromise;

            toast({
                title: "Reading Deleted",
                description: `Successfully removed the ${type.toUpperCase()} reading.`,
                variant: "default",
            });

            // --- Refresh Data ---
            // Notify the parent component (DashboardPage) to refetch all data
            onDataRefreshNeeded();

        } catch (error: any) {
            console.error(`Error deleting ${type} reading with ID ${id}:`, error);
            toast({
                title: "Deletion Failed",
                description: error.message || `Could not delete the ${type} reading.`,
                variant: "destructive",
            });
        } finally {
            setDeletingReadingId(null); // Reset loading state
        }
    }, [deletingReadingId, toast, onDataRefreshNeeded]); // Add dependencies


    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-16 bg-gray-50 rounded-lg border">
                <Loader2 className="h-8 w-8 text-momcare-accent animate-spin mr-3" />
                <span className="text-gray-600">Loading health data...</span>
            </div>
        );
    }

    // Sort readings descending by date for the list view (most recent first)
    const sortDesc = (a: any, b: any) => new Date(b.recordedAt || b.$createdAt).getTime() - new Date(a.recordedAt || a.$createdAt).getTime();
    const sortedBp = [...bpReadings].sort(sortDesc);
    const sortedSugar = [...sugarReadings].sort(sortDesc);
    const sortedWeight = [...weightReadings].sort(sortDesc);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            {/* Blood Pressure Card */}
            <Card className="border border-red-200 shadow-sm bg-white overflow-hidden flex flex-col">
                <CardHeader className="p-3 bg-red-50/50 border-b border-red-200">
                    <CardTitle className="flex items-center text-red-600 text-base font-semibold">
                        <HeartPulse className="mr-2 h-5 w-5" />Blood Pressure
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4 flex-grow flex flex-col space-y-4">
                    <div className="flex-grow">
                        <h4 className="text-xs font-medium mb-1 text-gray-500 flex items-center"><BarChart3 className="mr-1 h-3 w-3" />Trend (mmHg)</h4>
                        {bpReadings.length > 0 ? (
                            <HealthChart
                                data={bpReadings} // Chart uses original order (sorted ascending internally)
                                dataKey={["systolic", "diastolic"]}
                                unit="mmHg"
                                name={["Systolic", "Diastolic"]}
                                color={["#ef4444", "#f97316"]} // Red and Orange
                            />
                        ) : (
                             <p className="text-xs text-gray-400 text-center py-8">No chart data available.</p>
                        )}
                    </div>
                    <div className="border-t pt-3">
                        <h4 className="text-xs font-medium mb-2 text-gray-500 flex items-center"><List className="mr-1 h-3 w-3" />Recent Readings</h4>
                        <div className="max-h-32 overflow-y-auto pr-1 space-y-0.5">
                            {sortedBp.length > 0 ? (
                                sortedBp.slice(0, 5).map(r => (
                                    <ReadingListItem
                                        key={r.$id}
                                        reading={r}
                                        type="bp"
                                        onDelete={handleDeleteReading} // Pass handler
                                        isDeleting={deletingReadingId === r.$id} // Pass loading state
                                    />
                                ))
                            ) : (
                                <p className="text-xs text-gray-400 italic text-center py-2">No readings recorded.</p>
                            )}
                            {sortedBp.length > 5 && <p className="text-xs text-center text-gray-400 pt-1">...</p>}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Blood Sugar Card */}
            <Card className="border border-blue-200 shadow-sm bg-white overflow-hidden flex flex-col">
                <CardHeader className="p-3 bg-blue-50/50 border-b border-blue-200">
                    <CardTitle className="flex items-center text-blue-600 text-base font-semibold">
                        <Droplet className="mr-2 h-5 w-5" />Blood Sugar
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4 flex-grow flex flex-col space-y-4">
                     <div className="flex-grow">
                        <h4 className="text-xs font-medium mb-1 text-gray-500 flex items-center"><BarChart3 className="mr-1 h-3 w-3" />Trend (mg/dL)</h4>
                        {sugarReadings.length > 0 ? (
                            <HealthChart
                                data={sugarReadings}
                                dataKey="level"
                                unit="mg/dL"
                                name="Sugar Level"
                                color="#3b82f6" // Blue
                            />
                         ) : (
                             <p className="text-xs text-gray-400 text-center py-8">No chart data available.</p>
                        )}
                    </div>
                    <div className="border-t pt-3">
                        <h4 className="text-xs font-medium mb-2 text-gray-500 flex items-center"><List className="mr-1 h-3 w-3" />Recent Readings</h4>
                        <div className="max-h-32 overflow-y-auto pr-1 space-y-0.5">
                            {sortedSugar.length > 0 ? (
                                sortedSugar.slice(0, 5).map(r => (
                                    <ReadingListItem
                                        key={r.$id}
                                        reading={r}
                                        type="sugar"
                                        onDelete={handleDeleteReading} // Pass handler
                                        isDeleting={deletingReadingId === r.$id} // Pass loading state
                                    />
                                ))
                            ) : (
                                <p className="text-xs text-gray-400 italic text-center py-2">No readings recorded.</p>
                            )}
                            {sortedSugar.length > 5 && <p className="text-xs text-center text-gray-400 pt-1">...</p>}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Weight Card */}
            <Card className="border border-green-200 shadow-sm bg-white overflow-hidden flex flex-col">
                <CardHeader className="p-3 bg-green-50/50 border-b border-green-200">
                    <CardTitle className="flex items-center text-green-600 text-base font-semibold">
                        <Scale className="mr-2 h-5 w-5" />Weight
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4 flex-grow flex flex-col space-y-4">
                     <div className="flex-grow">
                        <h4 className="text-xs font-medium mb-1 text-gray-500 flex items-center"><BarChart3 className="mr-1 h-3 w-3" />Trend ({weightReadings[0]?.unit || 'N/A'})</h4>
                        {weightReadings.length > 0 ? (
                            <HealthChart
                                data={weightReadings} // Ideally filter/convert to one unit first
                                dataKey="weight"
                                unit={weightReadings[0]?.unit} // Show unit of first entry (could be mixed)
                                name="Weight"
                                color="#16a34a" // Green
                            />
                         ) : (
                             <p className="text-xs text-gray-400 text-center py-8">No chart data available.</p>
                        )}
                    </div>
                    <div className="border-t pt-3">
                        <h4 className="text-xs font-medium mb-2 text-gray-500 flex items-center"><List className="mr-1 h-3 w-3" />Recent Readings</h4>
                        <div className="max-h-32 overflow-y-auto pr-1 space-y-0.5">
                            {sortedWeight.length > 0 ? (
                                sortedWeight.slice(0, 5).map(r => (
                                    <ReadingListItem
                                        key={r.$id}
                                        reading={r}
                                        type="weight"
                                        onDelete={handleDeleteReading} // Pass handler
                                        isDeleting={deletingReadingId === r.$id} // Pass loading state
                                    />
                                ))
                            ) : (
                                <p className="text-xs text-gray-400 italic text-center py-2">No readings recorded.</p>
                            )}
                            {sortedWeight.length > 5 && <p className="text-xs text-center text-gray-400 pt-1">...</p>}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default MedCharts;