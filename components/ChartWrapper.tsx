"use client";

import { Chart } from "primereact/chart";
import { useEffect, useState } from "react";

interface ChartWrapperProps {
  type: string;
  data: any;
  options: any;
  style?: React.CSSProperties;
  className?: string;
}

export default function ChartWrapper({ type, data, options, style, className }: ChartWrapperProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div 
        className={`flex align-items-center justify-content-center ${className || ''}`} 
        style={style}
      >
        <div className="text-600">Loading chart...</div>
      </div>
    );
  }

  return (
    <Chart 
      type={type} 
      data={data} 
      options={options} 
      style={style} 
      className={className}
    />
  );
}
