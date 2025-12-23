import React from 'react';
import StudioLayout from '../components/Studio/StudioLayout';
// Just a simple wrapper

export const StudioPage: React.FC = () => {
    return (
        <div className="h-full p-6">
            <h1 className="text-2xl font-bold mb-4">Photo Studio</h1>
            <StudioLayout onExport={(blob) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'design.png';
                a.click();
            }} />
        </div>
    );
};
