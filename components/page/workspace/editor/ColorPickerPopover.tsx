'use client'

import { HexColorPicker } from "react-colorful";
import { memo } from "react";

interface ColorPickerPopoverProps {
    color: string;
    onChange: (color: string) => void;
    position: { top: number; left: number };
    onClose: () => void;
}

function ColorPickerPopover({ color, onChange, position, onClose }: ColorPickerPopoverProps) {
    return (
        <>
            {/* Backdrop for closing */}
            <div 
                className="fixed inset-0 z-[90] cursor-default" 
                onClick={onClose}
            />
            
            {/* Popover */}
            <div 
                className="fixed z-[100] bg-gray-900 border border-purple-500/30 rounded-lg shadow-xl p-3 flex flex-col gap-3"
                style={{ top: position.top, left: position.left }}
            >
                <HexColorPicker color={color} onChange={onChange} />
                
                <div className="flex items-center space-x-2 bg-gray-800/50 rounded-lg px-2 py-1 border border-purple-500/20">
                    <span className="text-gray-400 text-sm">#</span>
                    <input
                        type="text"
                        value={color.replace('#', '')}
                        onChange={(e) => {
                            const val = e.target.value;
                            if (/^[0-9A-Fa-f]*$/.test(val)) {
                                onChange('#' + val);
                            }
                        }}
                        maxLength={6}
                        className="w-full bg-transparent text-white text-sm focus:outline-none uppercase font-mono"
                    />
                </div>
            </div>
        </>
    );
}

export default memo(ColorPickerPopover);
