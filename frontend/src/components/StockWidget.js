import React, { useEffect, useRef } from "react";
import api from "../api";

const StockWidget = ({ symbol = "BIST:THYAO" }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    containerRef.current.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbol: symbol,
      width: "100%",
      height: "220",
      locale: "tr",
      dateRange: "12M",
      colorTheme: "light",
      isTransparent: false,
      autosize: true,
    });

    containerRef.current.appendChild(script);
  }, [symbol]); // her değişimde yeniden yüklenir

  return (
    <div ref={containerRef} className="tradingview-widget-container">
      <div className="tradingview-widget-container__widget" />
    </div>
  );
};

export default StockWidget;
