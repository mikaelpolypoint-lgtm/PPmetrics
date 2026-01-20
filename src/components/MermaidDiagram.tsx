import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

interface MermaidDiagramProps {
    chart: string;
}

const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ chart }) => {
    const mermaidRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        mermaid.initialize({
            startOnLoad: true,
            theme: 'default',
            securityLevel: 'loose',
            fontFamily: 'inherit'
        });

        const renderChart = async () => {
            if (mermaidRef.current) {
                try {
                    mermaidRef.current.innerHTML = '';
                    const { svg } = await mermaid.render(`mermaid-${Math.random().toString(36).substr(2, 9)}`, chart);
                    if (mermaidRef.current) {
                        mermaidRef.current.innerHTML = svg;
                    }
                } catch (error) {
                    console.error('Mermaid render error:', error);
                    if (mermaidRef.current) {
                        mermaidRef.current.innerHTML = 'Error rendering diagram';
                    }
                }
            }
        };

        renderChart();
    }, [chart]);

    return (
        <div className="mermaid-container overflow-x-auto p-4 bg-white rounded-lg border border-gray-100 shadow-sm flex justify-center">
            <div ref={mermaidRef} className="w-full" />
        </div>
    );
};

export default MermaidDiagram;
