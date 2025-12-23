import React, { useEffect, useRef } from 'react';
import { Stage, Layer, Text, Transformer, Rect, Circle } from 'react-konva';
import URLImage from './URLImage';

export interface StudioLayerData {
    id: string;
    type: 'text' | 'image' | 'rect' | 'circle';
    x: number;
    y: number;
    width?: number;
    height?: number;
    rotation?: number;
    scaleX?: number;
    scaleY?: number;
    opacity?: number;

    // Text specific
    text?: string;
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: string;
    fill?: string;

    // Shape specific
    radius?: number;
    stroke?: string;
    strokeWidth?: number;

    // Image specific
    src?: string;
    asset?: any;
}

interface StudioCanvasProps {
    width: number;
    height: number;
    backgroundSrc?: string | null;
    layers: StudioLayerData[];
    setLayers: (layers: StudioLayerData[]) => void;
    selectedId: string | null;
    setSelectedId: (id: string | null) => void;
    onExportRef?: (callback: () => string) => void;
}

const StudioCanvas: React.FC<StudioCanvasProps> = ({
    width,
    height,
    backgroundSrc,
    layers,
    setLayers,
    selectedId,
    setSelectedId,
    onExportRef
}) => {
    const stageRef = useRef<any>(null);
    const trRef = useRef<any>(null);

    // Export function
    useEffect(() => {
        if (onExportRef && stageRef.current) {
            onExportRef(() => {
                // Deselect before export to hide transformer
                setSelectedId(null);

                // Better approach: Transformer visible check
                if (trRef.current) trRef.current.nodes([]);
                const data = stageRef.current.toDataURL({ pixelRatio: 2 });

                return data;
            });
        }
    }, [onExportRef, selectedId, setSelectedId]);


    // Selection Transformer Logic
    useEffect(() => {
        if (selectedId && trRef.current && stageRef.current) {
            const node = stageRef.current.findOne('#' + selectedId);
            if (node) {
                trRef.current.nodes([node]);
                trRef.current.getLayer().batchDraw();
            }
        } else if (trRef.current) {
            trRef.current.nodes([]);
            trRef.current.getLayer().batchDraw();
        }
    }, [selectedId, layers]);

    const handleDragEnd = (e: any, id: string) => {
        const node = e.target;
        const newLayers = layers.map((layer) => {
            if (layer.id === id) {
                return {
                    ...layer,
                    x: node.x(),
                    y: node.y(),
                    rotation: node.rotation(),
                };
            }
            return layer;
        });
        setLayers(newLayers);
    };

    const handleTransformEnd = (e: any, id: string) => {
        const node = e.target;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();

        const newLayers = layers.map((layer) => {
            if (layer.id === id) {
                return {
                    ...layer,
                    x: node.x(),
                    y: node.y(),
                    rotation: node.rotation(),
                    scaleX: scaleX,
                    scaleY: scaleY,
                };
            }
            return layer;
        });
        setLayers(newLayers);
    };

    return (
        <div className="bg-neutral-800 shadow-xl overflow-hidden flex items-center justify-center">
            <Stage
                width={width}
                height={height}
                ref={stageRef}
                onMouseDown={(e) => {
                    // Deselect on empty click
                    const clickedOnEmpty = e.target === e.target.getStage();
                    if (clickedOnEmpty) {
                        setSelectedId(null);
                    }
                }}
                onTouchStart={(e) => {
                    const clickedOnEmpty = e.target === e.target.getStage();
                    if (clickedOnEmpty) {
                        setSelectedId(null);
                    }
                }}
            >
                <Layer>
                    {/* Background Image */}
                    {backgroundSrc && (
                        <URLImage
                            src={backgroundSrc}
                            x={0}
                            y={0}
                            width={width}
                            height={height}
                            listening={false}
                        />
                    )}

                    {layers.map((layer) => {

                        if (layer.type === 'text') {
                            return (
                                <Text
                                    key={layer.id}
                                    id={layer.id}
                                    text={layer.text}
                                    x={layer.x}
                                    y={layer.y}
                                    fontSize={layer.fontSize || 20}
                                    fontFamily={layer.fontFamily || 'Arial'}
                                    fontStyle={layer.fontWeight || 'normal'}
                                    fill={layer.fill || 'black'}
                                    opacity={layer.opacity ?? 1}
                                    draggable
                                    rotation={layer.rotation || 0}
                                    scaleX={layer.scaleX || 1}
                                    scaleY={layer.scaleY || 1}
                                    onClick={() => setSelectedId(layer.id)}
                                    onTap={() => setSelectedId(layer.id)}
                                    onDragEnd={(e) => handleDragEnd(e, layer.id)}
                                    onTransformEnd={(e) => handleTransformEnd(e, layer.id)}
                                />
                            );
                        } else if (layer.type === 'image') {
                            return (
                                <URLImage
                                    key={layer.id}
                                    id={layer.id}
                                    src={layer.src || ''}
                                    x={layer.x}
                                    y={layer.y}
                                    width={layer.width}
                                    height={layer.height}
                                    opacity={layer.opacity ?? 1}
                                    draggable
                                    rotation={layer.rotation || 0}
                                    scaleX={layer.scaleX || 1}
                                    scaleY={layer.scaleY || 1}
                                    onClick={() => setSelectedId(layer.id)}
                                    onTap={() => setSelectedId(layer.id)}
                                    onDragEnd={(e) => handleDragEnd(e, layer.id)}
                                    onTransformEnd={(e) => handleTransformEnd(e, layer.id)}
                                />
                            );
                        } else if (layer.type === 'rect') {
                            return (
                                <Rect
                                    key={layer.id}
                                    id={layer.id}
                                    x={layer.x}
                                    y={layer.y}
                                    width={layer.width || 100}
                                    height={layer.height || 100}
                                    fill={layer.fill || '#888888'}
                                    stroke={layer.stroke}
                                    strokeWidth={layer.strokeWidth}
                                    opacity={layer.opacity ?? 1}
                                    draggable
                                    rotation={layer.rotation || 0}
                                    scaleX={layer.scaleX || 1}
                                    scaleY={layer.scaleY || 1}
                                    onClick={() => setSelectedId(layer.id)}
                                    onTap={() => setSelectedId(layer.id)}
                                    onDragEnd={(e) => handleDragEnd(e, layer.id)}
                                    onTransformEnd={(e) => handleTransformEnd(e, layer.id)}
                                />
                            );
                        } else if (layer.type === 'circle') {
                            return (
                                <Circle
                                    key={layer.id}
                                    id={layer.id}
                                    x={layer.x}
                                    y={layer.y}
                                    radius={layer.radius || 50}
                                    fill={layer.fill || '#888888'}
                                    stroke={layer.stroke}
                                    strokeWidth={layer.strokeWidth}
                                    opacity={layer.opacity ?? 1}
                                    draggable
                                    rotation={layer.rotation || 0}
                                    scaleX={layer.scaleX || 1}
                                    scaleY={layer.scaleY || 1}
                                    onClick={() => setSelectedId(layer.id)}
                                    onTap={() => setSelectedId(layer.id)}
                                    onDragEnd={(e) => handleDragEnd(e, layer.id)}
                                    onTransformEnd={(e) => handleTransformEnd(e, layer.id)}
                                />
                            );
                        }
                        return null;
                    })}

                    <Transformer
                        ref={trRef}
                        boundBoxFunc={(oldBox, newBox) => {
                            if (newBox.width < 5 || newBox.height < 5) {
                                return oldBox;
                            }
                            return newBox;
                        }}
                    />
                </Layer>
            </Stage>
        </div>
    );
};

export default StudioCanvas;
