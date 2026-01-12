import React, { useState } from 'react';
import { Info } from 'lucide-react';

interface InfoTooltipProps {
    text: string;
}

const InfoTooltip: React.FC<InfoTooltipProps> = ({ text }) => {
    const [isVisible, setIsVisible] = useState(false);

    return (
        <div
            className="relative inline-flex items-center ml-1 group"
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
        >
            <Info
                size={14}
                className="text-gray-400 hover:text-brand-primary cursor-help transition-colors"
            />

            {isVisible && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg shadow-xl w-64 z-50 pointer-events-none animate-in fade-in zoom-in duration-200">
                    {text}
                    {/* Arrow */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-gray-800"></div>
                </div>
            )}
        </div>
    );
};

export default InfoTooltip;
