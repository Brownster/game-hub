import React from "react";

export default function TableSurface({ children, className = "" }) {
  return (
    <div className={`table-surface ${className}`}>
      {children}
    </div>
  );
}
