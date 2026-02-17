import React from 'react';

interface TableLoaderProps {
  message?: string;
}

export default function TableLoader({ message = "Loading..." }: TableLoaderProps) {
  return (
    <>
      <style jsx global>{`
        @keyframes tableLoaderSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .table-loader-container {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 300px;
          position: relative;
          background: transparent;
        }
        .table-loader-spinner {
          position: relative;
          width: 60px;
          height: 60px;
          margin: 0 auto 16px;
        }
        .table-loader-outer {
          position: absolute;
          width: 60px;
          height: 60px;
          border: 4px solid #e0e0e0;
          border-top: 4px solid #000000;
          border-radius: 50%;
          animation: tableLoaderSpin 1s linear infinite;
        }
        .table-loader-inner {
          position: absolute;
          top: 8px;
          left: 8px;
          width: 44px;
          height: 44px;
          border: 3px solid #f0f0f0;
          border-right: 3px solid #8b5cf6;
          border-radius: 50%;
          animation: tableLoaderSpin 0.8s linear infinite reverse;
        }
        .table-loader-dot {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 12px;
          height: 12px;
          background-color: #000000;
          border-radius: 50%;
        }
        .table-loader-text {
          color: #6b7280;
          font-size: 14px;
          margin: 0;
          font-weight: 500;
          text-align: center;
        }
      `}</style>
      <div className="table-loader-container">
        <div className="text-center">
          <div className="table-loader-spinner">
            <div className="table-loader-outer" />
            <div className="table-loader-inner" />
            <div className="table-loader-dot" />
          </div>
          <p className="table-loader-text">
            {message}
          </p>
        </div>
      </div>
    </>
  );
}

