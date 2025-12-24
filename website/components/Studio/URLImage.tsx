import React from 'react';
import { Image as KonvaImage } from 'react-konva';
import useImage from 'use-image';

interface URLImageProps {
    src: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    rotation?: number;
    opacity?: number;
    draggable?: boolean;
    id?: string;
    onClick?: () => void;
    onTap?: () => void;
    onDragStart?: (e: any) => void;
    onDragEnd?: (e: any) => void;
    onTransformEnd?: (e: any) => void;
    isSelected?: boolean;
    forwardRef?: any;
    [key: string]: any;
}

const URLImage = ({ src, onTransformEnd, forwardRef, ...props }: URLImageProps) => {
    const [image] = useImage(src, 'anonymous'); // 'anonymous' for CORS if needed

    return (
        <KonvaImage
            image={image}
            ref={forwardRef}
            {...props}
            onTransformEnd={(e) => {
                if (onTransformEnd) onTransformEnd(e);
            }}
        />
    );
};

export default URLImage;
